'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateVehicleSmsPhone } from '@/features/billing/api/vehicle-resource.api';
import type { BillingVehicle } from '@/features/billing/model/types';
import type { VehiclePhoneUpdateInput } from '@/features/billing/schemas/vehicle-phone-update.schema';
import { billingKeys } from '@/lib/query/query-keys';

export function useUpdateBillingVehiclePhone() {
	const queryClient = useQueryClient();
	const mutation = useMutation({
		mutationFn: ({ vehicle, input }: { vehicle: BillingVehicle; input: VehiclePhoneUpdateInput }) =>
			updateVehicleSmsPhone(vehicle, input),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: billingKeys.all });
		},
	});

	return {
		updatePhone: (vehicle: BillingVehicle, input: VehiclePhoneUpdateInput) =>
			mutation.mutateAsync({ vehicle, input }),
		isSaving: mutation.isPending,
	};
}
