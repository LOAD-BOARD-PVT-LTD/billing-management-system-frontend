import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { updateVehicleSmsPhone } from '@/features/billing/api/vehicle-resource.api';
import type { BillingVehicle } from '@/features/billing/model/types';
import { apiClient } from '@/lib/api/client';

describe('VehicleResource owner phone update', () => {
	const originalGet = apiClient.get;
	const originalPut = apiClient.put;

	afterEach(() => {
		apiClient.get = originalGet;
		apiClient.put = originalPut;
	});

	it('stores the active SMS phone in external_content and leaves all TQMS owner phones unchanged', async () => {
		let readPath = '';
		let updatedPath = '';
		let updatedBody: Record<string, unknown> | undefined;
		apiClient.get = async <T>(path: string): Promise<T> => {
			readPath = path;
			return [
				{
					id: 'resource-1',
					resource_name: 'VehicleResource',
					inner_content: {
						VehicleId: 'V1',
						VehicleNumber: 'Ba 1 Ja 1234',
						Owners: [
							{ Name: 'Operator', isSanchalk: true, Phone: '9800000001' },
							{ Name: 'Dhani', isDhani: true, Phone: '9800000002' },
						],
					},
					external_content: { existing: 'kept' },
				},
			] as T;
		};
		apiClient.put = async <T>(path: string, body?: unknown): Promise<T> => {
			updatedPath = path;
			updatedBody = body as Record<string, unknown>;
			return undefined as T;
		};

		const vehicle: BillingVehicle = {
			id: 'resource-1',
			tqmsVehicleId: 'V1',
			tqmsVehicleTypeId: 'type-1',
			vehicleNumber: 'Ba 1 Ja 1234',
			vehicleType: 'Taxi',
			ownerName: 'Dhani',
			operatorName: 'Operator',
			phone: '9800000002',
			smsPhone: '9800000002',
			ownerAddress: '',
			branch: '',
			fiscalYear: '',
			billingDate: '',
			periodStart: '',
			periodEnd: '',
			billingMonths: 0,
			company: '',
			companyShare: '',
			rate: '',
			rateDate: '',
			previousPeriod: '',
			remainingPeriod: '',
			resourceContent: {},
		};

		await updateVehicleSmsPhone(vehicle, {
			phone: '9811111111',
		});

		assert.equal(readPath, 'search/VehicleResource/VehicleId/V1/all');
		assert.equal(updatedPath, 'update/VehicleResource/resource-1');
		assert.deepEqual(
			(updatedBody?.inner_content as { Owners: Array<Record<string, unknown>> }).Owners.map((owner) => owner.Phone),
			['9800000001', '9800000002'],
		);
		assert.equal(updatedBody?.resource_name, 'VehicleResource');
		assert.deepEqual(updatedBody?.external_content && (updatedBody.external_content as Record<string, unknown>).existing, 'kept');
		assert.equal((updatedBody?.external_content as Record<string, unknown>).smsPhone, '9811111111');
	});

	it('updates the active SMS phone even if VehicleResource has no owner data', async () => {
		let writeCount = 0;
		let updatedBody: Record<string, unknown> | undefined;
		apiClient.get = async <T>(): Promise<T> => ([{
			id: 'resource-2',
			resource_name: 'VehicleResource',
			inner_content: { VehicleId: 'V2', VehicleNumber: 'Ba 1 Ja 2345' },
		}] as T);
		apiClient.put = async <T>(_path: string, body?: unknown): Promise<T> => {
			writeCount += 1;
			updatedBody = body as Record<string, unknown>;
			return undefined as T;
		};
		const vehicle = {
			tqmsVehicleId: 'V2',
			vehicleNumber: 'Ba 1 Ja 2345',
		} as BillingVehicle;

		await updateVehicleSmsPhone(vehicle, { phone: '9811111111' });
		assert.equal(writeCount, 1);
		assert.equal((updatedBody?.external_content as Record<string, unknown>).smsPhone, '9811111111');
	});
});
