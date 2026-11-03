import { afterEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
	compareVehiclesForReconciliation,
	normalizeReconciliationText,
	prepareNewMemberPayload,
	prepareTqmsUpdatePayload,
	reconcileVehicleLookup,
	resolveVehicleOwners,
	vehicleResourceToBillingVehicle,
} from '@/features/reconciliation';
import { findVehicleResource, type VehicleResourceDocument } from '@/features/billing/api/vehicle-resource.api';
import type { BillingVehicle } from '@/features/billing/model/types';
import { apiClient } from '@/lib/api/client';

function createMockBillingVehicle(overrides: Partial<BillingVehicle> = {}): BillingVehicle {
	return {
		id: 'res-1',
		tqmsVehicleId: '101',
		tqmsVehicleTypeId: 'type-bus',
		vehicleNumber: 'BA 01 KHA 1234',
		vehicleType: 'Bus',
		// First is sanchalak (Hari Thapa), second is sawari dhani (Ram Bahadur)
		operatorName: 'Hari Thapa',
		ownerName: 'Ram Bahadur',
		phone: '9841234567',
		smsPhone: '9841234567',
		ownerAddress: 'Kathmandu',
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

		test('when two owners are present: first is sanchalak and second is sawari dhani', () => {
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
			assert.equal(resolved.phone, '9841999999'); // Primary phone is sawari dhani
			assert.equal(resolved.ownerAddress, 'Kathmandu');
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
			assert.equal(diffs.length, 9); // Includes owners array diff
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
			// First is sanchalak, second is sawari dhani
			assert.equal(vehicle.operatorName, 'Hari Thapa');
			assert.equal(vehicle.ownerName, 'Ram Bahadur');
			assert.equal(vehicle.phone, '9841234567');
			assert.equal(vehicle.smsPhone, '9841234567');
			assert.equal(vehicle.ownerAddress, 'Kathmandu');
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
	});

	describe('End-to-End Reconcile Vehicle Lookup Flow', () => {
		const originalGet = apiClient.get;
		const originalPost = apiClient.post;

		afterEach(() => {
			apiClient.get = originalGet;
			apiClient.post = originalPost;
		});

		test('searches VehicleResource first, then /api/v1/tqms/search, and returns MATCHED when identical', async () => {
			const callSequence: string[] = [];

			apiClient.get = async <T>(path: string): Promise<T> => {
				callSequence.push(`GET:${path}`);
				return JSON.parse(
					JSON.stringify([
						{
							id: 'res-101',
							resource_name: 'VehicleResource',
							inner_content: {
								VehicleId: '101',
								VehicleNumber: 'BA 01 KHA 1234',
								VehicleType: 'Bus',
								Owners: [{ Name: 'Ram Bahadur', Phone: '9841234567' }],
							},
						},
					]),
				);
			};

			apiClient.post = async <T>(path: string, body: unknown): Promise<T> => {
				callSequence.push(`POST:${path}`);
				assert.equal((body as Record<string, unknown>).vehicle_number, 'BA 01 KHA 1234');
				return JSON.parse(
					JSON.stringify([
						{
							VehicleId: '101',
							VehicleNumber: 'BA 01 KHA 1234',
							VehicleType: 'Bus',
							Owners: [{ Name: 'Ram Bahadur', Phone: '9841234567' }],
						},
					]),
				);
			};

			const result = await reconcileVehicleLookup('BA 01 KHA 1234');

			// Verified call sequence: VehicleResource search is performed first, followed by TQMS search
			assert.ok(decodeURIComponent(callSequence[0]).startsWith('GET:search/VehicleResource/VehicleNumber/BA 01 KHA 1234/all'));
			assert.equal(callSequence[1], 'POST:tqms/search');
			assert.equal(result.type, 'MATCHED');
			assert.equal(result.billingVehicle.vehicleNumber, 'BA 01 KHA 1234');
		});

		test('returns RECONCILIATION_REQUIRED when VehicleResource and TQMS details differ', async () => {
			apiClient.get = async <T>(): Promise<T> => {
				return JSON.parse(
					JSON.stringify([
						{
							id: 'res-101',
							resource_name: 'VehicleResource',
							inner_content: {
								VehicleId: '101',
								VehicleNumber: 'BA 01 KHA 1234',
								VehicleType: 'Bus',
								Owners: [{ Name: 'Old Billing Owner', Phone: '9841000000' }],
							},
						},
					]),
				);
			};

			apiClient.post = async <T>(): Promise<T> => {
				return JSON.parse(
					JSON.stringify([
						{
							VehicleId: '101',
							VehicleNumber: 'BA 01 KHA 1234',
							VehicleType: 'Bus',
							Owners: [
								{ Name: 'New Sanchalak', Phone: '9801000000' },
								{ Name: 'New Sawari Dhani', Phone: '9841999999' },
							],
						},
					]),
				);
			};

			const result = await reconcileVehicleLookup('BA 01 KHA 1234');

			assert.equal(result.type, 'RECONCILIATION_REQUIRED');
			assert.equal(result.billingVehicle.ownerName, 'Old Billing Owner');
			assert.equal(result.tqmsVehicle.ownerName, 'New Sawari Dhani');
			assert.equal(result.tqmsVehicle.operatorName, 'New Sanchalak');
			const diffKeys = result.diffs.filter((d) => d.isChanged).map((d) => d.key);
			assert.ok(diffKeys.includes('ownerName'));
			assert.ok(diffKeys.includes('operatorName'));
			assert.ok(diffKeys.includes('owners'));
		});

		test('falls back to the TQMS vehicle ID when no resource matches the current vehicle number', async () => {
			const resourcePaths: string[] = [];
			apiClient.get = async <T>(path: string): Promise<T> => {
				resourcePaths.push(path);
				if (path === 'search/VehicleResource/VehicleId/101/all') {
					return [{
						id: 'res-101',
						resource_name: 'VehicleResource',
						inner_content: {
							VehicleId: '101',
							VehicleNumber: 'BA 01 KHA 1234',
							VehicleType: 'Bus',
							Owners: [{ Name: 'Ram Bahadur', Phone: '9841234567' }],
						},
					}] as T;
				}
				throw new Error('Request failed (404): No resources found for search query');
			};
			apiClient.post = async <T>(): Promise<T> => ([{
				VehicleId: '101',
				VehicleNumber: 'BA 01 KHA 1234',
				VehicleType: 'Bus',
				Owners: [{ Name: 'Ram Bahadur', Phone: '9841234567' }],
			}] as T);

			const result = await reconcileVehicleLookup('BA 01 KHA 1234');

			assert.ok(resourcePaths.includes('search/VehicleResource/VehicleId/101/all'));
			assert.equal(result.type, 'MATCHED');
		});

		test('returns FIRST_TIME when vehicle does not exist in VehicleResource', async () => {
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

			assert.equal(result.type, 'FIRST_TIME');
			assert.equal(result.tqmsVehicle.vehicleNumber, 'LU 02 KHA 5678');
			assert.equal(result.billingResource, null);
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
			const audits = payload.externalContent.reconciliationAudit as Array<Record<string, unknown>>;
			assert.equal(audits.length, 1);
			assert.equal(audits[0].action, 'UPDATE_TQMS');
			assert.equal(audits[0].performedBy, 'admin_user');
			assert.equal(audits[0].reason, 'TQMS renewal update');
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

		afterEach(() => {
			apiClient.get = originalGet;
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
