'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { billingKeys } from '@/lib/query/query-keys';
import { updateBillingVehiclePhone } from '../api/vehicle-resource.api';
import type { BillingVehicle } from '../model/types';
import type { VehiclePhoneUpdateInput } from '../schemas/vehicle-phone-update.schema';

export function useUpdateBillingVehiclePhone() {
	const queryClient = useQueryClient();
	const mutation = useMutation({
		mutationFn: ({ vehicle, input }: { vehicle: BillingVehicle; input: VehiclePhoneUpdateInput }) =>
			updateBillingVehiclePhone(vehicle, input),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: billingKeys.all }),
	});

	return {
		updatePhone: (vehicle: BillingVehicle, input: VehiclePhoneUpdateInput) =>
			mutation.mutateAsync({ vehicle, input }),
		isSaving: mutation.isPending,
	};
}
