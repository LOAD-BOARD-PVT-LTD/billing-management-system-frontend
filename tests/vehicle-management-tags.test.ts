import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	readVehicleManagementTags,
	updateVehicleManagementTags,
	type VehicleManagementTag,
} from '@/features/billing/api/vehicle-resource.api';
import type { BillingVehicle } from '@/features/billing/model/types';
import { apiClient } from '@/lib/api/client';

describe('VehicleResource management tags', () => {
	const originalGet = apiClient.get;
	const originalPut = apiClient.put;

	afterEach(() => {
		apiClient.get = originalGet;
		apiClient.put = originalPut;
	});

	const vehicle = {
		tqmsVehicleId: 'V1',
		vehicleNumber: 'Ba 1 Ja 1234',
	} as BillingVehicle;

	it('reads only the supported management tags from VehicleResource metadata', async () => {
		apiClient.get = async <T>(): Promise<T> => ([{
			id: 'resource-1',
			resource_name: 'VehicleResource',
			inner_content: {
				VehicleId: 'V1',
				VehicleNumber: 'Ba 1 Ja 1234',
				metadata: { tags: ['custom', 'sangh', 'blacklisted'] },
			},
		}] as T);

		assert.deepEqual(await readVehicleManagementTags(vehicle), ['sangh']);
	});

	it('updates management tags while preserving unrelated metadata and tags', async () => {
		let updatedBody: Record<string, unknown> | undefined;
		apiClient.get = async <T>(): Promise<T> => ([{
			id: 'resource-1',
			resource_name: 'VehicleResource',
			metadata: { source: 'root' },
			inner_content: {
				VehicleId: 'V1',
				VehicleNumber: 'Ba 1 Ja 1234',
				metadata: {
					tags: ['custom', 'sangh'],
					isBlacklisted: true,
					blacklistedReason: 'review',
				},
			},
			external_content: { metadata: { retained: true } },
		}] as T);
		apiClient.put = async <T>(_path: string, body?: unknown): Promise<T> => {
			updatedBody = body as Record<string, unknown>;
			return undefined as T;
		};

		const tags: VehicleManagementTag[] = ['swoyam'];
		await updateVehicleManagementTags(vehicle, tags);

		const innerContent = updatedBody?.inner_content as Record<string, unknown>;
		const metadata = innerContent.metadata as Record<string, unknown>;
		assert.deepEqual(metadata.tags, ['custom', 'swoyam']);
		assert.equal(metadata.isBlacklisted, true);
		assert.equal(metadata.blacklistedReason, 'review');
		assert.equal(metadata.source, 'root');
		assert.equal(metadata.retained, true);
		assert.deepEqual((updatedBody?.external_content as Record<string, unknown>).metadata, { retained: true });
	});
});
