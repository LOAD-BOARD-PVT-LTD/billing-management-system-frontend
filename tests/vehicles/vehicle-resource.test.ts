import { afterEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readVehicleResource } from '@/features/billing/api/vehicle-resource.api';
import {
  createMemberVehicleBlacklist,
  fetchVehicleBlacklist,
} from '@/features/vehicle/blacklist/api/vehicle-blacklist.api';
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

  test('updates the newest resource when a vehicle ID has historical snapshots', async () => {
    let updatedPath = '';
    let updatedInnerContent: Record<string, unknown> | undefined;
    const blacklistedHistory = resource('6305', '36002', 'Ga Pra-15-23-KHA-5555');
    const currentResource = resource('6341', '36002', 'Province-4-15-23-KHA-5555');
    const history = [
      {
        ...blacklistedHistory,
        inner_content: { ...blacklistedHistory.inner_content, isBlacklisted: true },
      },
      resource('6299', '36002', 'Province-4-15-23-KHA-5555'),
      resource('4112', '36002', 'Province-4-15-23-KHA-5555'),
      {
        ...currentResource,
        inner_content: {
          ...currentResource.inner_content,
          VehicleType: 'Container 6 Wheeler 20 ft',
        },
        external_content: { createdTime: '2026-11-03T11:33:15Z' },
      },
    ];
    apiClient.get = async <T>(): Promise<T> => JSON.parse(JSON.stringify([history, history.length]));
    apiClient.put = async <T>(path: string, body?: unknown): Promise<T> => {
      updatedPath = path;
      updatedInnerContent = (body as { inner_content: Record<string, unknown> }).inner_content;
      return undefined as T;
    };

    await createMemberVehicleBlacklist({
      vehicleId: '36002',
      vehicleNumber: 'Ga Pra-15-23-KHA-5555',
      blacklistedReason: 'Test',
      at: '2026-11-06T10:00:00.000Z',
      performedBy: null,
    });

    assert.equal(updatedPath, 'update/VehicleResource/6341');
    assert.equal(updatedInnerContent?.VehicleType, 'Container 6 Wheeler 20 ft');
    assert.equal(updatedInnerContent?.isBlacklisted, true);
  });

  test('uses the highest numeric resource ID when history records lack timestamps', async () => {
    apiClient.get = async <T>(): Promise<T> => JSON.parse(JSON.stringify([
      resource('6299', '36002', 'Ga Pra-15-23-KHA-5555'),
      resource('6341', '36002', 'Ga Pra-15-23-KHA-5555'),
    ]));

    const result = await readVehicleResource('36002', 'Ga Pra-15-23-KHA-5555');

    assert.equal(result.id, '6341');
  });

  test('keeps historical blacklisted vehicles in the list while updates target the current snapshot', async () => {
    const oldBlacklistedResource = resource('6305', '36002', 'Ga Pra-15-23-KHA-5555');
    const oldSnapshot = {
      ...oldBlacklistedResource,
      inner_content: {
        ...oldBlacklistedResource.inner_content,
        isBlacklisted: true,
        metadata: {
          isBlacklisted: true,
          blacklistedAt: '2026-11-02T15:52:22.356Z',
          tags: ['blacklisted'],
        },
      },
    };
    const currentResourceBase = resource('6341', '36002', 'Ga Pra-15-23-KHA-5555');
    const currentSnapshot = {
      ...currentResourceBase,
      inner_content: {
        ...currentResourceBase.inner_content,
        VehicleType: 'Container 6 Wheeler 20 ft',
      },
      external_content: { createdTime: '2026-11-03T11:33:15Z' },
    };
    apiClient.get = async <T>(path: string): Promise<T> => {
      if (path === 'search/VehicleResource/isBlacklisted/true/all') {
        return JSON.parse(JSON.stringify([[oldSnapshot], 1]));
      }
      assert.equal(path, 'read/VehicleResource/all');
      return JSON.parse(JSON.stringify([[currentSnapshot], 1]));
    };

    const records = await fetchVehicleBlacklist();

    assert.equal(records.length, 1);
    assert.equal(records[0].id, '6305');
    assert.equal(records[0].isBlacklisted, true);

    apiClient.get = async <T>(): Promise<T> => JSON.parse(JSON.stringify([
      oldSnapshot,
      currentSnapshot,
    ]));
    const updatedResource = await readVehicleResource('36002', 'Ga Pra-15-23-KHA-5555');
    assert.equal(updatedResource.id, '6341');
  });

  test('hides a historical blacklist after the current resource explicitly removes it', async () => {
    const historicalResource = resource('6305', '36002', 'Ga Pra-15-23-KHA-5555');
    const oldSnapshot = {
      ...historicalResource,
      inner_content: {
        ...historicalResource.inner_content,
        isBlacklisted: true,
        metadata: {
          isBlacklisted: true,
          blacklistedAt: '2026-11-02T15:52:22.356Z',
          tags: ['blacklisted'],
        },
      },
    };
    const currentResourceBase = resource('6341', '36002', 'Ga Pra-15-23-KHA-5555');
    const currentResource = {
      ...currentResourceBase,
      inner_content: {
        ...currentResourceBase.inner_content,
        isBlacklisted: false,
      },
    };
    apiClient.get = async <T>(path: string): Promise<T> => {
      if (path === 'search/VehicleResource/isBlacklisted/true/all') {
        return JSON.parse(JSON.stringify([[oldSnapshot], 1]));
      }
      assert.equal(path, 'read/VehicleResource/all');
      return JSON.parse(JSON.stringify([[oldSnapshot, currentResource], 2]));
    };

    const records = await fetchVehicleBlacklist();

    assert.deepEqual(records, []);
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
      undefined,
    );
  });
});
