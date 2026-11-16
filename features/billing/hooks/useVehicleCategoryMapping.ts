'use client';

import { useMemo } from 'react';
import { useTqmsVehicleTypes } from '@/features/vehicle/mappings/tqms-vehicle-type/hooks/useTqmsVehicleTypes';
import { useVehicleTypes } from '@/features/vehicle/type/hooks/useVehicleTypes';
import type { VehicleTypeRecord } from '@/features/vehicle/type/types/vehicle-type.types';
import { findMappedVehicleCategory } from '@/features/billing/utils/vehicle-category-mapping';
import type { BillingVehicle } from '../model/types';

export type VehicleCategoryMappingState = 'checking' | 'mapped' | 'not_mapped' | 'error';

function normalize(value: string) {
	return value.trim().replace(/\s+/gu, ' ').toLocaleLowerCase();
}

export function useVehicleCategoryMapping(vehicle: BillingVehicle) {
	const vehicleTypeId = vehicle.tqmsVehicleTypeId.trim();
	const needsTqmsLookup = !vehicleTypeId;
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
	} = useTqmsVehicleTypes(needsTqmsLookup);

	const tqmsType = useMemo(() => {
		const vehicleTypeName = normalize(vehicle.vehicleType);
		return tqmsTypes.find((type) =>
			[ type.name, type.code ].some((value) => normalize(value) === vehicleTypeName),
		) ?? null;
	}, [tqmsTypes, vehicle.vehicleType]);
	const resolvedVehicleTypeId = vehicleTypeId || tqmsType?.id || '';

	const mappedCategory = useMemo(
		() => findMappedVehicleCategory(categories, resolvedVehicleTypeId),
		[categories, resolvedVehicleTypeId],
	);

	const isChecking = isLoadingCategories || (needsTqmsLookup && isLoadingTqmsTypes);
	const error = categoryLoadError
		? `बिलिङ सवारी श्रेणी लोड गर्न सकिएन: ${categoryLoadError}`
		: needsTqmsLookup && tqmsLoadError
			? `TQMS सवारी प्रकार लोड गर्न सकिएन: ${tqmsLoadError}`
			: !isChecking && !resolvedVehicleTypeId
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
		if (!resolvedVehicleTypeId) {
			throw new Error('यो सवारीको TQMS प्रकार पुष्टि नभएसम्म नक्साङ्कन गर्न सकिँदैन।');
		}

		const assignedCategory = categories.find((candidate) =>
			candidate.id !== category.id
			&& candidate.vehicleTypes.some((mappedType) => normalize(mappedType) === normalize(resolvedVehicleTypeId)),
		);
		if (assignedCategory) {
			throw new Error(`यो TQMS प्रकार पहिले नै ${assignedCategory.category} श्रेणीमा म्याप गरिएको छ।`);
		}

		await update(category.id, {
			categoryName: category.category,
			vehicleTypes: [...new Set([...category.vehicleTypes, resolvedVehicleTypeId])],
		});

		const refreshed = await reloadCategories();
		const mappingIsSaved = refreshed.data?.some((record) =>
			record.id === category.id
			&& record.vehicleTypes.some((typeId) => normalize(typeId) === normalize(resolvedVehicleTypeId)),
		);
		if (!mappingIsSaved) {
			throw new Error('नक्साङ्कन सुरक्षित भएको पुष्टि हुन सकेन। श्रेणी पुनः लोड गरेर फेरि जाँच गर्नुहोस्।');
		}
	};

	return {
		state,
		error,
		categories,
		tqmsType: tqmsType ?? (vehicleTypeId ? {
			id: vehicleTypeId,
			name: vehicle.vehicleType,
			code: vehicleTypeId,
		} : null),
		mappedCategory,
		isSaving,
		reloadCategories,
		reloadTqmsTypes,
		syncTqmsTypes,
		mapToCategory,
	};
}
