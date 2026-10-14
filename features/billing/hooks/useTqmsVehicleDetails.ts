'use client';

import { useQuery } from '@tanstack/react-query';
import { getTqmsVehicleDetails } from '../api/tqms-vehicle-details.api';
import { billingKeys } from '@/lib/query/query-keys';

export function useTqmsVehicleDetails(vehicleNumber: string) {
	const query = useQuery({
		queryKey: billingKeys.tqmsVehicleDetails(vehicleNumber),
		queryFn: ({ signal }) => getTqmsVehicleDetails(vehicleNumber, signal),
		enabled: Boolean(vehicleNumber.trim()),
		staleTime: 5 * 60 * 1000,
	});

	return {
		details: query.data ?? null,
		isLoading: query.isLoading,
		error: query.error instanceof Error ? query.error.message : null,
		reload: () => query.refetch(),
	};
}
