'use client';

import { useMemo } from 'react';
import { useTqmsVehicleTypes } from '@/features/vehicle/mappings/tqms-vehicle-type/hooks/useTqmsVehicleTypes';
import { useVehicleTypes } from '@/features/vehicle/type/hooks/useVehicleTypes';
import type { VehicleTypeRecord } from '@/features/vehicle/type/types/vehicle-type.types';
import type { BillingVehicle } from '../model/types';

export type VehicleCategoryMappingState = 'checking' | 'mapped' | 'not_mapped' | 'error';

function normalize(value: string) {
	return value.trim().replace(/\s+/gu, ' ').toLocaleLowerCase();
}

export function useVehicleCategoryMapping(vehicle: BillingVehicle) {
	const {
		records: categories,
		isLoading: isLoadingCategories,
		isSaving,
		loadError: categoryLoadError,
		reload: reloadCategories,
		update,
	} = useVehicleTypes();
	const {
		data: tqmsTypes,
		isLoading: isLoadingTqmsTypes,
		loadError: tqmsLoadError,
		reload: reloadTqmsTypes,
		sync: syncTqmsTypes,
	} = useTqmsVehicleTypes(true);

	const tqmsType = useMemo(() => {
		if (vehicle.tqmsVehicleTypeId) {
			return tqmsTypes.find((type) => normalize(type.id) === normalize(vehicle.tqmsVehicleTypeId)) ?? null;
		}

		const vehicleTypeName = normalize(vehicle.vehicleType);
		return tqmsTypes.find((type) =>
			[ type.name, type.code ].some((value) => normalize(value) === vehicleTypeName),
		) ?? null;
	}, [tqmsTypes, vehicle.tqmsVehicleTypeId, vehicle.vehicleType]);

	const mappedCategory = useMemo(() => {
		if (!tqmsType) return null;
		return categories.find((category) =>
			category.vehicleTypes.some((mappedType) => normalize(mappedType) === normalize(tqmsType.id)),
		) ?? null;
	}, [categories, tqmsType]);

	const isChecking = isLoadingCategories || isLoadingTqmsTypes;
	const error = categoryLoadError
		? `बिलिङ सवारी श्रेणी लोड गर्न सकिएन: ${categoryLoadError}`
		: tqmsLoadError
			? `TQMS सवारी प्रकार लोड गर्न सकिएन: ${tqmsLoadError}`
			: !isChecking && !tqmsType
				? `“${vehicle.vehicleType}” सवारी प्रकारको TQMS ID भेटिएन। TQMS प्रकार सूची सिंक गर्नुहोस्।`
				: null;
	const state: VehicleCategoryMappingState = isChecking
		? 'checking'
		: error
			? 'error'
			: mappedCategory
				? 'mapped'
				: 'not_mapped';

	const mapToCategory = async (category: VehicleTypeRecord) => {
		if (!tqmsType) {
			throw new Error('यो सवारीको TQMS प्रकार पुष्टि नभएसम्म नक्साङ्कन गर्न सकिँदैन।');
		}

		const assignedCategory = categories.find((candidate) =>
			candidate.id !== category.id
			&& candidate.vehicleTypes.some((mappedType) => normalize(mappedType) === normalize(tqmsType.id)),
		);
		if (assignedCategory) {
			throw new Error(`यो TQMS प्रकार पहिले नै ${assignedCategory.category} श्रेणीमा म्याप गरिएको छ।`);
		}

		await update(category.id, {
			categoryName: category.category,
			vehicleTypes: [...new Set([...category.vehicleTypes, tqmsType.id])],
		});

		const refreshed = await reloadCategories();
		const mappingIsSaved = refreshed.data?.some((record) =>
			record.vehicleTypes.some((typeId) => normalize(typeId) === normalize(tqmsType.id)),
		);
		if (!mappingIsSaved) {
			throw new Error('नक्साङ्कन सुरक्षित भएको पुष्टि हुन सकेन। श्रेणी पुनः लोड गरेर फेरि जाँच गर्नुहोस्।');
		}
	};

	return {
		state,
		error,
		categories,
		tqmsType,
		mappedCategory,
		isSaving,
		reloadCategories,
		reloadTqmsTypes,
		syncTqmsTypes,
		mapToCategory,
	};
}
