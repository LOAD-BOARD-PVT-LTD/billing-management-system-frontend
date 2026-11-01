import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { dedupeVehicleBlacklistRecords } from '@/features/vehicle/blacklist/utils/dedupe-vehicle-blacklist';
import type { VehicleBlacklistRecord } from '@/features/vehicle/blacklist';

function record(overrides: Partial<VehicleBlacklistRecord> = {}): VehicleBlacklistRecord {
  return {
    id: 'resource-1',
    vehicleId: 'tqms-1',
    vehicleNumber: 'State-3-G-AA-0101',
    vehicleType: 'Truck',
    ownerName: 'Owner',
    phone: '9800000000',
    branch: 'Loadboard sthaniya',
    performedBy: null,
    isBlacklisted: true,
    blacklistedReason: 'Test',
    blacklistedAt: '2026-10-30T10:00:00.000Z',
    blacklistSource: 'tqms',
    tags: [],
    ...overrides,
  };
}

describe('Vehicle blacklist deduplication', () => {
  test('keeps one record when resource rows share a TQMS vehicle ID', () => {
    const records = [
      record({ id: 'resource-1', vehicleNumber: 'State-3-G-AA-0101' }),
      record({ id: 'resource-2', vehicleNumber: 'Different format' }),
    ];

    assert.deepEqual(dedupeVehicleBlacklistRecords(records), [records[0]]);
  });

  test('keeps one record when vehicle numbers match but TQMS IDs differ', () => {
    const records = [
      record({ vehicleId: 'tqms-1', vehicleNumber: 'State-3-G-AA-0101' }),
      record({ id: 'resource-2', vehicleId: 'tqms-2', vehicleNumber: ' state 3 g aa 0101 ' }),
    ];

    assert.deepEqual(dedupeVehicleBlacklistRecords(records), [records[0]]);
  });

  test('keeps the most recently blacklisted record for actions and details', () => {
    const earlier = record({ id: 'resource-1', blacklistedAt: '2026-10-29T10:00:00.000Z' });
    const latest = record({
      id: 'resource-2',
      blacklistedAt: '2026-10-30T10:00:00.000Z',
      blacklistedReason: 'Latest reason',
    });

    assert.deepEqual(dedupeVehicleBlacklistRecords([earlier, latest]), [latest]);
  });

  test('does not merge records when neither TQMS ID nor vehicle number matches', () => {
    const records = [
      record({ vehicleId: 'tqms-1', vehicleNumber: 'State-3-G-AA-0101' }),
      record({ id: 'resource-2', vehicleId: 'tqms-2', vehicleNumber: 'State-3-G-AA-0202' }),
    ];

    assert.deepEqual(dedupeVehicleBlacklistRecords(records), records);
  });
});
