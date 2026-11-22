import { apiClient } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import {
  dashboardMemberMetrics,
  type DashboardMemberMetric,
  type DashboardMemberMetricKey,
} from '@/features/dashboard/data/dashboard-statistics';

export type DashboardStatistics = Record<DashboardMemberMetricKey, number>;

type RecordValue = Record<string, unknown>;

function asRecord(value: unknown): RecordValue | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as RecordValue
    : null;
}

function normalizeKey(value: string): string {
  return value.replace(/[^a-z0-9]/giu, '').toLowerCase();
}

function findNamedValue(
  value: unknown,
  keys: string[],
  depth = 0,
): unknown {
  if (depth > 6) return undefined;
  const record = asRecord(value);
  if (!record) return undefined;
  const expectedKeys = new Set(keys.map(normalizeKey));
  for (const [key, nested] of Object.entries(record)) {
    if (expectedKeys.has(normalizeKey(key))) return nested;
  }
  for (const key of ['data', 'result', 'statistics', 'members', 'items']) {
    const nestedValue = record[key];
    if (nestedValue !== undefined) {
      const found = findNamedValue(nestedValue, keys, depth + 1);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

function toCount(value: unknown, metric: DashboardMemberMetric, depth = 0): number | null {
  if (depth > 6) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  const record = asRecord(value);
  if (!record) return null;
  const nested = findNamedValue(record, [...metric.responseKeys, 'count', 'value', 'total']);
  return nested === undefined ? null : toCount(nested, metric, depth + 1);
}

function unwrap(value: unknown, depth = 0): unknown {
  if (depth > 6) return value;
  const record = asRecord(value);
  if (!record) return value;
  for (const key of ['data', 'result', 'statistics', 'members']) {
    if (record[key] !== undefined) return unwrap(record[key], depth + 1);
  }
  return value;
}

function isNotFound(error: unknown): error is Error {
  return error instanceof Error && /Request failed \(404\)/iu.test(error.message);
}

function getMemberMetricPaths(metric: DashboardMemberMetric, fiscalYear?: string): string[] {
  switch (metric.key) {
    case 'members':
      return [
        endpoints.dashboard.members.totalUsers(fiscalYear),
        endpoints.dashboard.members.total(fiscalYear),
        endpoints.members.totalUsers(fiscalYear),
        endpoints.members.total(fiscalYear),
      ];
    case 'activeMembers':
      return [
        endpoints.dashboard.members.totalActiveUsers(fiscalYear),
        endpoints.dashboard.members.active(fiscalYear),
        endpoints.members.totalActiveUsers(fiscalYear),
        endpoints.members.active(fiscalYear),
      ];
    case 'newSubscriptions':
      return [
        endpoints.dashboard.members.newUsers(fiscalYear),
        endpoints.dashboard.members.new(fiscalYear),
        endpoints.members.newUsers(fiscalYear),
        endpoints.members.new(fiscalYear),
      ];
    case 'inactiveMembers':
      return [
        endpoints.dashboard.members.totalInactiveUsers(fiscalYear),
        endpoints.dashboard.members.inactive(fiscalYear),
        endpoints.dashboard.members.inactiveYear(fiscalYear),
        endpoints.members.totalInactiveUsers(fiscalYear),
        endpoints.members.inactive(fiscalYear),
        endpoints.members.inactiveYear(fiscalYear),
      ];
    case 'displacedMembers':
      return [
        endpoints.dashboard.members.displacedUsers(fiscalYear),
        endpoints.dashboard.members.displaced(fiscalYear),
        endpoints.members.displacedUsers(fiscalYear),
        endpoints.members.displaced(fiscalYear),
      ];
  }
}

async function fetchMemberMetric(
  metric: DashboardMemberMetric,
  fiscalYear: string | undefined,
  signal?: AbortSignal,
): Promise<number> {
  const paths = getMemberMetricPaths(metric, fiscalYear);
  let lastNotFound: Error | null = null;
  for (const path of paths) {
    try {
      const payload = await apiClient.get<unknown>(path, { signal });
      const count = toCount(unwrap(payload), metric);
      if (count === null) {
        throw new Error(`Dashboard ${metric.key} endpoint returned an unsupported response.`);
      }
      return count;
    } catch (error) {
      if (!isNotFound(error)) throw error;
      lastNotFound = error;
    }
  }
  throw lastNotFound ?? new Error(`No API endpoint is configured for dashboard metric ${metric.key}.`);
}

export async function fetchDashboardStatistics(
  fiscalYear?: string,
  signal?: AbortSignal,
): Promise<DashboardStatistics> {
  const normalizedFiscalYear = fiscalYear?.trim() || undefined;
  const summary = await apiClient.get<unknown>(
    endpoints.dashboard.statistics(normalizedFiscalYear),
    { signal },
  );
  const summaryValues = unwrap(summary);
  const counts = await Promise.all(dashboardMemberMetrics.map(async (metric) => {
    const summaryValue = findNamedValue(summaryValues, metric.responseKeys);
    const summaryCount = summaryValue === undefined ? null : toCount(summaryValue, metric);
    const count = summaryCount ?? await fetchMemberMetric(metric, normalizedFiscalYear, signal);
    return [metric.key, count] as const;
  }));
  return Object.fromEntries(counts) as DashboardStatistics;
}
