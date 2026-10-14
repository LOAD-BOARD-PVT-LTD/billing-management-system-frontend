import { LoaderCircle } from 'lucide-react';

import { cn } from '@/utils/cn';

export interface LoadingSpinnerProps {
	label?: string;
	description?: string;
	size?: 'sm' | 'md' | 'lg';
	fullScreen?: boolean;
	className?: string;
}

const spinnerSizes = {
	sm: { surface: 'h-8 w-8', icon: 'h-4 w-4' },
	md: { surface: 'h-11 w-11', icon: 'h-5 w-5' },
	lg: { surface: 'h-14 w-14', icon: 'h-6 w-6' },
} satisfies Record<NonNullable<LoadingSpinnerProps['size']>, { surface: string; icon: string }>;

export function LoadingSpinner({
	label = 'Loading...',
	description,
	size = 'md',
	fullScreen = false,
	className,
}: LoadingSpinnerProps) {
	return (
		<div
			className={cn(
				'flex items-center gap-3 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300',
				fullScreen
					? 'min-h-screen flex-col justify-center gap-5 bg-muted/20 px-4 text-center'
					: 'text-muted-foreground',
				className,
			)}
			role="status"
			aria-live="polite"
			aria-busy="true"
		>
			<div
				className={cn(
					'relative grid shrink-0 place-items-center rounded-full border border-border/80 bg-card shadow-sm',
					'after:absolute after:inset-1 after:rounded-full after:border after:border-dashed after:border-muted-foreground/20',
					spinnerSizes[size].surface,
				)}
			>
				<LoaderCircle
					className={cn('animate-spin text-primary', spinnerSizes[size].icon)}
					aria-hidden="true"
				/>
			</div>
			<div className={cn(fullScreen ? 'max-w-md space-y-1.5' : 'min-w-0')}>
				<p className={cn('font-semibold text-foreground', fullScreen ? 'text-base' : 'text-sm')}>
					{label}
				</p>
				{description ? (
					<p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
				) : null}
			</div>
		</div>
	);
}