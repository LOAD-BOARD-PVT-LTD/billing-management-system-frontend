export const billingRulesKeys = {
  all: ['billing-rules'] as const,
  config: () => [...billingRulesKeys.all, 'config'] as const,
  detail: (id: string) => [...billingRulesKeys.all, 'detail', id] as const,
};

export const billingKeys = {
  all: ['billing'] as const,
  tqmsVehicleSearch: (vehicleNumber: string) => [...billingKeys.all, 'tqms-vehicle-search', vehicleNumber] as const,
  tqmsVehicleDetails: (vehicleNumber: string) => [...billingKeys.all, 'tqms-vehicle-details', vehicleNumber] as const,
};

export const receiptsKeys = {
  all: ['receipts'] as const,
  lists: () => [...receiptsKeys.all, 'list'] as const,
};

export const settingsKeys = {
  all: ['settings'] as const,
  receiptCancelWindow: () => [...settingsKeys.all, 'receipt-cancel-window'] as const,
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

export const tqmsMemberRegistryKeys = {
  all: ['tqms-member-registry'] as const,
  lists: () => [...tqmsMemberRegistryKeys.all, 'vehicles'] as const,
};

export const vehicleBlacklistKeys = {
  all: ['vehicle-blacklist'] as const,
  list: () => [...vehicleBlacklistKeys.all, 'list'] as const,
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
  globalSearch: globalSearchKeys,
};
