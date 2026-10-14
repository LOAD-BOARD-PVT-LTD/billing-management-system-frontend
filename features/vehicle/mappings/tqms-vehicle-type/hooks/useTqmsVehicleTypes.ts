import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
	fetchTqmsVehicleTypes,
	syncTqmsVehicleTypes,
} from '@/features/vehicle/mappings/tqms-vehicle-type/api/tqms-vehicle-type.api';
import type { TqmsVehicleTypeOption } from '@/features/vehicle/mappings/tqms-vehicle-type/types/tqms-vehicle-type.types';
import { tqmsVehicleTypeKeys } from '@/lib/query/query-keys';

export function useTqmsVehicleTypes(enabled: boolean) {
	const queryClient = useQueryClient();
	const query = useQuery({
		queryKey: tqmsVehicleTypeKeys.lists(),
		queryFn: fetchTqmsVehicleTypes,
		enabled,
	});
	const syncMutation = useMutation({
		mutationFn: syncTqmsVehicleTypes,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: tqmsVehicleTypeKeys.lists() }),
	});
	const reload = () => query.refetch();
	const sync = syncMutation.mutateAsync;
	const error = query.error instanceof Error
		? query.error.message
		: syncMutation.error instanceof Error
			? syncMutation.error.message
			: null;

	return {
		data: query.data ?? [] as TqmsVehicleTypeOption[],
		isLoading: query.isLoading,
		isRefreshing: query.isFetching && !query.isLoading,
		isSyncing: syncMutation.isPending,
		loadError: query.error instanceof Error ? query.error.message : null,
		error,
		reload,
		sync,
	};
}
