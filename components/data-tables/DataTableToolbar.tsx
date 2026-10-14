import type { ReactNode } from 'react';
import { Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/utils/cn';

export interface DataTableToolbarProps {
	searchValue?: string;
	onSearchChange?: (value: string) => void;
	searchPlaceholder?: string;
	children?: ReactNode;
	className?: string;
}

export function DataTableToolbar({
	searchValue,
	onSearchChange,
	searchPlaceholder = 'Filter results...',
	children,
	className,
}: DataTableToolbarProps) {
	return (
		<div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}>
			{onSearchChange ? (
				<div className="relative w-full sm:max-w-sm">
					<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
					<Input
						type="search"
						value={searchValue ?? ''}
						onChange={(event) => onSearchChange(event.target.value)}
						placeholder={searchPlaceholder}
						className="pr-10 pl-9"
						aria-label={searchPlaceholder}
					/>
					{searchValue ? (
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
							aria-label="Clear filter"
							onClick={() => onSearchChange('')}
						>
							<X className="h-4 w-4" aria-hidden="true" />
						</Button>
					) : null}
				</div>
			) : <span />}
			{children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
		</div>
	);
}
