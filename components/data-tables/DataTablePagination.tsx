import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';

export interface DataTablePaginationProps {
	page: number;
	pageSize: number;
	total: number;
	onPageChange: (page: number) => void;
	className?: string;
}

export function DataTablePagination({
	page,
	pageSize,
	total,
	onPageChange,
	className,
}: DataTablePaginationProps) {
	const pageCount = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
	const currentPage = Math.min(Math.max(1, page), pageCount);
	const firstItem = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
	const lastItem = Math.min(currentPage * pageSize, total);

	return (
		<nav
			className={cn('flex flex-col gap-3 border-t border-border/70 pt-3 sm:flex-row sm:items-center sm:justify-between', className)}
			aria-label="Table pagination"
		>
			<p className="text-sm text-muted-foreground" aria-live="polite">
				Showing <span className="font-medium text-foreground">{firstItem}-{lastItem}</span> of{' '}
				<span className="font-medium text-foreground">{total}</span>
			</p>
			<div className="flex items-center gap-2">
				<span className="min-w-20 text-center text-sm text-muted-foreground">
					Page {currentPage} of {pageCount}
				</span>
				<Button
					type="button"
					variant="outline"
					size="icon-sm"
					aria-label="Previous page"
					disabled={currentPage <= 1}
					onClick={() => onPageChange(currentPage - 1)}
				>
					<ChevronLeft className="h-4 w-4" aria-hidden="true" />
				</Button>
				<Button
					type="button"
					variant="outline"
					size="icon-sm"
					aria-label="Next page"
					disabled={currentPage >= pageCount}
					onClick={() => onPageChange(currentPage + 1)}
				>
					<ChevronRight className="h-4 w-4" aria-hidden="true" />
				</Button>
			</div>
		</nav>
	);
}
