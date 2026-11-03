import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { updateVehicleOwnerPhone } from '@/features/billing/api/vehicle-resource.api';
import type { BillingVehicle } from '@/features/billing/model/types';
import { apiClient } from '@/lib/api/client';

describe('VehicleResource owner phone update', () => {
	const originalGet = apiClient.get;
	const originalPut = apiClient.put;

	afterEach(() => {
		apiClient.get = originalGet;
		apiClient.put = originalPut;
	});

	it('updates the marked dhani phone on VehicleResource and preserves other owners', async () => {
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

		await updateVehicleOwnerPhone(vehicle, {
			phone: '9811111111',
			reason: 'Owner requested update',
		});

		assert.equal(readPath, 'search/VehicleResource/VehicleId/V1/all');
		assert.equal(updatedPath, 'update/VehicleResource/resource-1');
		assert.deepEqual(
			(updatedBody?.inner_content as { Owners: Array<Record<string, unknown>> }).Owners.map((owner) => owner.Phone),
			['9800000001', '9811111111'],
		);
		assert.equal(updatedBody?.resource_name, 'VehicleResource');
		assert.deepEqual(updatedBody?.external_content && (updatedBody.external_content as Record<string, unknown>).existing, 'kept');
		assert.equal(
			((updatedBody?.external_content as Record<string, unknown>).phoneChangeHistory as Array<{ reason: string }>)[0].reason,
			'Owner requested update',
		);
	});

	it('does not write a phone number when VehicleResource has no owners', async () => {
		let writeCount = 0;
		apiClient.get = async <T>(): Promise<T> => ([{
			id: 'resource-2',
			resource_name: 'VehicleResource',
			inner_content: { VehicleId: 'V2', VehicleNumber: 'Ba 1 Ja 2345' },
		}] as T);
		apiClient.put = async <T>(): Promise<T> => {
			writeCount += 1;
			return undefined as T;
		};
		const vehicle = {
			tqmsVehicleId: 'V2',
			vehicleNumber: 'Ba 1 Ja 2345',
		} as BillingVehicle;

		await assert.rejects(
			updateVehicleOwnerPhone(vehicle, { phone: '9811111111', reason: 'Requested' }),
			/does not contain owner details/u,
		);
		assert.equal(writeCount, 0);
	});
});
