import { z } from 'zod';

import type {
  VehicleCategoryResourceResponse,
  VehicleCategoryUpdateRequest,
  VehicleTypeRecord,
} from '@/features/vehicle/type/types/vehicle-type.types';
import type { VehicleTypeFormValues } from '@/features/vehicle/type/types/vehicle-type.types';

const vehicleCategoryInnerContentSchema = z
  .object({
    category: z.string().trim().min(1).optional(),
    category_name: z.string().trim().min(1).optional(),
    vehicle_types: z.array(z.string().trim()).optional().default([]),
  })
  .transform((value) => {
    const category = value.category ?? value.category_name;

    if (!category) {
      throw new Error('Vehicle category name is required.');
    }

    return {
      category,
      vehicle_types: (value.vehicle_types ?? []).map((vehicleType) => vehicleType.trim()).filter(Boolean),
    };
  });

export const vehicleCategoryResourceResponseSchema = z.object({
  id: z.union([z.number(), z.string().trim().min(1)]),
  resource_name: z.string().trim().min(1),
  inner_content: vehicleCategoryInnerContentSchema,
  external_content: z.unknown().nullable(),
});

export const vehicleCategoryListResponseSchema = z.array(vehicleCategoryResourceResponseSchema);

export const vehicleCategoryCreateRequestSchema = z.object({
  inner_content: z.object({
    category: z.string().trim().min(1, 'सवारी श्रेणी आवश्यक छ।'),
    vehicle_types: z.array(z.string().trim().min(1)).min(1, 'कम्तिमा एउटा TQMS प्रकार चयन गर्नुहोस्।'),
  }),
});

export const vehicleCategoryUpdateRequestSchema = z.object({
  id: z.union([z.number().int().positive(), z.string().trim().min(1)]),
  resource_name: z.literal('VehicleCategoryResource'),
  inner_content: z.object({
    category_name: z.string().trim().min(1, 'सवारी श्रेणी आवश्यक छ।'),
    vehicle_types: z.array(z.string().trim().min(1)),
  }),
  external_content: z.null(),
});

export function parseVehicleCategoryUpdateRequest(value: unknown): VehicleCategoryUpdateRequest {
  const result = vehicleCategoryUpdateRequestSchema.safeParse(value);
  if (!result.success) {
    const details = result.error.issues[0]?.message ?? 'Invalid update request';
    throw new Error(`Invalid vehicle category update: ${details}`);
  }

  return result.data;
}

export function parseVehicleCategoryListResponse(value: unknown): VehicleTypeRecord[] {
  const result = vehicleCategoryListResponseSchema.safeParse(value);
  if (!result.success) {
    const details = result.error.issues[0]?.message ?? 'Invalid response format';
    throw new Error(`Could not read vehicle categories: ${details}`);
  }

  return result.data.map((resource) => ({
    id: String(resource.id),
    category: resource.inner_content.category,
    vehicleTypes: resource.inner_content.vehicle_types.map((vehicleType) => vehicleType.trim()).filter(Boolean),
  }));
}

export function parseVehicleCategoryCreateResponse(value: unknown): VehicleCategoryResourceResponse {
  const result = vehicleCategoryResourceResponseSchema.safeParse(value);
  if (!result.success) {
    const details = result.error.issues[0]?.message ?? 'Invalid response format';
    throw new Error(`Vehicle category was created, but the response was invalid: ${details}`);
  }

  return result.data;
}

export function validateVehicleTypeForm(values: VehicleTypeFormValues) {
  const errors: Partial<Record<'category' | 'selectedTypeIds' | 'code', string>> = {};

  const category = values.category.trim();

  if (!category) {
    errors.category = 'सवारी श्रेणी आवश्यक छ।';
  }

  if (!values.selectedTypeIds.length) {
    errors.selectedTypeIds = 'कम्तिमा एउटा TQMS प्रकार चयन गर्नुहोस्।';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
