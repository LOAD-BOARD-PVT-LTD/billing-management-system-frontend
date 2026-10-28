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
  internal: {
    globalSearch: (query: string) => `/api/search?q=${encodeURIComponent(query)}`,
  },
} as const;
