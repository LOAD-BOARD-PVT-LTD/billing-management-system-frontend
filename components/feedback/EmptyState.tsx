import { Inbox } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';

export interface EmptyStateProps {
	title: string;
	description?: string;
	icon?: LucideIcon;
	actionLabel?: string;
	onAction?: () => void;
	className?: string;
}

export function EmptyState({
	title,
	description,
	icon: Icon = Inbox,
	actionLabel,
	onAction,
	className,
}: EmptyStateProps) {
	return (
		<div className={cn('flex min-h-48 flex-col items-center justify-center gap-3 px-5 py-8 text-center', className)}>
			<span className="grid h-11 w-11 place-items-center rounded-lg border border-border bg-muted/50 text-muted-foreground">
				<Icon className="h-5 w-5" aria-hidden="true" />
			</span>
			<div className="max-w-md space-y-1">
				<h3 className="text-sm font-semibold text-foreground">{title}</h3>
				{description ? <p className="text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
			</div>
			{actionLabel && onAction ? (
				<Button type="button" size="sm" variant="outline" onClick={onAction}>
					{actionLabel}
				</Button>
			) : null}
		</div>
	);
}
