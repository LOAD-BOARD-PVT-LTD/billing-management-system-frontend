import { Check } from 'lucide-react';

import { cn } from '@/utils/cn';

export interface SuccessMessageProps {
	title: string;
	description?: string;
	className?: string;
}

export function SuccessMessage({ title, description, className }: SuccessMessageProps) {
	return (
		<div
			className={cn('flex items-start gap-3 rounded-lg border border-success/30 bg-success/5 px-4 py-3', className)}
			role="status"
			aria-live="polite"
		>
			<span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-success/10 text-success">
				<Check className="h-4 w-4" aria-hidden="true" />
			</span>
			<div className="min-w-0 space-y-0.5">
				<p className="text-sm font-semibold text-foreground">{title}</p>
				{description ? <p className="text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
			</div>
		</div>
	);
}
