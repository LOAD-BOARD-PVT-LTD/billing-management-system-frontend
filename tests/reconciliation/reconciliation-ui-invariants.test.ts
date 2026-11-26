import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  compareVehiclesForReconciliation,
  isOwnerReconciliationDiff,
  reconcileVehicleLookup,
} from '@/features/reconciliation';
import { mockApiClient } from '@/tests/helpers/api-mock';
import { createTestBillingVehicle, createTestReceipt } from '@/tests/helpers/fixtures';
import { readWorkspaceFile } from '@/tests/helpers/source-assertions';

describe('Reconciliation UI Layer Invariants', () => {
  let restoreApi: (() => void) | null = null;

  afterEach(() => {
    restoreApi?.();
    restoreApi = null;
  });

  it('never emits a branch diff or शाखा owner label across single-owner and multi-owner vehicles', () => {
    const billingSingle = createTestBillingVehicle({
      branch: 'Lumbini Truck Yatayat Byawasayi Sangh',
      operatorName: 'Ram Bahadur',
      ownerName: 'Ram Bahadur',
      resourceContent: {
        Owners: [
          { Name: 'Ram Bahadur', Phone: '9841234567', SanghBranch: 'Lumbini Truck Yatayat Byawasayi Sangh' },
        ],
      },
    });
    const tqmsSingle = createTestBillingVehicle({
      branch: 'Loadboard sthaniya',
      operatorName: 'Ram Bahadur',
      ownerName: 'Ram Bahadur',
      resourceContent: {
        Owners: [
          { Name: 'Ram Bahadur', Phone: '9841234567', SanghBranch: 'Loadboard sthaniya' },
        ],
      },
    });

    const diffs = compareVehiclesForReconciliation(billingSingle, tqmsSingle);
    assert.equal(diffs.find((diff) => diff.key === 'branch'), undefined);
    assert.equal(diffs.some((diff) => diff.isChanged), false);

    const ownersDiff = diffs.find((diff) => diff.key === 'owners');
    assert.ok(ownersDiff);
    assert.ok(!ownersDiff.billingValue.includes('शाखा'));
    assert.ok(!ownersDiff.tqmsValue.includes('शाखा'));
  });

  it('returns MATCHED directly when only sthaniya changed in TQMS', async () => {
    const mock = mockApiClient({
      get: async () => {
        throw new Error('Unexpected VehicleResource GET');
      },
      post: async <T>(): Promise<T> => ({
        Data: {
          cache_results: [{
            cache_id: '701',
            VehicleId: '701',
            VehicleNumber: 'Ga Pra-35-96-GA-2221',
            VehicleType: 'Bus',
            Owners: [{ Name: 'Ram Bahadur', Phone: '9841234567', SanghBranch: 'Lumbini Sangh' }],
          }],
          tqms_results: [{
            VehicleId: '701',
            VehicleNumber: 'Ga Pra-35-96-GA-2221',
            VehicleType: 'Bus',
            Owners: [{ Name: 'Ram Bahadur', Phone: '9841234567', SanghBranch: 'Loadboard sthaniya' }],
          }],
        },
      } as T),
    });
    restoreApi = mock.restore;

    const result = await reconcileVehicleLookup('Ga Pra-35-96-GA-2221', {
      receipts: [createTestReceipt('701', { vehicleNumber: 'Ga Pra-35-96-GA-2221' })],
    });

    assert.equal(result.type, 'MATCHED');
    if (result.type === 'MATCHED') {
      assert.equal(result.billingVehicle.branch, 'Loadboard sthaniya');
    }
  });

  it('excludes sthaniya diff even when another vehicle field triggers reconciliation', async () => {
    const mock = mockApiClient({
      post: async <T>(): Promise<T> => ({
        Data: {
          cache_results: [{
            cache_id: '702',
            VehicleId: '702',
            VehicleNumber: 'BA 01 KHA 9999',
            VehicleType: 'Mini Truck',
            Owners: [{ Name: 'Sita Gurung', Phone: '9841000000', SanghBranch: 'Gandaki Sangh' }],
          }],
          tqms_results: [{
            VehicleId: '702',
            VehicleNumber: 'BA 01 KHA 9999',
            VehicleType: 'Heavy Truck',
            Owners: [{ Name: 'Sita Gurung', Phone: '9841000000', SanghBranch: 'Loadboard sthaniya' }],
          }],
        },
      } as T),
    });
    restoreApi = mock.restore;

    const result = await reconcileVehicleLookup('BA 01 KHA 9999', {
      receipts: [createTestReceipt('702', { vehicleNumber: 'BA 01 KHA 9999' })],
    });
    assert.equal(result.type, 'RECONCILIATION_REQUIRED');
    if (result.type === 'RECONCILIATION_REQUIRED') {
      assert.equal(result.diffs.find((d) => d.key === 'branch'), undefined);
      assert.equal(result.diffs.some((d) => isOwnerReconciliationDiff(d) && d.isChanged), false);
      assert.equal(result.diffs.find((d) => d.key === 'vehicleType')?.isChanged, true);
    }
  });

  it('allows immediate first receipt generation without popup when TQMS details changed before any receipt exists', async () => {
    const mock = mockApiClient({
      post: async <T>(): Promise<T> => ({
        Data: {
          cache_results: [{
            cache_id: '1001',
            VehicleId: '1001',
            VehicleNumber: 'Province-5-25-32-JA-1001',
            VehicleType: 'Truck',
            Owners: [{ Name: 'Initial Owner', Phone: '9800000001' }],
          }],
          tqms_results: [{
            VehicleId: '1001',
            VehicleNumber: 'Province-5-25-32-JA-1001',
            VehicleType: 'Tipper',
            Owners: [{ Name: 'Edited Owner', Phone: '9841222222' }],
          }],
        },
      } as T),
    });
    restoreApi = mock.restore;

    const result = await reconcileVehicleLookup('Province-5-25-32-JA-1001', { receipts: [] });
    assert.equal(result.type, 'MATCHED');
    if (result.type === 'MATCHED') {
      assert.equal(result.needsCacheSync, true);
      assert.equal(result.billingVehicle.vehicleType, 'Tipper');
      assert.equal(result.billingVehicle.ownerName, 'Edited Owner');
    }
  });

  it('guards ReconciliationComparisonTable UI against rendering branch diffs', () => {
    const tableSource = readWorkspaceFile('features', 'reconciliation', 'components', 'ReconciliationComparisonTable.tsx');
    assert.ok(tableSource.includes("diff.key !== 'branch'"));
  });
});
