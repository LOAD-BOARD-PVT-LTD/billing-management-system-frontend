import { AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';

export interface ErrorStateProps {
	title?: string;
	description: string;
	retryLabel?: string;
	onRetry?: () => void;
	className?: string;
}

export function ErrorState({
	title = 'Something went wrong',
	description,
	retryLabel = 'Try again',
	onRetry,
	className,
}: ErrorStateProps) {
	return (
		<div
			className={cn('flex min-h-40 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/25 bg-destructive/5 px-5 py-7 text-center', className)}
			role="alert"
		>
			<span className="grid h-10 w-10 place-items-center rounded-lg bg-destructive/10 text-destructive">
				<AlertTriangle className="h-5 w-5" aria-hidden="true" />
			</span>
			<div className="max-w-md space-y-1">
				<h3 className="text-sm font-semibold text-foreground">{title}</h3>
				<p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
			</div>
			{onRetry ? (
				<Button type="button" size="sm" variant="outline" onClick={onRetry}>
					{retryLabel}
				</Button>
			) : null}
		</div>
	);
}
