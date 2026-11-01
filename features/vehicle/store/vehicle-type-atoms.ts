'use client';

import { atom } from 'jotai';
import type { TqmsVehicleTypeOption } from '@/features/vehicle/mappings/tqms-vehicle-type/types/tqms-vehicle-type.types';
import type { VehicleTypeRecord } from '@/features/vehicle/type/types/vehicle-type.types';

/**
 * @deprecated Redundant dual-store atom. Components should consume `useTqmsVehicleTypes()` query data directly.
 */
export const tqmsVehicleTypesAtom = atom<TqmsVehicleTypeOption[]>([]);

/**
 * @deprecated Redundant dual-store atom. Components should consume `useVehicleTypes()` query records directly.
 */
export const billingVehicleTypesAtom = atom<VehicleTypeRecord[]>([]);
