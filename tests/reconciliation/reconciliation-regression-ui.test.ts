import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';

import { updateVehicleResource } from '@/features/billing/api/vehicle-resource.api';
import { parseTqmsVehicleSearchMatches } from '@/features/billing/schemas/tqms-vehicle-search.schema';
import {
  clearReconciledVehicleSnapshots,
  compareVehiclesForReconciliation,
  OwnerChangeDecision,
  prepareOwnerChangePayload,
  prepareTqmsUpdatePayload,
  ReconciliationComparisonTable,
  reconcileVehicleLookup,
  recordReconciledVehicleSnapshot,
  VehicleReconciliationView,
} from '@/features/reconciliation';
import { invalidateVehicleReconciliationCaches } from '@/features/reconciliation/utils/reconciliation-cache';
import { ReceiptFilters } from '@/features/receipts/components/ReceiptFilters';
import { buildReceiptFilterOptions } from '@/features/receipts/utils/receipt-filter-options';
import { createQueryClient } from '@/lib/query/query-client';
import { billingKeys } from '@/lib/query/query-keys';
import { mockApiClient } from '@/tests/helpers/api-mock';
import {
  createTestBillingVehicle,
  createTestReceipt,
} from '@/tests/helpers/fixtures';
import {
  assertContainsText,
  assertExcludesText,
  renderComponentHtml,
} from '@/tests/helpers/ui-test-utils';

describe('Reconciliation Regression & Comprehensive UI Suites', () => {
  let restoreApi: (() => void) | null = null;

  afterEach(() => {
    restoreApi?.();
    restoreApi = null;
    clearReconciledVehicleSnapshots();
  });

  describe('Regression 1: Owner change (धनी परिवर्तन भएको हो) does not reappear after update', () => {
    it('confirms ownership transfer, purges search cache, and skips popup both before and after bill generation even when search cache lags', async () => {
      const priorReceipt = createTestReceipt('1', {
        vehicleNumber: 'NA 5 KHA 4411',
        customerName: 'Old Owner',
      });
      priorReceipt.bill.content.vehicle.id = '4411';

      const searchPayload = (owners: Array<Record<string, unknown>>, cacheOwners: Array<Record<string, unknown>>) => ({
        Data: {
          cache_results: [{
            cache_id: 'cache-4411',
            VehicleId: '4411',
            VehicleNumber: 'NA 5 KHA 4411',
            VehicleType: 'Truck',
            Owners: cacheOwners,
          }],
          tqms_results: [{
            VehicleId: '4411',
            VehicleNumber: 'NA 5 KHA 4411',
            VehicleType: 'Truck',
            Owners: owners,
          }],
        },
      });

      const oldOwners = [{ Name: 'Old Owner', Phone: '9841000001', Address: 'Hetauda', OwnerId: 10 }];
      const newOwners = [{ Name: 'New Owner', Phone: '9855000002', Address: 'Birgunj', OwnerId: 20 }];
      let putPayload: Record<string, unknown> | undefined;

      const mock = mockApiClient({
        post: async <T>(): Promise<T> => searchPayload(newOwners, oldOwners) as T,
        put: async <T>(_path: string, body?: unknown): Promise<T> => {
          putPayload = body as Record<string, unknown>;
          return undefined as T;
        },
      });
      restoreApi = mock.restore;

      // 1. Initial lookup triggers RECONCILIATION_REQUIRED
      const initial = await reconcileVehicleLookup('NA 5 KHA 4411', { receipts: [priorReceipt] });
      assert.equal(initial.type, 'RECONCILIATION_REQUIRED');
      if (initial.type !== 'RECONCILIATION_REQUIRED') return;

      // 2. UI check: VehicleReconciliationView renders धनीको विवरण परिवर्तन popup and disables save before selection
      const initialHtml = renderComponentHtml(
        createElement(VehicleReconciliationView, {
          billingVehicle: initial.billingVehicle,
          tqmsVehicle: initial.tqmsVehicle,
          billingResource: initial.billingResource,
          diffs: initial.diffs,
          receipts: [priorReceipt],
          isLoadingReceipts: false,
          receiptsError: null,
          isSubmitting: false,
          onCancel: () => {},
          onConfirm: async () => {},
        }),
      );
      assertContainsText(initialHtml, 'धनीको विवरण परिवर्तन');
      assertContainsText(initialHtml, 'धनी परिवर्तन भएको हो');
      assertContainsText(initialHtml, 'पहिलेको नाम');
      assertContainsText(initialHtml, 'हालको नाम');
      assertContainsText(initialHtml, 'Old Owner');
      assertContainsText(initialHtml, 'New Owner');
      assertContainsText(initialHtml, 'disabled=""');

      // Selecting OWNERSHIP_TRANSFER enables the save button
      const selectedPopupHtml = renderComponentHtml(
        createElement(OwnerChangeDecision, {
          billingVehicle: initial.billingVehicle,
          tqmsVehicle: initial.tqmsVehicle,
          value: 'OWNERSHIP_TRANSFER',
          onChange: () => {},
          onCancel: () => {},
          onSave: () => {},
        }),
      );
      assertContainsText(selectedPopupHtml, 'checked=""');
      assertExcludesText(selectedPopupHtml, 'disabled=""');

      // 3. User confirms OWNERSHIP_TRANSFER and updates VehicleResource + clears query cache
      const queryClient = createQueryClient();
      queryClient.setQueryData(billingKeys.tqmsVehicleSearch('NA 5 KHA 4411', ''), [
        { tqmsVehicle: initial.tqmsVehicle, cacheVehicle: initial.billingVehicle, cacheRecord: {}, cacheId: 'cache-4411' },
      ]);

      const { innerContent, externalContent } = prepareOwnerChangePayload(
        initial.billingResource,
        initial.tqmsVehicle,
        initial.diffs,
        'OWNERSHIP_TRANSFER',
        'admin',
        'TQMS अनुसार धनी परिवर्तन पुष्टि',
      );
      await updateVehicleResource(initial.billingResource, innerContent, externalContent);
      recordReconciledVehicleSnapshot({
        cacheId: initial.billingResource.id,
        tqmsVehicleId: initial.tqmsVehicle.tqmsVehicleId,
        innerContent,
        externalContent,
      });
      await invalidateVehicleReconciliationCaches(queryClient);

      assert.equal(putPayload?.Owners, undefined, 'PUT envelope must not include stale top-level Owners');
      assert.equal(putPayload?.VehicleNumber, undefined, 'PUT envelope must not include stale top-level VehicleNumber');
      assert.equal(queryClient.getQueryData(billingKeys.tqmsVehicleSearch('NA 5 KHA 4411', '')), undefined);

      // 4. Re-searching BEFORE generating a new bill (even while backend cache_results lags behind) must NOT show popup
      const beforeBillLookup = await reconcileVehicleLookup('NA 5 KHA 4411', { receipts: [priorReceipt] });
      assert.equal(beforeBillLookup.type, 'MATCHED');
      if (beforeBillLookup.type === 'MATCHED') {
        assert.equal(beforeBillLookup.billingVehicle.ownerName, 'New Owner');
      }

      // 5. Re-searching AFTER generating a new bill must NOT show popup either
      const newBillReceipt = createTestReceipt('2', {
        vehicleNumber: 'NA 5 KHA 4411',
        customerName: 'New Owner',
      });
      newBillReceipt.bill.content.vehicle.id = '4411';
      const afterBillLookup = await reconcileVehicleLookup('NA 5 KHA 4411', {
        receipts: [priorReceipt, newBillReceipt],
      });
      assert.equal(afterBillLookup.type, 'MATCHED');

      // 6. If TQMS owner is later changed AGAIN to a 3rd owner, reconciliation MUST trigger again
      const thirdOwners = [{ Name: 'Third Owner', Phone: '9800000099', Address: 'Pokhara', OwnerId: 30 }];
      mock.restore();
      const mockThird = mockApiClient({
        post: async <T>(): Promise<T> => searchPayload(thirdOwners, newOwners) as T,
      });
      restoreApi = mockThird.restore;

      const subsequentChange = await reconcileVehicleLookup('NA 5 KHA 4411', {
        receipts: [priorReceipt, newBillReceipt],
      });
      assert.equal(subsequentChange.type, 'RECONCILIATION_REQUIRED');
    });
  });

  describe('Regression 2: Vehicle number change (UPDATE_TQMS) does not reappear after update', () => {
    it('confirms vehicle number change without owner popup and never re-prompts before or after billing', async () => {
      const priorReceipt = createTestReceipt('10', { vehicleNumber: 'Ga Pra-12-12-GHA-1221' });
      priorReceipt.bill.content.vehicle.id = '5511';

      const buildSearchResponse = (tqmsNumber: string, cacheNumber: string) => ({
        Data: {
          cache_results: [{
            cache_id: '5511',
            VehicleId: '5511',
            VehicleNumber: cacheNumber,
            NormalizedVehicleNumber: cacheNumber,
            VehicleType: 'Truck',
            Owners: [{ Name: 'Hari Sharma', Phone: '9841112233' }],
          }],
          tqms_results: [{
            VehicleId: '5511',
            VehicleNumber: tqmsNumber,
            NormalizedVehicleNumber: tqmsNumber,
            VehicleType: 'Truck',
            Owners: [{ Name: 'Hari Sharma', Phone: '9841112233' }],
          }],
        },
      });

      let capturedPutInner: Record<string, unknown> | undefined;
      const mock = mockApiClient({
        post: async <T>(): Promise<T> => buildSearchResponse('Ga Pra-12-12-GHA-1223', 'Ga Pra-12-12-GHA-1221') as T,
        put: async <T>(_path: string, body?: unknown): Promise<T> => {
          capturedPutInner = (body as { inner_content?: Record<string, unknown> })?.inner_content;
          return undefined as T;
        },
      });
      restoreApi = mock.restore;

      const initial = await reconcileVehicleLookup('Ga Pra-12-12-GHA-1223', { receipts: [priorReceipt] });
      assert.equal(initial.type, 'RECONCILIATION_REQUIRED');
      if (initial.type !== 'RECONCILIATION_REQUIRED') return;

      // UI check: VehicleReconciliationView shows vehicle number diff + TQMS अनुसार अपडेट, WITHOUT owner-change modal
      const viewHtml = renderComponentHtml(
        createElement(VehicleReconciliationView, {
          billingVehicle: initial.billingVehicle,
          tqmsVehicle: initial.tqmsVehicle,
          billingResource: initial.billingResource,
          diffs: initial.diffs,
          receipts: [priorReceipt],
          isLoadingReceipts: false,
          receiptsError: null,
          isSubmitting: false,
          onCancel: () => {},
          onConfirm: async () => {},
        }),
      );
      assertContainsText(viewHtml, 'सवारी विवरण मेलमिलाप');
      assertContainsText(viewHtml, 'Ga Pra-12-12-GHA-1221');
      assertContainsText(viewHtml, 'Ga Pra-12-12-GHA-1223');
      assertContainsText(viewHtml, 'TQMS अनुसार अपडेट');
      assertExcludesText(viewHtml, 'owner-change-title');

      // Confirm UPDATE_TQMS and purge caches
      const queryClient = createQueryClient();
      queryClient.setQueryData(billingKeys.tqmsVehicleSearch('Ga Pra-12-12-GHA-1223', ''), ['stale']);

      const { innerContent, externalContent } = prepareTqmsUpdatePayload(
        initial.billingResource,
        initial.tqmsVehicle,
        initial.diffs,
        'admin',
        'TQMS vehicle number changed',
      );
      await updateVehicleResource(initial.billingResource, innerContent, externalContent);
      recordReconciledVehicleSnapshot({
        cacheId: initial.billingResource.id,
        tqmsVehicleId: initial.tqmsVehicle.tqmsVehicleId,
        innerContent,
        externalContent,
      });
      await invalidateVehicleReconciliationCaches(queryClient);

      assert.equal(capturedPutInner?.VehicleNumber, 'Ga Pra-12-12-GHA-1223');
      assert.equal(capturedPutInner?.NormalizedVehicleNumber, 'Ga Pra-12-12-GHA-1223');
      assert.equal(capturedPutInner?.vehicleNumber, undefined);
      assert.equal(queryClient.getQueryData(billingKeys.tqmsVehicleSearch('Ga Pra-12-12-GHA-1223', '')), undefined);

      // Re-searching before generating bill (even with stale backend cache) returns MATCHED
      const repeatBeforeBill = await reconcileVehicleLookup('Ga Pra-12-12-GHA-1223', {
        receipts: [priorReceipt],
      });
      assert.equal(repeatBeforeBill.type, 'MATCHED');

      // Re-searching after generating bill returns MATCHED
      const newBill = createTestReceipt('11', { vehicleNumber: 'Ga Pra-12-12-GHA-1223' });
      newBill.bill.content.vehicle.id = '5511';
      const repeatAfterBill = await reconcileVehicleLookup('Ga Pra-12-12-GHA-1223', {
        receipts: [priorReceipt, newBill],
      });
      assert.equal(repeatAfterBill.type, 'MATCHED');

      // If TQMS number changes AGAIN later, reconciliation must reappear cleanly
      mock.restore();
      const mockNextNumber = mockApiClient({
        post: async <T>(): Promise<T> => buildSearchResponse('Ga Pra-12-12-GHA-5555', 'Ga Pra-12-12-GHA-1223') as T,
      });
      restoreApi = mockNextNumber.restore;

      const futureChange = await reconcileVehicleLookup('Ga Pra-12-12-GHA-5555', {
        receipts: [priorReceipt, newBill],
      });
      assert.equal(futureChange.type, 'RECONCILIATION_REQUIRED');
    });
  });

  describe('Latest Cache Snapshot Selection (parseTqmsVehicleSearchMatches)', () => {
    it('selects the newest cache_results record when multiple historical snapshots share the same VehicleId', () => {
      const payload = {
        Data: {
          cache_results: [
            {
              cache_id: 100,
              updatedAt: '2026-01-01T00:00:00Z',
              VehicleId: '888',
              VehicleNumber: 'OLD-100',
              VehicleType: 'Truck',
              Owners: [{ Name: 'Old Snapshot Owner', Phone: '9800000000' }],
            },
            {
              cache_id: 205,
              updatedAt: '2026-06-01T00:00:00Z',
              VehicleId: '888',
              VehicleNumber: 'NEW-205',
              VehicleType: 'Truck',
              Owners: [{ Name: 'Latest Snapshot Owner', Phone: '9841999999' }],
            },
          ],
          tqms_results: [
            {
              VehicleId: '888',
              VehicleNumber: 'NEW-205',
              VehicleType: 'Truck',
              Owners: [{ Name: 'Latest Snapshot Owner', Phone: '9841999999' }],
            },
          ],
        },
      };

      const matches = parseTqmsVehicleSearchMatches(payload, 'NEW-205');
      assert.equal(matches.length, 1);
      assert.equal(matches[0].cacheId, '205');
      assert.equal(matches[0].cacheVehicle?.vehicleNumber, 'NEW-205');
      assert.equal(matches[0].cacheVehicle?.ownerName, 'Latest Snapshot Owner');
    });
  });

  describe('UI Component Rendering Coverage', () => {
    it('renders two-owner breakdown inside OwnerChangeDecision', () => {
      const billing = createTestBillingVehicle({
        operatorName: 'First Sanchalak',
        ownerName: 'First Dhani',
        resourceContent: {
          Owners: [
            { Name: 'First Sanchalak', OwnerId: 1 },
            { Name: 'First Dhani', OwnerId: 2 },
          ],
        },
      });
      const tqms = createTestBillingVehicle({
        operatorName: 'Second Sanchalak',
        ownerName: 'Second Dhani',
        resourceContent: {
          Owners: [
            { Name: 'Second Sanchalak', OwnerId: 3 },
            { Name: 'Second Dhani', OwnerId: 4 },
          ],
        },
      });

      const html = renderComponentHtml(
        createElement(OwnerChangeDecision, {
          billingVehicle: billing,
          tqmsVehicle: tqms,
          value: null,
          onChange: () => {},
          onCancel: () => {},
          onSave: () => {},
        }),
      );

      assertContainsText(html, 'संचालकको नाम: First Sanchalak');
      assertContainsText(html, 'धनीको नाम: First Dhani');
      assertContainsText(html, 'धनीको नाम: Second Dhani');
      assertContainsText(html, 'धनी ID: 4');
    });

    it('renders ReconciliationComparisonTable without sthaniya rows and shows empty state when no diffs change', () => {
      const a = createTestBillingVehicle({ branch: 'Old Sakha' });
      const b = createTestBillingVehicle({ branch: 'New Sakha' });
      const diffs = compareVehiclesForReconciliation(a, b);

      const emptyHtml = renderComponentHtml(
        createElement(ReconciliationComparisonTable, { diffs, showChangedOnly: true }),
      );
      assertContainsText(emptyHtml, 'कुनै परिवर्तन भएको विवरण छैन।');
      assertExcludesText(emptyHtml, 'संघ शाखा');

      const forcedBranchHtml = renderComponentHtml(
        createElement(ReconciliationComparisonTable, {
          diffs: [{ key: 'branch', label: 'संघ शाखा', billingValue: 'A', tqmsValue: 'B', isChanged: true }],
          showChangedOnly: true,
        }),
      );
      assertExcludesText(forcedBranchHtml, 'संघ शाखा');
      assertContainsText(forcedBranchHtml, 'कुनै परिवर्तन भएको विवरण छैन।');
    });

    it('renders ReceiptFilters controls and computes all 6 system branches plus all system users', () => {
      const records = [createTestReceipt('1', { branchName: 'हेटौंडा', userName: 'Admin' })];
      const branches = [
        { name: 'हेटौंडा' },
        { name: 'चितवन' },
        { name: 'पोखरा' },
        { name: 'काठमाडौं' },
        { name: 'वीरगञ्ज' },
        { name: 'परासी' },
      ];
      const users = [
        { name: 'Admin', email: 'admin@example.com' },
        { name: 'Chitwan Staff', email: 'chitwan@example.com' },
      ];

      const html = renderComponentHtml(
        createElement(ReceiptFilters, {
          records,
          branches,
          users,
          filters: { search: '', dateFrom: '', dateTo: '', branch: 'चितवन', user: 'Chitwan Staff', status: 'all' },
          onUpdate: () => {},
          onClear: () => {},
          isFiltered: true,
        }),
      );

      assertContainsText(html, 'रसिद खोज तथा फिल्टर');
      assertContainsText(html, 'id="receipt-branch"');
      assertContainsText(html, 'id="receipt-user"');
      assertContainsText(html, 'id="receipt-status"');
      assertContainsText(html, 'सबै फिल्टर हटाउनुहोस्');

      const options = buildReceiptFilterOptions(records, branches, users);
      assert.equal(options.branches.length, 6);
      assert.ok(options.branches.includes('चितवन'));
      assert.ok(options.branches.includes('पोखरा'));
      assert.deepEqual(options.users, ['Admin', 'Chitwan Staff']);
    });
  });
});
