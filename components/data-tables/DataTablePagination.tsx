import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';

export interface DataTablePaginationProps {
	page: number;
	pageSize: number;
	total: number;
	onPageChange: (page: number) => void;
	className?: string;
	labels?: {
		ariaLabel?: string;
		showing?: string;
		of?: string;
		page?: string;
		previousPage?: string;
		nextPage?: string;
	};
	formatNumber?: (value: number) => string;
}

export function DataTablePagination({
	page,
	pageSize,
	total,
	onPageChange,
	className,
	labels,
	formatNumber = String,
}: DataTablePaginationProps) {
	const pageCount = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
	const currentPage = Math.min(Math.max(1, page), pageCount);
	const firstItem = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
	const lastItem = Math.min(currentPage * pageSize, total);

	return (
		<nav
			className={cn('flex flex-col gap-3 border-t border-border/70 pt-3 sm:flex-row sm:items-center sm:justify-between', className)}
			aria-label={labels?.ariaLabel ?? 'Table pagination'}
		>
			<p className="text-sm text-muted-foreground" aria-live="polite">
				{labels?.showing ?? 'Showing'}{' '}
				<span className="font-medium text-foreground">{formatNumber(firstItem)}-{formatNumber(lastItem)}</span>{' '}
				{labels?.of ?? 'of'}{' '}
				<span className="font-medium text-foreground">{formatNumber(total)}</span>
			</p>
			<div className="flex items-center gap-2">
				<span className="min-w-20 text-center text-sm text-muted-foreground">
					{labels?.page ?? 'Page'} {formatNumber(currentPage)} {labels?.of ?? 'of'} {formatNumber(pageCount)}
				</span>
				<Button
					type="button"
					variant="outline"
					size="icon-sm"
					aria-label={labels?.previousPage ?? 'Previous page'}
					disabled={currentPage <= 1}
					onClick={() => onPageChange(currentPage - 1)}
				>
					<ChevronLeft className="h-4 w-4" aria-hidden="true" />
				</Button>
				<Button
					type="button"
					variant="outline"
					size="icon-sm"
					aria-label={labels?.nextPage ?? 'Next page'}
					disabled={currentPage >= pageCount}
					onClick={() => onPageChange(currentPage + 1)}
				>
					<ChevronRight className="h-4 w-4" aria-hidden="true" />
				</Button>
			</div>
		</nav>
	);
}
