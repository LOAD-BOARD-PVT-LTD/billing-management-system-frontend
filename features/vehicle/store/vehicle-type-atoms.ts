'use client';

import { atom } from 'jotai';
import type { TqmsVehicleTypeOption } from '@/features/vehicle/mappings/tqms-vehicle-type/types/tqms-vehicle-type.types';
import type { VehicleTypeRecord } from '@/features/vehicle/type/types/vehicle-type.types';

export const tqmsVehicleTypesAtom = atom<TqmsVehicleTypeOption[]>([]);
export const billingVehicleTypesAtom = atom<VehicleTypeRecord[]>([]);
