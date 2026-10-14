import type { VehicleTypeRecord } from '@/features/vehicle/type/types/vehicle-type.types';
import type {
  VehicleCategoryCreateInput,
  VehicleCategoryCreateRequest,
  VehicleCategoryUpdateInput,
} from '@/features/vehicle/type/types/vehicle-type.types';
import { apiClient } from '@/lib/api/client';
import {
  parseVehicleCategoryCreateResponse,
  parseVehicleCategoryListResponse,
  parseVehicleCategoryUpdateRequest,
  vehicleCategoryCreateRequestSchema,
} from '@/features/vehicle/type/schemas/vehicle-type.schema';

export async function fetchVehicleTypes(): Promise<VehicleTypeRecord[]> {
  const payload = await apiClient.get<unknown>('read/VehicleCategoryResource/all');
  return parseVehicleCategoryListResponse(payload);
}

export async function createVehicleType(payload: VehicleCategoryCreateInput): Promise<VehicleTypeRecord> {
  const requestBody: VehicleCategoryCreateRequest = vehicleCategoryCreateRequestSchema.parse({
    inner_content: {
      category: payload.category,
      vehicle_types: payload.selectedTypeIds,
    },
  });

  const payloadFromServer = await apiClient.post<unknown>('create/VehicleCategoryResource', requestBody);
  const resource = parseVehicleCategoryCreateResponse(payloadFromServer);

  return {
    id: String(resource.id),
    category: resource.inner_content.category,
    vehicleTypes: resource.inner_content.vehicle_types.map((vehicleType) => vehicleType.trim()).filter(Boolean),
  };
}

export async function updateVehicleType(id: string | number, payload: VehicleCategoryUpdateInput): Promise<void> {
  const normalizedId = typeof id === 'number' ? id : /^\d+$/u.test(id) ? Number(id) : id;
  const requestBody = parseVehicleCategoryUpdateRequest({
    id: normalizedId,
    resource_name: 'VehicleCategoryResource',
    inner_content: {
      category_name: payload.categoryName,
      vehicle_types: payload.vehicleTypes,
    },
    external_content: null,
  });

  await apiClient.put<void>(`update/VehicleCategoryResource/${encodeURIComponent(String(id))}`, requestBody);
}
