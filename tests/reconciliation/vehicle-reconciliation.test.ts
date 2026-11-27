import { afterEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
	compareVehiclesForReconciliation,
	isOwnerReconciliationDiff,
	normalizeReconciliationText,
	prepareFirstBillCacheSyncPayload,
	prepareNewMemberPayload,
	prepareOwnerChangePayload,
	prepareTqmsUpdatePayload,
	reconcileVehicleLookup,
	resolveVehicleOwners,
	vehicleResourceToBillingVehicle,
} from '@/features/reconciliation';
import {
	createVehicleResource,
	findVehicleResource,
	updateVehicleResource,
	type VehicleResourceDocument,
} from '@/features/billing/api/vehicle-resource.api';
import type { BillingVehicle } from '@/features/billing/model/types';
import type { ReceiptRecord } from '@/features/receipts/model/receipt';
import { apiClient } from '@/lib/api/client';

function createMockBillingVehicle(overrides: Partial<BillingVehicle> = {}): BillingVehicle {
	return {
		id: 'res-1',
		tqmsVehicleId: '101',
		tqmsVehicleTypeId: 'type-bus',
		vehicleNumber: 'BA 01 KHA 1234',
		vehicleType: 'Bus',
		// First is sanchalak & main owner contact (Hari Thapa), second is sawari dhani name (Ram Bahadur)
		operatorName: 'Hari Thapa',
		ownerName: 'Ram Bahadur',
		phone: '9800000000',
		smsPhone: '9800000000',
		ownerAddress: 'Lalitpur',
		branch: 'Lalitpur Branch, Kathmandu Branch',
		fiscalYear: '2081/82',
		billingDate: '2026-05-01',
		periodStart: '2026-05-01',
		periodEnd: '2026-06-01',
		billingMonths: 1,
		company: '',
		companyShare: '',
		rate: '1000',
		rateDate: '2026-05-01',
		previousPeriod: '',
		remainingPeriod: '',
		resourceContent: {
			VehicleId: '101',
			VehicleNumber: 'BA 01 KHA 1234',
			VehicleType: 'Bus',
			Owners: [
				{
					Name: 'Hari Thapa',
					Type: 'Operator',
					Phone: '9800000000',
					Address: 'Lalitpur',
					SanghBranch: 'Lalitpur Branch',
				},
				{
					Name: 'Ram Bahadur',
					Type: 'Main Owner',
					Phone: '9841234567',
					Address: 'Kathmandu',
					SanghBranch: 'Kathmandu Branch',
				},
			],
		},
		...overrides,
	};
}

function createMockResource(
	id = 'res-1',
	innerOverrides: Record<string, unknown> = {},
	externalContent: Record<string, unknown> = {},
): VehicleResourceDocument {
	return {
		id,
		resource: {
			id,
			resource_name: 'VehicleResource',
		},
		innerContent: {
			VehicleId: '101',
			VehicleNumber: 'BA 01 KHA 1234',
			VehicleType: 'Bus',
			VehicleTypeId: 'type-bus',
			Owners: [
				{
					Name: 'Hari Thapa',
					Type: 'Operator',
					Phone: '9800000000',
					Address: 'Lalitpur',
					SanghBranch: 'Lalitpur Branch',
				},
				{
					Name: 'Ram Bahadur',
					Type: 'Main Owner',
					Phone: '9841234567',
					Address: 'Kathmandu',
					SanghBranch: 'Kathmandu Branch',
				},
			],
			...innerOverrides,
		},
		externalContent,
	};
}

function createMockReceipt(vehicleId: string, vehicleNumber: string): ReceiptRecord {
	const vehicle = createMockBillingVehicle({ tqmsVehicleId: vehicleId, vehicleNumber });
	return {
		id: `bill-${vehicleId}-${vehicleNumber}`,
		billingType: 'MEMBERSHIP',
		receiptNumber: 'MAIN.1',
		fiscalYear: '2083/84',
		vehicleNumber,
		finalDigits: '',
		customerName: vehicle.ownerName,
		organizationName: '',
		billingDate: '2083-01-01',
		paymentDate: '2083-01-01',
		validUntil: '2083-12-30',
		paymentMethod: 'नगद',
		status: 'PAID',
		totalAmount: 100,
		branchName: 'Main',
		userName: 'Admin',
		printedCopyCount: 0,
		bill: {
			id: 'bill-id',
			receiptNumber: 'MAIN.1',
			createdAt: '2026-01-01T00:00:00.000Z',
			content: {
				billingType: 'MEMBERSHIP',
				vehicle: {
					id: vehicleId,
					vehicleNumber,
					vehicleType: vehicle.vehicleType,
					ownerName: vehicle.ownerName,
					operatorName: vehicle.operatorName,
					phone: vehicle.phone,
					address: vehicle.ownerAddress,
				},
				branch: {
					id: 'branch-1',
					name: 'Main',
					BranchCode: 'MAIN',
					address: '',
					phone: '',
					contactPerson: '',
				},
				fiscalYearId: 'fy-1',
				fiscalYearName: '2083/84',
				billingDate: '2083-01-01',
				periodStart: '2083-01-01',
				periodEnd: '2083-01-01',
				billingMonths: 1,
				items: [],
				subtotal: 100,
				discount: 0,
				total: 100,
				paymentMethod: 'नगद',
				note: '',
			},
		},
	};
}

describe('Vehicle Reconciliation Utility Suite', () => {
	describe('Owner Resolution Domain Logic (Single vs Two Owners)', () => {
		test('when single owner is present: same person is both sawari dhani and sanchalak', () => {
			const owners = [
				{
					Name: 'Bikram Adhikari',
					Phone: '9841111111',
					Address: 'Chitwan',
					SanghBranch: 'Chitwan Branch',
				},
			];

			const resolved = resolveVehicleOwners(owners);
			assert.equal(resolved.sawariDhaniName, 'Bikram Adhikari');
			assert.equal(resolved.sanchalakName, 'Bikram Adhikari'); // Same is sawari dhani and sanchalak
			assert.equal(resolved.phone, '9841111111');
			assert.equal(resolved.ownerAddress, 'Chitwan');
			assert.equal(resolved.branch, 'Chitwan Branch');
		});

		test('when two owners are present: first is sanchalak and main contact, second is sawari dhani', () => {
			const owners = [
				{
					Name: 'Sanchalak First Person',
					Phone: '9801000000',
					Address: 'Pokhara',
					SanghBranch: 'Pokhara Branch',
				},
				{
					Name: 'Sawari Dhani Second Person',
					Phone: '9841999999',
					Address: 'Kathmandu',
					SanghBranch: 'Kathmandu Branch',
				},
			];

			const resolved = resolveVehicleOwners(owners);
			assert.equal(resolved.sanchalakName, 'Sanchalak First Person'); // First is sanchalak
			assert.equal(resolved.sawariDhaniName, 'Sawari Dhani Second Person'); // Second is sawari dhani
			assert.equal(resolved.phone, '9801000000'); // Main owner (first) phone
			assert.equal(resolved.ownerAddress, 'Pokhara'); // Main owner (first) address
		});
	});

	describe('normalizeReconciliationText', () => {
		test('normalizes null, undefined, and empty string to empty string', () => {
			assert.equal(normalizeReconciliationText(null), '');
			assert.equal(normalizeReconciliationText(undefined), '');
			assert.equal(normalizeReconciliationText(''), '');
			assert.equal(normalizeReconciliationText('   '), '');
		});

		test('normalizes dash and placeholder markers to empty string', () => {
			assert.equal(normalizeReconciliationText('—'), '');
			assert.equal(normalizeReconciliationText('-'), '');
			assert.equal(normalizeReconciliationText('none'), '');
			assert.equal(normalizeReconciliationText('NONE'), '');
			assert.equal(normalizeReconciliationText('null'), '');
			assert.equal(normalizeReconciliationText('मालिकको विवरण उपलब्ध छैन'), '');
			assert.equal(normalizeReconciliationText('सवारी प्रकार उपलब्ध छैन'), '');
		});

		test('normalizes case and internal multiple whitespaces', () => {
			assert.equal(normalizeReconciliationText('  Ba  01   KHA  1234 '), 'ba 01 kha 1234');
			assert.equal(normalizeReconciliationText('Narayangarh   Branch'), 'narayangarh branch');
		});
	});

	describe('compareVehiclesForReconciliation', () => {
		test('reports no changes when billing and TQMS details match exactly or with superficial spacing/case differences', () => {
			const billing = createMockBillingVehicle();
			const tqms = createMockBillingVehicle({
				vehicleNumber: 'ba 01 kha 1234',
				ownerName: 'Ram Bahadur  ',
				branch: 'Lalitpur Branch, Kathmandu Branch',
			});

			const diffs = compareVehiclesForReconciliation(billing, tqms);
			const changed = diffs.filter((d) => d.isChanged);

			assert.equal(changed.length, 0);
			assert.equal(diffs.length, 8); // Excludes sthaniya (branch); includes owners array diff
		});

		test('detects ownership change between Billing and TQMS', () => {
			const billing = createMockBillingVehicle({ ownerName: 'Old Owner' });
			const tqms = createMockBillingVehicle({ ownerName: 'New TQMS Owner' });

			const diffs = compareVehiclesForReconciliation(billing, tqms);
			const ownerDiff = diffs.find((d) => d.key === 'ownerName');

			assert.ok(ownerDiff);
			assert.equal(ownerDiff?.isChanged, true);
			assert.equal(ownerDiff?.billingValue, 'Old Owner');
			assert.equal(ownerDiff?.tqmsValue, 'New TQMS Owner');
		});

		test('detects changes in the Owners array (e.g. single owner converted to two owners)', () => {
			const billing = createMockBillingVehicle({
				resourceContent: {
					Owners: [
						{ Name: 'Only Single Owner', Phone: '9841000000', SanghBranch: 'Kathmandu' },
					],
				},
			});
			const tqms = createMockBillingVehicle({
				resourceContent: {
					Owners: [
						{ Name: 'Sanchalak Operator', Phone: '9801000000', SanghBranch: 'Lalitpur' },
						{ Name: 'Sawari Dhani Owner', Phone: '9841000000', SanghBranch: 'Kathmandu' },
					],
				},
			});

			const diffs = compareVehiclesForReconciliation(billing, tqms);
			const ownersDiff = diffs.find((d) => d.key === 'owners');

			assert.ok(ownersDiff);
			assert.equal(ownersDiff?.isChanged, true);
		});

		test('does not trigger reconciliation or owner change popup when only sthaniya (SanghBranch) changes in TQMS', () => {
			const billing = createMockBillingVehicle({
				branch: 'Lumbini Truck Yatayat Byawasayi Sangh',
				resourceContent: {
					VehicleId: '101',
					VehicleNumber: 'BA 01 KHA 1234',
					VehicleType: 'Bus',
					Owners: [
						{ Name: 'Hari Thapa', Type: 'Operator', Phone: '9800000000', Address: 'Lalitpur', SanghBranch: 'Lumbini Truck Yatayat Byawasayi Sangh' },
						{ Name: 'Ram Bahadur', Type: 'Main Owner', Phone: '9841234567', Address: 'Kathmandu', SanghBranch: 'Lumbini Truck Yatayat Byawasayi Sangh' },
					],
				},
			});
			const tqms = createMockBillingVehicle({
				branch: 'Loadboard sthaniya',
				resourceContent: {
					VehicleId: '101',
					VehicleNumber: 'BA 01 KHA 1234',
					VehicleType: 'Bus',
					Owners: [
						{ Name: 'Hari Thapa', Type: 'Operator', Phone: '9800000000', Address: 'Lalitpur', SanghBranch: 'Loadboard sthaniya' },
						{ Name: 'Ram Bahadur', Type: 'Main Owner', Phone: '9841234567', Address: 'Kathmandu', SanghBranch: 'Loadboard sthaniya' },
					],
				},
			});

			const diffs = compareVehiclesForReconciliation(billing, tqms);
			const changedDiffs = diffs.filter((d) => d.isChanged);
			const changedOwnerDiffs = diffs.filter((d) => isOwnerReconciliationDiff(d) && d.isChanged);
			const branchDiff = diffs.find((d) => d.key === 'branch');
			const ownersDiff = diffs.find((d) => d.key === 'owners');

			assert.equal(branchDiff, undefined);
			assert.equal(changedDiffs.length, 0);
			assert.equal(changedOwnerDiffs.length, 0);
			assert.ok(ownersDiff);
			assert.ok(!ownersDiff.billingValue.includes('शाखा'));
			assert.ok(!ownersDiff.tqmsValue.includes('शाखा'));
			assert.ok(!ownersDiff.tqmsValue.includes('Loadboard sthaniya'));
		});
	});

	describe('vehicleResourceToBillingVehicle mapping', () => {
		test('converts VehicleResourceDocument to BillingVehicle respecting two owners rule', () => {
			const resource = createMockResource();
			const vehicle = vehicleResourceToBillingVehicle(resource);

			assert.equal(vehicle.id, 'res-1');
			assert.equal(vehicle.tqmsVehicleId, '101');
			assert.equal(vehicle.tqmsVehicleTypeId, 'type-bus');
			assert.equal(vehicle.vehicleNumber, 'BA 01 KHA 1234');
			assert.equal(vehicle.vehicleType, 'Bus');
			// First is sanchalak & main owner contact, second is sawari dhani name
			assert.equal(vehicle.operatorName, 'Hari Thapa');
			assert.equal(vehicle.ownerName, 'Ram Bahadur');
			assert.equal(vehicle.phone, '9800000000');
			assert.equal(vehicle.smsPhone, '9800000000');
			assert.equal(vehicle.ownerAddress, 'Lalitpur');
		});

		test('respects single owner rule where ownerName and operatorName are identical', () => {
			const resource = createMockResource('res-single', {
				Owners: [
					{
						Name: 'Gita Sharma',
						Phone: '9841555555',
						Address: 'Bhaktapur',
						SanghBranch: 'Bhaktapur Branch',
					},
				],
			});
			const vehicle = vehicleResourceToBillingVehicle(resource);

			assert.equal(vehicle.ownerName, 'Gita Sharma');
			assert.equal(vehicle.operatorName, 'Gita Sharma'); // Same is sawari dhani and sanchalak
			assert.equal(vehicle.phone, '9841555555');
		});

		test('uses saved external SMS phone or sms tag without replacing the TQMS main owner phone', () => {
			const resource = createMockResource('res-sms', {}, { smsPhone: '9811111111' });
			const vehicle = vehicleResourceToBillingVehicle(resource);

			assert.equal(vehicle.phone, '9800000000');
			assert.equal(vehicle.smsPhone, '9811111111');

			const taggedResource = createMockResource('res-sms-tag', {
				metadata: { tags: ['sangh', 'sms:9822222222'] },
			});
			const taggedVehicle = vehicleResourceToBillingVehicle(taggedResource);
			assert.equal(taggedVehicle.phone, '9800000000');
			assert.equal(taggedVehicle.smsPhone, '9822222222');
		});
	});

	describe('End-to-End Reconcile Vehicle Lookup Flow', () => {
		const originalGet = apiClient.get;
		const originalPost = apiClient.post;

		afterEach(() => {
			apiClient.get = originalGet;
			apiClient.post = originalPost;
		});

		test('uses cache and TQMS results from one search response when identical', async () => {
			const callSequence: string[] = [];

			apiClient.get = async <T>(path: string): Promise<T> => {
				callSequence.push(`GET:${path}`);
				throw new Error(`Unexpected VehicleResource read: ${path}`);
			};

			apiClient.post = async <T>(path: string, body: unknown): Promise<T> => {
				callSequence.push(`POST:${path}`);
				assert.equal((body as Record<string, unknown>).vehicle_number, 'BA 01 KHA 1234');
				return JSON.parse(
					JSON.stringify({
						Code: 200,
						Data: {
							cache_results: [{
								cache_id: 6490,
								VehicleId: 101,
								VehicleNumber: 'BA 01 KHA 1234',
								VehicleType: 'Bus',
								Owners: [{ Name: 'Ram Bahadur', Phone: '9841234567' }],
							}],
							tqms_results: [{
							VehicleId: '101',
							VehicleNumber: 'BA 01 KHA 1234',
							VehicleType: 'Bus',
							Owners: [{ Name: 'Ram Bahadur', Phone: '9841234567' }],
							}],
						},
					}),
				);
			};

			const result = await reconcileVehicleLookup('BA 01 KHA 1234', {
				receipts: [createMockReceipt('101', 'BA 01 KHA 1234')],
			});

			assert.deepEqual(callSequence, ['POST:tqms/search']);
			assert.equal(result.type, 'MATCHED');
			assert.equal(result.billingVehicle.id, '6490');
		});

		test('returns RECONCILIATION_REQUIRED when cached details and TQMS details differ', async () => {
			apiClient.get = async <T>(): Promise<T> => {
				throw new Error('Reconciliation should not read VehicleResource.');
			};

			apiClient.post = async <T>(): Promise<T> => {
				return JSON.parse(
					JSON.stringify({
						Data: {
							cache_results: [{
								cache_id: 'cache-101',
								VehicleId: '101',
								VehicleNumber: 'BA 01 KHA 1234',
								VehicleType: 'Bus',
								Owners: [{ Name: 'Old Billing Owner', Phone: '9841000000' }],
							}],
							tqms_results: [{
							VehicleId: '101',
							VehicleNumber: 'BA 01 KHA 1234',
							VehicleType: 'Bus',
							Owners: [
								{ Name: 'New Sanchalak', Phone: '9801000000' },
								{ Name: 'New Sawari Dhani', Phone: '9841999999' },
							],
							}],
						},
					}),
				);
			};

			const result = await reconcileVehicleLookup('BA 01 KHA 1234', {
				receipts: [createMockReceipt('101', 'BA 01 KHA 1234')],
			});

			assert.equal(result.type, 'RECONCILIATION_REQUIRED');
			assert.equal(result.billingVehicle.ownerName, 'Old Billing Owner');
			assert.equal(result.tqmsVehicle.ownerName, 'New Sawari Dhani');
			assert.equal(result.tqmsVehicle.operatorName, 'New Sanchalak');
			const diffKeys = result.diffs.filter((d) => d.isChanged).map((d) => d.key);
			assert.ok(diffKeys.includes('ownerName'));
			assert.ok(diffKeys.includes('operatorName'));
			assert.ok(diffKeys.includes('owners'));
		});

		test('uses the selected cache/TQMS pair without searching again', async () => {
			let searchCalled = false;
			apiClient.get = async <T>(path: string): Promise<T> => {
				throw new Error(`Unexpected VehicleResource read: ${path}`);
			};
			apiClient.post = async <T>(): Promise<T> => {
				searchCalled = true;
				throw new Error('TQMS search should not run when a vehicle is preloaded.');
			};

			const preloadedVehicle = createMockBillingVehicle();
			const result = await reconcileVehicleLookup('BA 01 KHA 1234', {
				preloadedMatch: {
					tqmsVehicle: preloadedVehicle,
					cacheVehicle: createMockBillingVehicle(),
					cacheId: 'cache-101',
					cacheRecord: {
						cache_id: 'cache-101',
						VehicleId: '101',
						VehicleNumber: 'BA 01 KHA 1234',
						VehicleType: 'Bus',
						Owners: [
							{ Name: 'Hari Thapa', Type: 'Operator', Phone: '9800000000' },
							{ Name: 'Ram Bahadur', Type: 'Main Owner', Phone: '9841234567' },
						],
					},
				},
				receipts: [createMockReceipt('101', 'BA 01 KHA 1234')],
			});

			assert.equal(searchCalled, false);
			assert.equal(result.tqmsVehicle, preloadedVehicle);
			assert.equal(result.type, 'MATCHED');
		});

		test('pairs a previous cache vehicle with the current TQMS vehicle by ID when its number changed', async () => {
			apiClient.get = async <T>(path: string): Promise<T> => {
				throw new Error(`Unexpected VehicleResource read: ${path}`);
			};
			apiClient.post = async <T>(): Promise<T> => ({
				Data: {
					cache_results: [{
						cache_id: 'cache-101',
						VehicleId: '101',
						VehicleNumber: 'Ga Pra-12-12-GHA-1221',
						VehicleType: 'Bus',
						Owners: [{ Name: 'Old Owner' }],
					}],
					tqms_results: [{
						VehicleId: '101',
						VehicleNumber: 'Ga Pra-12-12-GHA-1223',
						VehicleType: 'Bus',
						Owners: [{ Name: 'New Owner' }],
					}],
				},
			} as T);

			const result = await reconcileVehicleLookup('Ga Pra-12-12-GHA-1223');

			assert.equal(result.type, 'RECONCILIATION_REQUIRED');
			assert.equal(result.billingVehicle.vehicleNumber, 'Ga Pra-12-12-GHA-1221');
			assert.equal(result.tqmsVehicle.vehicleNumber, 'Ga Pra-12-12-GHA-1223');
			assert.ok(result.diffs.some((diff) => diff.key === 'vehicleNumber' && diff.isChanged));
		});

		test('returns RESOURCE_MISSING when vehicle has no VehicleResource', async () => {
			apiClient.get = async () => {
				throw new Error('Request failed (404): No resources found for search query');
			};

			apiClient.post = async <T>(): Promise<T> => {
				return JSON.parse(
					JSON.stringify([
						{
							VehicleId: '202',
							VehicleNumber: 'LU 02 KHA 5678',
							VehicleType: 'Truck',
							Owners: [{ Name: 'Fresh Member', Phone: '9851000000' }],
						},
					]),
				);
			};

			const result = await reconcileVehicleLookup('LU 02 KHA 5678');

			assert.equal(result.type, 'RESOURCE_MISSING');
			assert.equal(result.tqmsVehicle.vehicleNumber, 'LU 02 KHA 5678');
			assert.equal(result.hasBillingHistory, false);
		});

		test('recovers when a past bill exists but VehicleResource is missing', async () => {
			apiClient.get = async () => {
				throw new Error('Request failed (404): No resources found for search query');
			};
			apiClient.post = async <T>(): Promise<T> => ([{
				VehicleId: '101',
				VehicleNumber: 'BA 01 KHA 1234',
				VehicleType: 'Bus',
				Owners: [{ Name: 'Current TQMS Owner' }],
			}] as T);

			const result = await reconcileVehicleLookup('BA 01 KHA 1234', {
				receipts: [createMockReceipt('101', 'BA 01 KHA 1234')],
			});

			assert.equal(result.type, 'RESOURCE_MISSING');
			assert.equal(result.hasBillingHistory, true);
			assert.equal(result.tqmsVehicle.ownerName, 'Current TQMS Owner');
		});

		test('creates a VehicleResource from the selected TQMS vehicle snapshot', async () => {
			let requestPath = '';
			let requestBody: unknown;
			apiClient.post = async <T>(path: string, body: unknown): Promise<T> => {
				requestPath = path;
				requestBody = body;
				return {} as T;
			};

			const vehicle = createMockBillingVehicle();
			await createVehicleResource(vehicle);

			assert.equal(requestPath, 'create/VehicleResource');
			assert.deepEqual(requestBody, {
				resource_name: 'VehicleResource',
				inner_content: {
					...vehicle.resourceContent,
					VehicleId: vehicle.tqmsVehicleId,
					VehicleNumber: vehicle.vehicleNumber,
					VehicleType: vehicle.vehicleType,
					VehicleTypeId: vehicle.tqmsVehicleTypeId,
				},
				external_content: null,
			});
		});

		test('skips reconciliation popup and uses latest TQMS details with needsCacheSync when no receipt has been generated yet', async () => {
			apiClient.get = async <T>(): Promise<T> => ([{
				cache_id: 'cache-1001',
				VehicleId: '1001',
				VehicleNumber: 'Province-5-25-32-JA-1001',
				VehicleType: 'Old Bus',
				Owners: [{ Name: 'Old Owner' }],
			}] as T);
			apiClient.post = async <T>(): Promise<T> => ({
				Data: {
					cache_results: [{
						cache_id: 'cache-1001',
						VehicleId: '1001',
						VehicleNumber: 'Province-5-25-32-JA-1001',
						VehicleType: 'Old Bus',
						Owners: [{ Name: 'Old Owner' }],
					}],
					tqms_results: [{
						VehicleId: '1001',
						VehicleNumber: 'Province-5-25-32-JA-1001',
						VehicleType: 'Bus',
						Owners: [{ Name: 'Current TQMS Owner', Phone: '9841000001' }],
					}],
				},
			} as T);

			const result = await reconcileVehicleLookup('Province-5-25-32-JA-1001', { receipts: [] });
			assert.equal(result.type, 'MATCHED');
			if (result.type === 'MATCHED') {
				assert.equal(result.needsCacheSync, true);
				assert.equal(result.billingVehicle.id, 'cache-1001');
				assert.equal(result.billingVehicle.vehicleType, 'Bus');
				assert.equal(result.billingVehicle.ownerName, 'Current TQMS Owner');
			}
		});

		test('prepareFirstBillCacheSyncPayload updates cache fields from TQMS while preserving metadata and externalContent', () => {
			const resource = createMockResource(
				'cache-1001',
				{
					VehicleNumber: 'Province-5-25-32-JA-1001',
					VehicleType: 'Old Bus',
					metadata: { smsPhone: '9811111111', tags: ['sangh'] },
				},
				{ customFlag: true },
			);
			const tqms = createMockBillingVehicle({
				tqmsVehicleId: '101',
				vehicleNumber: 'Province-5-25-32-JA-1001',
				vehicleType: 'Bus',
				tqmsVehicleTypeId: 'type-bus-new',
				resourceContent: {
					VehicleId: '101',
					VehicleNumber: 'Province-5-25-32-JA-1001',
					VehicleType: 'Bus',
					Owners: [{ Name: 'Updated TQMS Owner', Phone: '9849999999' }],
				},
			});

			const payload = prepareFirstBillCacheSyncPayload(resource, tqms);
			assert.equal(payload.innerContent.VehicleNumber, 'Province-5-25-32-JA-1001');
			assert.equal(payload.innerContent.VehicleType, 'Bus');
			assert.equal(payload.innerContent.VehicleTypeId, 'type-bus-new');
			assert.deepEqual(payload.innerContent.Owners, tqms.resourceContent.Owners);
			assert.deepEqual(payload.innerContent.metadata, { smsPhone: '9811111111', tags: ['sangh'] });
			assert.deepEqual(payload.externalContent, { customFlag: true });
		});

		test('returns MATCHED without reconciliation when only sthaniya (SanghBranch) changed in TQMS', async () => {
			apiClient.get = async <T>(): Promise<T> => {
				throw new Error('Reconciliation should not read VehicleResource.');
			};
			apiClient.post = async <T>(): Promise<T> => ({
				Data: {
					cache_results: [{
						cache_id: 'cache-2221',
						VehicleId: '2221',
						VehicleNumber: 'Ga Pra-35-96-GA-2221',
						VehicleType: 'Bus',
						Owners: [{ Name: 'Ram Bahadur', Phone: '9841234567', SanghBranch: 'Lumbini Truck Yatayat Byawasayi Sangh' }],
					}],
					tqms_results: [{
						VehicleId: '2221',
						VehicleNumber: 'Ga Pra-35-96-GA-2221',
						VehicleType: 'Bus',
						Owners: [{ Name: 'Ram Bahadur', Phone: '9841234567', SanghBranch: 'Loadboard sthaniya' }],
					}],
				},
			} as T);

			const result = await reconcileVehicleLookup('Ga Pra-35-96-GA-2221', {
				receipts: [createMockReceipt('2221', 'Ga Pra-35-96-GA-2221')],
			});

			assert.equal(result.type, 'MATCHED');
			if (result.type === 'MATCHED') {
				assert.equal(result.billingVehicle.id, 'cache-2221');
				assert.equal(result.billingVehicle.branch, 'Loadboard sthaniya');
			}
		});
	});

	describe('prepareTqmsUpdatePayload (Option 2)', () => {
		test('updates vehicle data and records reconciliation audit log', () => {
			const resource = createMockResource();
			const tqms = createMockBillingVehicle({
				ownerName: 'Updated TQMS Owner',
				phone: '9801122334',
				resourceContent: {
					VehicleId: '101',
					VehicleNumber: 'BA 01 KHA 1234',
					Owners: [{ Name: 'Updated TQMS Owner', Phone: '9801122334' }],
				},
			});

			const diffs = compareVehiclesForReconciliation(
				vehicleResourceToBillingVehicle(resource),
				tqms,
			);
			const payload = prepareTqmsUpdatePayload(
				resource,
				tqms,
				diffs,
				'admin_user',
				'TQMS renewal update',
			);

			assert.equal(payload.innerContent.VehicleNumber, 'BA 01 KHA 1234');
			assert.deepEqual(payload.innerContent.Owners, resource.innerContent.Owners);
			const audits = payload.externalContent.reconciliationAudit as Array<Record<string, unknown>>;
			assert.equal(audits.length, 1);
			assert.equal(audits[0].action, 'UPDATE_TQMS');
			assert.equal(audits[0].performedBy, 'admin_user');
			assert.equal(audits[0].reason, 'TQMS renewal update');
		});

		test('updates sthaniya (SanghBranch) on UPDATE_TQMS without removing ownershipHistory or audit history', () => {
			const existingHistory = [
				{
					previousOwners: [{ Name: 'Earlier Owner', Phone: '9800000001' }],
					transferredAt: '2025-01-01T00:00:00.000Z',
					performedBy: 'old_admin',
					reason: 'Initial transfer',
					transferType: 'TQMS_OWNERSHIP_TRANSFER',
				},
			];
			const existingAudits = [
				{
					action: 'UPDATE_TQMS',
					timestamp: '2025-02-01T00:00:00.000Z',
					performedBy: 'old_admin',
					reason: 'Prior update',
					changedFields: [],
				},
			];
			const resource = createMockResource('res-1', {}, {
				ownershipHistory: existingHistory,
				reconciliationAudit: existingAudits,
			});
			const tqms = createMockBillingVehicle({
				branch: 'Narayangarh Branch',
				resourceContent: {
					VehicleId: '101',
					VehicleNumber: 'BA 01 KHA 1234',
					VehicleType: 'Bus',
					Owners: [
						{ Name: 'Hari Thapa', Type: 'Operator', Phone: '9800000000', Address: 'Lalitpur', SanghBranch: 'Narayangarh Branch' },
						{ Name: 'Ram Bahadur', Type: 'Main Owner', Phone: '9841234567', Address: 'Kathmandu', SanghBranch: 'Narayangarh Branch' },
					],
				},
			});

			const diffs = compareVehiclesForReconciliation(
				vehicleResourceToBillingVehicle(resource),
				tqms,
			);
			const payload = prepareTqmsUpdatePayload(
				resource,
				tqms,
				diffs,
				'admin_user',
				'Sthaniya updated in TQMS',
			);

			const updatedOwners = payload.innerContent.Owners as Array<Record<string, unknown>>;
			assert.equal(updatedOwners.length, 2);
			assert.equal(updatedOwners[0].Name, 'Hari Thapa');
			assert.equal(updatedOwners[0].SanghBranch, 'Narayangarh Branch');
			assert.equal(updatedOwners[1].Name, 'Ram Bahadur');
			assert.equal(updatedOwners[1].SanghBranch, 'Narayangarh Branch');
			assert.deepEqual(payload.externalContent.ownershipHistory, existingHistory);
			assert.equal((payload.externalContent.reconciliationAudit as Array<unknown>).length, 2);
		});
	});

	describe('prepareOwnerChangePayload', () => {
		test('records a name correction without creating an ownership transfer history', () => {
			const resource = createMockResource();
			const previousOwners = structuredClone(resource.innerContent.Owners);
			const tqms = createMockBillingVehicle({
				ownerName: 'Corrected Owner Name',
				resourceContent: {
					VehicleId: '101',
					VehicleNumber: 'BA 01 KHA 1234',
					Owners: [{ Name: 'Corrected Owner Name', OwnerId: 8700 }],
				},
			});
			const diffs = compareVehiclesForReconciliation(vehicleResourceToBillingVehicle(resource), tqms);
			const payload = prepareOwnerChangePayload(
				resource,
				tqms,
				diffs,
				'NAME_CORRECTION',
				'admin',
				'TQMS अनुसार धनीको नाम सच्याइयो',
			);

			assert.deepEqual(payload.innerContent.Owners, tqms.resourceContent.Owners);
			assert.deepEqual(resource.innerContent.Owners, previousOwners);
			assert.equal(payload.externalContent.ownershipHistory, undefined);
			assert.equal(
				(payload.externalContent.reconciliationAudit as Array<Record<string, unknown>>)[0].reason,
				'TQMS अनुसार धनीको नाम सच्याइयो',
			);
		});

		test('archives the previous one-or-two owner array on confirmed ownership transfer', () => {
			const resource = createMockResource();
			const previousOwners = structuredClone(resource.innerContent.Owners);
			const tqms = createMockBillingVehicle({
				ownerName: 'New Owner',
				operatorName: 'New Operator',
				resourceContent: {
					VehicleId: '101',
					VehicleNumber: 'BA 01 KHA 1234',
					Owners: [
						{ Name: 'New Operator', OwnerId: 8701 },
						{ Name: 'New Owner', OwnerId: 8702 },
					],
				},
			});
			const diffs = compareVehiclesForReconciliation(vehicleResourceToBillingVehicle(resource), tqms);
			const payload = prepareOwnerChangePayload(
				resource,
				tqms,
				diffs,
				'OWNERSHIP_TRANSFER',
				'admin',
				'TQMS अनुसार धनी परिवर्तन पुष्टि',
			);
			const ownershipHistory = payload.externalContent.ownershipHistory as Array<Record<string, unknown>>;

			assert.deepEqual(payload.innerContent.Owners, tqms.resourceContent.Owners);
			assert.deepEqual(ownershipHistory[0].previousOwners, previousOwners);
			assert.equal(ownershipHistory[0].transferType, 'TQMS_OWNERSHIP_TRANSFER');
			assert.deepEqual(resource.innerContent.Owners, previousOwners);
		});
	});

	describe('prepareNewMemberPayload (Option 3)', () => {
		test('archives previous ownership history and records audit entry', () => {
			const resource = createMockResource();
			const tqms = createMockBillingVehicle({
				ownerName: 'Brand New Transferee',
				phone: '9841998877',
				resourceContent: {
					VehicleId: '101',
					VehicleNumber: 'BA 01 KHA 1234',
					Owners: [{ Name: 'Brand New Transferee', Phone: '9841998877', Type: 'Main Owner' }],
				},
			});

			const diffs = compareVehiclesForReconciliation(
				vehicleResourceToBillingVehicle(resource),
				tqms,
			);
			const payload = prepareNewMemberPayload(
				resource,
				tqms,
				diffs,
				'desk_officer',
				'Ownership transfer deed registered',
			);

			const history = payload.externalContent.ownershipHistory as Array<Record<string, unknown>>;
			assert.equal(history.length, 1);
			assert.equal(history[0].transferType, 'NEW_MEMBER_RECONCILIATION');
			assert.equal(history[0].performedBy, 'desk_officer');
			assert.equal(history[0].reason, 'Ownership transfer deed registered');
			assert.ok(Array.isArray(history[0].previousOwners));
		});
	});

	describe('findVehicleResource API helper', () => {
		const originalGet = apiClient.get;
		const originalPut = apiClient.put;

		afterEach(() => {
			apiClient.get = originalGet;
			apiClient.put = originalPut;
		});

		test('updateVehicleResource sends numeric resource id as an integer for backend i32 deserialization', async () => {
			let capturedPath = '';
			let capturedBody: Record<string, unknown> | undefined;
			apiClient.put = async <T>(path: string, body?: unknown): Promise<T> => {
				capturedPath = path;
				capturedBody = body as Record<string, unknown>;
				return undefined as T;
			};

			const resource = createMockResource('6490');
			await updateVehicleResource(resource, resource.innerContent, resource.externalContent);

			assert.equal(capturedPath, 'update/VehicleResource/6490');
			assert.equal(capturedBody?.id, 6490);
			assert.equal(typeof capturedBody?.id, 'number');
		});

		test('reconcileVehicleLookup sets numeric billingResource.resource.id as an integer from cache_id', async () => {
			apiClient.post = async <T>(): Promise<T> => ({
				Data: {
					cache_results: [{
						cache_id: '6490',
						VehicleId: '101',
						VehicleNumber: 'Ga Pra-12-12-GHA-1221',
						VehicleType: 'Bus',
						Owners: [{ Name: 'Owner' }],
					}],
					tqms_results: [{
						VehicleId: '101',
						VehicleNumber: 'Ga Pra-12-12-GHA-1223',
						VehicleType: 'Bus',
						Owners: [{ Name: 'Owner' }],
					}],
				},
			} as T);

			const result = await reconcileVehicleLookup('Ga Pra-12-12-GHA-1223', {
				receipts: [createMockReceipt('101', 'Ga Pra-12-12-GHA-1221')],
			});
			assert.equal(result.type, 'RECONCILIATION_REQUIRED');
			if (result.type === 'RECONCILIATION_REQUIRED') {
				assert.equal(result.billingResource.id, '6490');
				assert.equal(result.billingResource.resource.id, 6490);
				assert.equal(typeof result.billingResource.resource.id, 'number');
			}
		});

		test('returns null when vehicle does not exist (404)', async () => {
			apiClient.get = async () => {
				throw new Error('Request failed (404): No resources found for search query');
			};

			const result = await findVehicleResource('999', 'UNKNOWN-VEHICLE');
			assert.equal(result, null);
		});

		test('returns VehicleResourceDocument when vehicle exists', async () => {
			apiClient.get = async <T>(): Promise<T> => {
				return JSON.parse(
					JSON.stringify([
						{
							id: 'resource-101',
							resource_name: 'VehicleResource',
							inner_content: {
								VehicleId: '101',
								VehicleNumber: 'BA 01 KHA 1234',
							},
						},
					]),
				);
			};

			const result = await findVehicleResource('101', 'BA 01 KHA 1234');
			assert.ok(result);
			assert.equal(result?.id, 'resource-101');
			assert.equal(result?.innerContent.VehicleId, '101');
		});
	});
});
