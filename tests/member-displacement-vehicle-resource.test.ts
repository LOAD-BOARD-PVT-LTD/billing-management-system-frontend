import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	removeMemberDisplaced,
	tagMemberDisplaced,
} from '@/features/members/api/member-resource.api';
import { fetchMemberVehicleDetails, parseMemberVehicleResource } from '@/features/members/api/member-vehicle.api';
import { apiClient } from '@/lib/api/client';

describe('Member displacement is stored in VehicleResource metadata', () => {
	const originalGet = apiClient.get;
	const originalPut = apiClient.put;

	afterEach(() => {
		apiClient.get = originalGet;
		apiClient.put = originalPut;
	});

	const vehicle = {
		vehicleId: 'V1',
		vehicleNumber: 'Ba 1 Ja 1234',
	};

	it('tags displacement in VehicleResource metadata without writing a MemberResource', async () => {
		let readPath = '';
		let updatedPath = '';
		let updatedBody: Record<string, unknown> | undefined;
		apiClient.get = async <T>(path: string): Promise<T> => {
			readPath = path;
			return [{
				id: 'vehicle-resource-1',
				resource_name: 'VehicleResource',
				inner_content: {
					VehicleId: 'V1',
					VehicleNumber: 'Ba 1 Ja 1234',
					metadata: { tags: ['swoyam', 'sangh'] },
				},
			}] as T;
		};
		apiClient.put = async <T>(path: string, body?: unknown): Promise<T> => {
			updatedPath = path;
			updatedBody = body as Record<string, unknown>;
			return undefined as T;
		};

		await tagMemberDisplaced({
			...vehicle,
			reason: 'Route moved',
			taggedAt: '2026-11-16T10:00:00.000Z',
			performedBy: 'admin@example.com',
		});

		assert.equal(readPath, 'search/VehicleResource/VehicleId/V1/all');
		assert.equal(updatedPath, 'update/VehicleResource/vehicle-resource-1');
		const innerContent = updatedBody?.inner_content as Record<string, unknown>;
		const metadata = innerContent.metadata as Record<string, unknown>;
		assert.deepEqual(metadata.tags, ['swoyam', 'sangh', 'displaced']);
		assert.equal(metadata.isDisplaced, true);
		assert.equal(metadata.displacedReason, 'Route moved');
		assert.equal(metadata.displacedAt, '2026-11-16T10:00:00.000Z');
		assert.equal(metadata.displacedBy, 'admin@example.com');
	});

	it('removes only the displaced metadata and tag from VehicleResource', async () => {
		let updatedBody: Record<string, unknown> | undefined;
		apiClient.get = async <T>(): Promise<T> => ([{
			id: 'vehicle-resource-1',
			resource_name: 'VehicleResource',
			inner_content: {
				VehicleId: 'V1',
				VehicleNumber: 'Ba 1 Ja 1234',
				metadata: {
					tags: ['custom', 'displaced'],
					isDisplaced: true,
					displacedReason: 'Route moved',
					displacedAt: '2026-11-16T10:00:00.000Z',
					displacedBy: 'admin@example.com',
				},
			},
		}] as T);
		apiClient.put = async <T>(_path: string, body?: unknown): Promise<T> => {
			updatedBody = body as Record<string, unknown>;
			return undefined as T;
		};

		await removeMemberDisplaced(vehicle);

		const innerContent = updatedBody?.inner_content as Record<string, unknown>;
		const metadata = innerContent.metadata as Record<string, unknown>;
		assert.deepEqual(metadata.tags, ['custom']);
		assert.equal(metadata.isDisplaced, false);
		assert.equal('displacedReason' in metadata, false);
		assert.equal('displacedAt' in metadata, false);
		assert.equal('displacedBy' in metadata, false);
	});

	it('reads displaced status from the latest VehicleResource snapshot', async () => {
		apiClient.get = async <T>(): Promise<T> => ([{
			id: 'vehicle-resource-1',
			resource_name: 'VehicleResource',
			createdTime: '2026-11-15T10:00:00.000Z',
			inner_content: {
				VehicleId: 'V1',
				VehicleNumber: 'Ba 1 Ja 1234',
				Owners: [],
				metadata: {
					tags: ['displaced'],
					isDisplaced: true,
					displacedReason: 'Old reason',
				},
			},
		}, {
			id: 'vehicle-resource-2',
			resource_name: 'VehicleResource',
			createdTime: '2026-11-16T10:00:00.000Z',
			inner_content: {
				VehicleId: 'V1',
				VehicleNumber: 'Ba 1 Ja 1234',
				Owners: [],
				metadata: { tags: [], isDisplaced: false },
			},
		}] as T);

		const vehicles = await fetchMemberVehicleDetails();

		assert.equal(vehicles.length, 1);
		assert.equal(vehicles[0].isDisplaced, false);
		assert.equal(vehicles[0].displacedReason, '');
	});

	it('reads previous vehicle number and ID from reconciliation audit history', () => {
		const vehicle = parseMemberVehicleResource({
			id: 'vehicle-resource-1',
			inner_content: {
				VehicleId: 'V2',
				VehicleNumber: 'BA 1 CHA 2222',
			},
			external_content: {
				reconciliationAudit: [{
					changedFields: [
						{ field: 'vehicleNumber', oldValue: 'BA 1 CHA 1111', newValue: 'BA 1 CHA 2222' },
						{ field: 'tqmsVehicleId', oldValue: 'V1', newValue: 'V2' },
					],
				}],
			},
		});

		assert.deepEqual(vehicle.previousVehicleNumbers, ['BA 1 CHA 1111']);
		assert.deepEqual(vehicle.previousVehicleIds, ['V1']);
	});
});
