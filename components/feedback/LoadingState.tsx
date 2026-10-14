'use client';

import { LoadingSpinner, type LoadingSpinnerProps } from '@/components/common/LoadingSpinner';
import { cn } from '@/utils/cn';

export interface LoadingStateProps extends Omit<LoadingSpinnerProps, 'className'> {
	className?: string;
}

export function LoadingState({ className, ...props }: LoadingStateProps) {
	if (props.fullScreen) {
		return <LoadingSpinner {...props} className={className} />;
	}

	return (
		<div className={cn('flex min-h-32 items-center justify-center rounded-lg border border-border/70 bg-card px-4 py-8', className)}>
			<LoadingSpinner {...props} />
		</div>
	);
}
