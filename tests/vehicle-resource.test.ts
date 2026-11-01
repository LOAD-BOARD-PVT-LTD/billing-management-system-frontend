import { afterEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readVehicleResource } from '@/features/billing/api/vehicle-resource.api';
import { createMemberVehicleBlacklist } from '@/features/vehicle/blacklist/api/vehicle-blacklist.api';
import { apiClient } from '@/lib/api/client';

function resource(id: string, vehicleId: string, vehicleNumber: string) {
  return {
    id,
    resource_name: 'VehicleResource',
    inner_content: {
      VehicleId: vehicleId,
      VehicleNumber: vehicleNumber,
    },
    external_content: null,
  };
}

describe('VehicleResource identity lookup', () => {
  const originalGet = apiClient.get;
  const originalPut = apiClient.put;

  afterEach(() => {
    apiClient.get = originalGet;
    apiClient.put = originalPut;
  });

  test('resolves directly by TQMS VehicleId without an active-only TQMS search', async () => {
    const calls: string[] = [];
    apiClient.get = async <T>(path: string): Promise<T> => {
      calls.push(String(path));
      return JSON.parse(JSON.stringify([resource('resource-773', '773', 'BA-09-KHA-5555')]));
    };

    const result = await readVehicleResource('773', 'BA-09-KHA-5555');

    assert.equal(result.id, 'resource-773');
    assert.deepEqual(calls, ['search/VehicleResource/VehicleId/773/all']);
  });

  test('falls back to a unique normalized vehicle-number match when the ID differs', async () => {
    apiClient.get = async <T>(path: string): Promise<T> => {
      if (String(path).includes('/VehicleId/')) {
        throw new Error('Request failed (404): No resources found for search query');
      }
      return JSON.parse(JSON.stringify([resource('resource-774', '774', 'BA 09 KHA 5555')]));
    };

    const result = await readVehicleResource('773', 'BA-09-KHA-5555');

    assert.equal(result.id, 'resource-774');
    assert.equal(result.innerContent.VehicleId, '774');
  });

  test('supports lookup by vehicle number alone', async () => {
    apiClient.get = async <T>(path: string): Promise<T> => {
      assert.equal(String(path), 'search/VehicleResource/VehicleNumber/BA-09-KHA-5555/all');
      return JSON.parse(JSON.stringify([resource('resource-774', '774', 'BA-09-KHA-5555')]));
    };

    const result = await readVehicleResource('', 'BA-09-KHA-5555');

    assert.equal(result.innerContent.VehicleId, '774');
  });

  test('falls back to the VehicleResource list when field searches miss an existing bill vehicle', async () => {
    apiClient.get = async <T>(path: string): Promise<T> => {
      if (String(path) === 'read/VehicleResource/all') {
        return JSON.parse(JSON.stringify([
          resource('resource-63646', '63646', 'Ba Pra-03-001-KHA-5642'),
        ]));
      }
      throw new Error('Request failed (404): No resources found for search query');
    };

    const result = await readVehicleResource('63646', 'Ba Pra-03-001-KHA-5642');

    assert.equal(result.id, 'resource-63646');
  });

  test('uses the exact vehicle number to disambiguate duplicate VehicleId search results', async () => {
    apiClient.get = async <T>(path: string): Promise<T> => {
      if (String(path).includes('/VehicleId/')) {
        return JSON.parse(JSON.stringify([
          resource('resource-1', '35903', 'Different-Plate'),
          resource('resource-2', '35903', 'Province-3-53-01-0-2256'),
        ]));
      }
      return JSON.parse(JSON.stringify([
        [resource('resource-2', '35903', 'Province-3-53-01-0-2256')],
        1,
      ]));
    };

    const result = await readVehicleResource('35903', 'Province-3-53-01-0-2256');

    assert.equal(result.id, 'resource-2');
  });

  test('rejects ambiguous vehicle-number matches instead of updating an arbitrary resource', async () => {
    apiClient.get = async <T>(path: string): Promise<T> => {
      if (String(path).includes('/VehicleId/')) {
        throw new Error('Request failed (404): No resources found for search query');
      }
      return JSON.parse(JSON.stringify([
        resource('resource-774', '774', 'BA-09-KHA-5555'),
        resource('resource-775', '775', 'BA 09 KHA 5555'),
      ]));
    };

    await assert.rejects(
      readVehicleResource('773', 'BA-09-KHA-5555'),
      /Multiple VehicleResource records matched/u,
    );
  });

  test('writes blacklist status where the blacklist search can find it', async () => {
    let updatedInnerContent: Record<string, unknown> | undefined;
    apiClient.get = async <T>(): Promise<T> => (
      JSON.parse(JSON.stringify([resource('resource-773', '773', 'BA-09-KHA-5555')]))
    );
    apiClient.put = async <T>(_path: string, body?: unknown): Promise<T> => {
      const request = body as { inner_content: Record<string, unknown> };
      updatedInnerContent = request.inner_content;
      return undefined as T;
    };

    await createMemberVehicleBlacklist({
      vehicleId: '773',
      vehicleNumber: 'BA-09-KHA-5555',
      blacklistedReason: 'Test',
      at: '2026-10-30T10:00:00.000Z',
      performedBy: null,
    });

    assert.equal(updatedInnerContent?.isBlacklisted, true);
    assert.equal(
      (updatedInnerContent?.metadata as Record<string, unknown>).isBlacklisted,
      true,
    );
  });
});
