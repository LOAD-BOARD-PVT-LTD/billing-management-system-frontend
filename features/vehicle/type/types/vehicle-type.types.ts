export type VehicleCategoryResourceResponse = {
  id: number | string;
  resource_name: string;
  inner_content: {
    category: string;
    category_name?: string;
    vehicle_types: string[];
  };
  external_content: unknown | null;
};

export type VehicleCategoryCreateRequest = {
  inner_content: {
    category: string;
    vehicle_types: string[];
  };
};

export type VehicleCategoryCreateInput = {
  category: string;
  selectedTypeIds: string[];
};

export type VehicleCategoryUpdateInput = {
  categoryName: string;
  vehicleTypes: string[];
};

export type VehicleCategoryUpdateRequest = {
  id: number | string;
  resource_name: 'VehicleCategoryResource';
  inner_content: {
    category_name: string;
    vehicle_types: string[];
  };
  external_content: null;
};

export type VehicleTypeRecord = {
  id: string;
  category: string;
  vehicleTypes: string[];
};

export type VehicleTypeDraft = {
  category: string;
  selectedTypeIds: string[];
};

export type VehicleTypeFormSubmission = VehicleTypeDraft;

export type VehicleTypeFormValues = VehicleTypeDraft;
