import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { findMappedVehicleCategory } from '@/features/billing/utils/vehicle-category-mapping';
import type { VehicleTypeRecord } from '@/features/vehicle/type/types/vehicle-type.types';

const categories: VehicleTypeRecord[] = [
	{ id: 'category-truck', category: 'Truck', vehicleTypes: ['type-1'] },
	{ id: 'category-bus', category: 'Bus', vehicleTypes: ['type-2'] },
];

describe('Vehicle category billing gate mapping lookup', () => {
	it('finds the category mapped to the selected TQMS vehicle type ID', () => {
		assert.equal(findMappedVehicleCategory(categories, ' type-1 ')?.id, 'category-truck');
	});

	it('does not treat an unmapped vehicle type as billable', () => {
		assert.equal(findMappedVehicleCategory(categories, 'type-3'), null);
		assert.equal(findMappedVehicleCategory(categories, ''), null);
	});
});
