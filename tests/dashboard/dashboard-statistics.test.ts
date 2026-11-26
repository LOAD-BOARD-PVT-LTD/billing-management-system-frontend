import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchDashboardStatistics } from '@/features/dashboard/services/dashboard-statistics.service';
import { apiClient } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';

const originalGet = apiClient.get;

afterEach(() => {
  apiClient.get = originalGet;
});

test('uses the fiscal-year dashboard summary when it contains member statistics', async () => {
  const paths: string[] = [];
  apiClient.get = async <T>(path: string): Promise<T> => {
    paths.push(path);
    return {
      data: {
        total_users: '120',
        total_active_users: 90,
        new_users: 12,
        total_inactive_users: 20,
        displaced_users: 3,
      },
    } as T;
  };

  const statistics = await fetchDashboardStatistics('2083/84');

  assert.deepEqual(paths, [endpoints.dashboard.statistics('2083/84')]);
  assert.deepEqual(statistics, {
    members: 120,
    activeMembers: 90,
    newSubscriptions: 12,
    inactiveMembers: 20,
    displacedMembers: 3,
  });
});

test('falls back to dashboard member count endpoints when summary fields are absent', async () => {
  const paths: string[] = [];
  apiClient.get = async <T>(path: string): Promise<T> => {
    paths.push(path);
    if (path === endpoints.dashboard.statistics()) return { data: {} } as T;
    return { count: paths.length } as T;
  };

  const statistics = await fetchDashboardStatistics();

  assert.deepEqual(paths, [
    endpoints.dashboard.statistics(),
    endpoints.dashboard.members.totalUsers(),
    endpoints.dashboard.members.totalActiveUsers(),
    endpoints.dashboard.members.newUsers(),
    endpoints.dashboard.members.totalInactiveUsers(),
    endpoints.dashboard.members.displacedUsers(),
  ]);
  assert.deepEqual(statistics, {
    members: 2,
    activeMembers: 3,
    newSubscriptions: 4,
    inactiveMembers: 5,
    displacedMembers: 6,
  });
});

test('falls through documented aliases only when the preferred count route is not found', async () => {
  const paths: string[] = [];
  apiClient.get = async <T>(path: string): Promise<T> => {
    paths.push(path);
    if (path === endpoints.dashboard.statistics()) return {} as T;
    if (path === endpoints.dashboard.members.totalUsers()) {
      throw new Error('Request failed (404): Not found');
    }
    return { total: 25 } as T;
  };

  const statistics = await fetchDashboardStatistics();

  assert.equal(statistics.members, 25);
  assert.ok(paths.includes(endpoints.dashboard.members.total()));
});
