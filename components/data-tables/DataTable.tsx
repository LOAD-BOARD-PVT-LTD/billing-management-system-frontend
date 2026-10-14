import type { ReactNode } from 'react';

import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState, type EmptyStateProps } from '@/components/feedback/EmptyState';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { cn } from '@/utils/cn';

export interface DataTableColumn<TData> {
	id: string;
	header: ReactNode;
	cell: (row: TData) => ReactNode;
	headerClassName?: string;
	cellClassName?: string;
}

export interface DataTableProps<TData> {
	columns: DataTableColumn<TData>[];
	data: TData[];
	getRowId?: (row: TData, index: number) => string | number;
	isLoading?: boolean;
	loadingLabel?: string;
	emptyState?: Omit<EmptyStateProps, 'className'>;
	ariaLabel?: string;
	className?: string;
}

export function DataTable<TData>({
	columns,
	data,
	getRowId,
	isLoading = false,
	loadingLabel = 'Loading data...',
	emptyState,
	ariaLabel = 'Data table',
	className,
}: DataTableProps<TData>) {
	return (
		<div className={cn('space-y-3', className)}>
			<Table aria-label={ariaLabel}>
				<TableHeader>
					<TableRow>
						{columns.map((column) => (
							<TableHead key={column.id} className={column.headerClassName}>
								{column.header}
							</TableHead>
						))}
					</TableRow>
				</TableHeader>
				<TableBody>
					{isLoading ? (
						<TableRow>
							<TableCell colSpan={columns.length} className="h-40 text-center">
								<div className="flex justify-center">
									<LoadingSpinner label={loadingLabel} />
								</div>
							</TableCell>
						</TableRow>
					) : data.length === 0 ? (
						<TableRow>
							<TableCell colSpan={columns.length} className="p-0">
								<EmptyState
									title={emptyState?.title ?? 'No results found'}
									description={emptyState?.description}
									icon={emptyState?.icon}
									actionLabel={emptyState?.actionLabel}
									onAction={emptyState?.onAction}
									className="min-h-48"
								/>
							</TableCell>
						</TableRow>
					) : (
						data.map((row, index) => (
							<TableRow key={getRowId?.(row, index) ?? index}>
								{columns.map((column) => (
									<TableCell key={column.id} className={column.cellClassName}>
										{column.cell(row)}
									</TableCell>
								))}
							</TableRow>
						))
					)}
				</TableBody>
			</Table>
		</div>
	);
}
