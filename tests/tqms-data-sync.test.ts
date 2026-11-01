import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseTqmsDataSyncResult } from '@/features/settings/utils/tqms-data-sync';
import { t } from '@/utils/translations';

test('TQMS sync response reads metrics and skipped vehicle details from nested data', () => {
  const result = parseTqmsDataSyncResult({
    data: {
      status: 'COMPLETED',
      found: 18,
      synced: 16,
      skipped: [
        {
          vehicleId: 42,
          ownerName: 'Vehicle owner',
          phone: '9840000000',
          reason: 'Missing registration status',
        },
        { vehicleId: 43, reason: 'Invalid owner' },
      ],
      lastSuccessfulAt: '2026-10-31T12:00:00Z',
      registryRows: 16,
      documentRows: 11,
    },
  });

  assert.equal(result.status, 'COMPLETED');
  assert.equal(result.foundCount, 18);
  assert.equal(result.syncedCount, 16);
  assert.equal(result.skippedCount, 2);
  assert.equal(result.registryRows, 16);
  assert.equal(result.documentRows, 11);
  assert.equal(result.lastSuccessfulAt, '2026-10-31T12:00:00Z');
  assert.equal(result.skippedRecords[0].vehicleId, '42');
  assert.equal(result.skippedRecords[0].owner, 'Vehicle owner');
  assert.equal(result.skippedRecords[0].reason, 'Missing registration status');
});

test('TQMS sync response preserves explicit zero counts and tolerates missing details', () => {
  const result = parseTqmsDataSyncResult({
    result: { status: 'UP_TO_DATE', foundCount: '0', syncedCount: 0, skippedCount: 0 },
  });

  assert.equal(result.status, 'UP_TO_DATE');
  assert.equal(result.foundCount, 0);
  assert.equal(result.syncedCount, 0);
  assert.equal(result.skippedCount, 0);
  assert.deepEqual(result.skippedRecords, []);
});

test('TQMS sync labels resolve from the billing Nepali translation namespace', () => {
  const keys = [
    'Title',
    'Description',
    'Refresh',
    'Running',
    'Success',
    'Failed',
    'NotStarted',
    'Completed',
    'UnknownStatus',
    'VehiclesLoadFailed',
    'AlreadyRunning',
    'SkippedCount',
    'SkippedDetails',
    'SkippedReason',
    'ExportSkippedExcel',
    'ExportSkippedFailed',
    'SkippedHelp',
    'Found',
    'UpToDate',
    'VehicleId',
    'Owner',
    'Phone',
    'VehicleType',
    'SanghBranch',
    'Address',
    'CitizenshipNo',
    'RegistrationStatus',
    'Status',
    'LastSuccessful',
    'RegistryRows',
    'DocumentRows',
    'BranchFilter',
    'LastError',
  ];

  for (const suffix of keys) {
    const key = `billing.tqmsSnapshotSync${suffix}`;
    assert.notEqual(t(key), key, `${key} should resolve to a translation`);
  }
});
