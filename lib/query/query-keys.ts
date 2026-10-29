export const billingRulesKeys = {
  all: ['billing-rules'] as const,
  config: () => [...billingRulesKeys.all, 'config'] as const,
  detail: (id: string) => [...billingRulesKeys.all, 'detail', id] as const,
};

export const billingKeys = {
  all: ['billing'] as const,
  tqmsVehicleSearch: (vehicleNumber: string, branchName = '') => [...billingKeys.all, 'tqms-vehicle-search', vehicleNumber, branchName] as const,
  tqmsVehicleDetails: (vehicleNumber: string) => [...billingKeys.all, 'tqms-vehicle-details', vehicleNumber] as const,
};

export const receiptsKeys = {
  all: ['receipts'] as const,
  lists: () => [...receiptsKeys.all, 'list'] as const,
};

export const settingsKeys = {
  all: ['settings'] as const,
  receiptCancelWindow: () => [...settingsKeys.all, 'receipt-cancel-window'] as const,
  linkedFeeRules: () => [...settingsKeys.all, 'linked-fee-rules'] as const,
  tqmsSanghBranchFilter: () => [...settingsKeys.all, 'tqms-sangh-branch-filter'] as const,
  fiscalYearSelector: () => [...settingsKeys.all, 'fiscal-year-selector'] as const,
  fiscalYearManagement: () => [...settingsKeys.all, 'fiscal-year-management'] as const,
};

export const vehicleTypeKeys = {
  all: ['vehicle-types'] as const,
  lists: () => [...vehicleTypeKeys.all, 'list'] as const,
};

export const tqmsVehicleTypeKeys = {
  all: ['tqms-vehicle-types'] as const,
  lists: () => [...tqmsVehicleTypeKeys.all, 'list'] as const,
};

export const vehicleResourceKeys = {
  all: ['vehicle-resources'] as const,
  list: () => [...vehicleResourceKeys.all, 'list'] as const,
  memberVehicleList: (branchName = '') => [...vehicleResourceKeys.all, 'member-list', branchName] as const,
  tqmsMemberRegistry: (branchName = '') => [...vehicleResourceKeys.all, 'tqms-member-registry', branchName] as const,
  search: (field: string, value: string, limit: number | 'all' = 'all') => (
    [...vehicleResourceKeys.all, 'search', field, value, String(limit)] as const
  ),
};

export const tqmsMemberRegistryKeys = {
  all: vehicleResourceKeys.all,
  lists: (branchName = '') => vehicleResourceKeys.tqmsMemberRegistry(branchName),
};

export const vehicleBlacklistKeys = {
  all: vehicleResourceKeys.all,
  list: (branchName = '') => vehicleResourceKeys.search('isBlacklisted', `true:${branchName}`),
};

export const globalSearchKeys = {
  all: ['global-search'] as const,
  search: (term: string) => [...globalSearchKeys.all, term] as const,
};

export const queryKeys = {
  billing: billingKeys,
  billingRules: billingRulesKeys,
  receipts: receiptsKeys,
  settings: settingsKeys,
  vehicleTypes: vehicleTypeKeys,
  tqmsVehicleTypes: tqmsVehicleTypeKeys,
  tqmsMemberRegistry: tqmsMemberRegistryKeys,
  vehicleBlacklist: vehicleBlacklistKeys,
  vehicleResources: vehicleResourceKeys,
  globalSearch: globalSearchKeys,
};
