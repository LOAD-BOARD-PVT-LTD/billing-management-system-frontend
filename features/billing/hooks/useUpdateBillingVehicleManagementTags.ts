'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
	updateVehicleManagementTags,
	type VehicleManagementTag,
} from '@/features/billing/api/vehicle-resource.api';
import type { BillingVehicle } from '@/features/billing/model/types';
import { billingKeys } from '@/lib/query/query-keys';

export function useUpdateBillingVehicleManagementTags() {
	const queryClient = useQueryClient();
	const mutation = useMutation({
		mutationFn: ({ vehicle, tags }: { vehicle: BillingVehicle; tags: VehicleManagementTag[] }) =>
			updateVehicleManagementTags(vehicle, tags),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: billingKeys.all });
		},
	});

	return {
		updateManagementTags: (vehicle: BillingVehicle, tags: VehicleManagementTag[]) =>
			mutation.mutateAsync({ vehicle, tags }),
		isSaving: mutation.isPending,
	};
}
