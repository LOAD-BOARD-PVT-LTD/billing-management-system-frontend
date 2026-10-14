'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createBill } from '@/features/billing/api/bill-resource.api';
import type { CreateBillInput } from '@/features/billing/model/bill.types';
import { receiptsKeys } from '@/lib/query/query-keys';

export function useCreateBill() {
	const queryClient = useQueryClient();
	const mutation = useMutation({
		mutationFn: (input: CreateBillInput) => createBill(input),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: receiptsKeys.lists() }),
	});

	return {
		create: mutation.mutateAsync,
		isSaving: mutation.isPending,
		error: mutation.error instanceof Error ? mutation.error.message : null,
	};
}
