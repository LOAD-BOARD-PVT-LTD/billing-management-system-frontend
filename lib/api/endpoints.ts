export type ResourceId = string | number;

export interface ResourceEndpoints {
  list: () => string;
  read: (id: ResourceId) => string;
  create: () => string;
  update: (id: ResourceId) => string;
  delete: (id: ResourceId) => string;
  search: (field: string, value: string, limit?: number | 'all') => string;
}

export function resourceEndpoints(resourceName: string): ResourceEndpoints {
  const pathName = encodeURIComponent(resourceName);

  return {
    list: () => `read/${pathName}/all`,
    read: (id) => `read/${pathName}/${encodeURIComponent(String(id))}`,
    create: () => `create/${pathName}`,
    update: (id) => `update/${pathName}/${encodeURIComponent(String(id))}`,
    delete: (id) => `delete/${pathName}/${encodeURIComponent(String(id))}`,
    search: (field, value, limit = 'all' ) => [
      'search',
      encodeURIComponent(resourceName),
      encodeURIComponent(field),
      encodeURIComponent(value),
      encodeURIComponent(String(limit)),
    ].join('/'),
  };
}

function fiscalYearEndpoint(path: string, fiscalYear?: string): string {
  return fiscalYear
    ? `${path}/${encodeURIComponent(fiscalYear)}`
    : path;
}

function memberStatisticEndpoints(prefix: string) {
  return {
    all: (fiscalYear?: string) => fiscalYearEndpoint(prefix, fiscalYear),
    totalUsers: (fiscalYear?: string) => fiscalYearEndpoint(`${prefix}/total_users`, fiscalYear),
    total: (fiscalYear?: string) => fiscalYearEndpoint(`${prefix}/total`, fiscalYear),
    totalActiveUsers: (fiscalYear?: string) => fiscalYearEndpoint(`${prefix}/total_active_users`, fiscalYear),
    active: (fiscalYear?: string) => fiscalYearEndpoint(`${prefix}/active`, fiscalYear),
    newUsers: (fiscalYear?: string) => fiscalYearEndpoint(`${prefix}/new_users`, fiscalYear),
    new: (fiscalYear?: string) => fiscalYearEndpoint(`${prefix}/new`, fiscalYear),
    displacedUsers: (fiscalYear?: string) => fiscalYearEndpoint(`${prefix}/displaced_users`, fiscalYear),
    displaced: (fiscalYear?: string) => fiscalYearEndpoint(`${prefix}/displaced`, fiscalYear),
    inactiveYear: (fiscalYear?: string) => fiscalYearEndpoint(`${prefix}/inactive_year`, fiscalYear),
    totalInactiveUsers: (fiscalYear?: string) => fiscalYearEndpoint(`${prefix}/total_inactive_users`, fiscalYear),
    inactive: (fiscalYear?: string) => fiscalYearEndpoint(`${prefix}/inactive`, fiscalYear),
  };
}

export const endpoints = {
  resources: {
    billingEntity: resourceEndpoints('BillingEntityResource'),
    billingRule: resourceEndpoints('BillingRuleResource'),
    bill: resourceEndpoints('BillResource'),
    member: resourceEndpoints('MemberResource'),
    branch: resourceEndpoints('BranchResource'),
    setting: resourceEndpoints('SettingResource'),
    user: resourceEndpoints('UserResource'),
    vehicle: resourceEndpoints('VehicleResource'),
    vehicleCategory: resourceEndpoints('VehicleCategoryResource'),
  },
  auth: {
    login: 'auth/login',
  },
  tqms: {
    searchVehicles: 'tqms/search',
    vehicleDetails: (vehicleNumber: string) => (
      `tqms/vehicle_details/${encodeURIComponent(vehicleNumber)}`
    ),
    vehicleTypes: 'read_all/VehicleTypes',
    syncVehicleTypes: 'tqms/sync',
  },
  dashboard: {
    statistics: (fiscalYear?: string) => fiscalYearEndpoint('dashboard/statistics', fiscalYear),
    members: memberStatisticEndpoints('dashboard/members'),
  },
  members: memberStatisticEndpoints('members'),
  internal: {
    globalSearch: (query: string) => `/api/search?q=${encodeURIComponent(query)}`,
  },
} as const;
