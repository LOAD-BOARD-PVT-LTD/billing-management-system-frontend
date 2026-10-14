import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';

export type SortDirection = 'asc' | 'desc' | null;

export interface DataTableColumnHeaderProps {
	label: string;
	sortDirection?: SortDirection;
	onSortChange?: (direction: SortDirection) => void;
	className?: string;
}

export function DataTableColumnHeader({
	label,
	sortDirection = null,
	onSortChange,
	className,
}: DataTableColumnHeaderProps) {
	if (!onSortChange) {
		return <span className={cn('font-semibold text-muted-foreground', className)}>{label}</span>;
	}

	const SortIcon = sortDirection === 'asc'
		? ArrowUp
		: sortDirection === 'desc'
			? ArrowDown
			: ArrowUpDown;
	const nextDirection: SortDirection = sortDirection === null
		? 'asc'
		: sortDirection === 'asc'
			? 'desc'
			: null;

	return (
		<Button
			type="button"
			variant="ghost"
			size="sm"
			className={cn('-ml-2 h-8 gap-2 px-2', className)}
			aria-label={`Sort by ${label}${sortDirection ? `, currently ${sortDirection}ending` : ''}`}
			onClick={() => onSortChange(nextDirection)}
		>
			{label}
			<SortIcon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
		</Button>
	);
}
