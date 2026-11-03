import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchTqmsMemberRegistry,
  parseTqmsMemberRegistry,
} from '@/features/vehicle/tqms/api/tqms-member-registry.api';
import { apiClient } from '@/lib/api/client';

const vehicle = {
  id: 'V1',
  resource_name: 'VehicleResource',
  inner_content: {
    VehicleId: 'V1',
    VehicleNumber: 'Ba 1 Ja 1234',
    Owners: [
      { Name: 'Operator', SanghBranch: 'Hetauda' },
      { Name: 'Owner', SanghBranch: 'Birgunj' },
    ],
  },
};

describe('TQMS member registry', () => {
  const originalGet = apiClient.get;

  afterEach(() => {
    apiClient.get = originalGet;
  });

  it('keeps all owner branches when no admin branch filter is configured', () => {
    const [parsed] = parseTqmsMemberRegistry([vehicle]);

    assert.equal(parsed.branch, 'Hetauda, Birgunj');
  });

  it('shows only the configured admin branch for a vehicle with multiple branches', () => {
    const [parsed] = parseTqmsMemberRegistry([vehicle], 'Birgunj');

    assert.equal(parsed.branch, 'Birgunj');
  });

  it('keeps vehicles when the configured branch belongs to any owner and shows only that branch', async () => {
    const unmatchedVehicle = {
      ...vehicle,
      id: 'V2',
      inner_content: {
        ...vehicle.inner_content,
        VehicleId: 'V2',
        VehicleNumber: 'Ba 2 Ja 9876',
        Owners: [
          { Name: 'Operator', SanghBranch: 'Hetauda' },
          { Name: 'Owner', SanghBranch: 'Pokhara' },
        ],
      },
    };
    apiClient.get = async <T>(): Promise<T> => [vehicle, unmatchedVehicle] as T;

    const result = await fetchTqmsMemberRegistry(undefined, 'Birgunj');

    assert.equal(result.length, 1);
    assert.equal(result[0].vehicleId, 'V1');
    assert.equal(result[0].branch, 'Birgunj');
  });

  it('loads all vehicles and matches configured branch names inside multi-branch owner values', async () => {
    let requestedUrl = '';
    const multiBranchVehicle = {
      ...vehicle,
      inner_content: {
        ...vehicle.inner_content,
        Owners: [
          { Name: 'Operator', SanghBranch: 'Hetauda / Birgunj' },
          { Name: 'Owner', SanghBranch: 'Pokhara' },
        ],
      },
    };
    apiClient.get = async <T>(url: string): Promise<T> => {
      requestedUrl = url;
      return [multiBranchVehicle] as T;
    };

    const result = await fetchTqmsMemberRegistry(undefined, 'Birgunj');

    assert.equal(requestedUrl, 'read/VehicleResource/all');
    assert.equal(result.length, 1);
    assert.equal(result[0].branch, 'Birgunj');
  });
});
