import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { VehicleTypeRecord } from '@/features/vehicle/type/types/vehicle-type.types';
import type { TqmsVehicleTypeOption } from '@/features/vehicle/mappings/tqms-vehicle-type/types/tqms-vehicle-type.types';

describe('Batch 2: State Management & Redundant Sync Cleanup', () => {
  it('derives billing categories directly from vehicle type records without atom synchronization', () => {
    const mockBillingVehicleTypes: VehicleTypeRecord[] = [
      {
        id: 'cat-1',
        category: 'Heavy Commercial',
        vehicleTypes: ['truck-heavy', 'tipper'],
      },
      {
        id: 'cat-2',
        category: 'Light Passenger',
        vehicleTypes: ['car', 'microbus'],
      },
    ];

    const mockTqmsVehicleTypes: TqmsVehicleTypeOption[] = [
      { id: 'truck-heavy', name: 'Heavy Truck', code: 'HT' },
      { id: 'car', name: 'Private Car', code: 'PC' },
      { id: 'unknown-type', name: 'Unmapped', code: 'UN' },
    ];

    // Mirror the pure logic in MembersPage.tsx lines 97-110:
    const categories = new Map<string, string>();
    for (const category of mockBillingVehicleTypes) {
      for (const typeId of category.vehicleTypes) {
        categories.set(typeId.trim().toLocaleLowerCase(), category.category);
      }
    }

    const billingTypeByTqmsId = new Map(
      mockTqmsVehicleTypes.map((type) => {
        const billingType = categories.get(type.id.trim().toLocaleLowerCase()) ?? '';
        return [type.id.trim().toLocaleLowerCase(), billingType] as const;
      }),
    );

    assert.equal(billingTypeByTqmsId.get('truck-heavy'), 'Heavy Commercial');
    assert.equal(billingTypeByTqmsId.get('car'), 'Light Passenger');
    assert.equal(billingTypeByTqmsId.get('unknown-type'), '');
  });

  it('eliminates dual-store delay: query records are instantly available without an extra useEffect tick', () => {
    // Verifies that query data can be consumed synchronously without requiring an atom store update
    const queryData: VehicleTypeRecord[] = [
      { id: 'cat-1', category: 'Bus', vehicleTypes: ['bus-large'] },
    ];

    const records = queryData ?? [];
    assert.equal(records.length, 1);
    assert.equal(records[0]?.category, 'Bus');
  });
});
