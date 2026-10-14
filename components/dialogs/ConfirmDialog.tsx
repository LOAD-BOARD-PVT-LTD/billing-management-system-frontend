'use client';

import { useState } from 'react';
import type { ButtonProps } from '@/components/ui/button';

import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';

export interface ConfirmDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description?: string;
	confirmLabel?: string;
	cancelLabel?: string;
	confirmVariant?: ButtonProps['variant'];
	isLoading?: boolean;
	onConfirm: () => void | Promise<void>;
	onError?: (error: unknown) => void;
}

export function ConfirmDialog({
	open,
	onOpenChange,
	title,
	description,
	confirmLabel = 'Confirm',
	cancelLabel = 'Cancel',
	confirmVariant = 'default',
	isLoading = false,
	onConfirm,
	onError,
}: ConfirmDialogProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const isBusy = isLoading || isSubmitting;

	const handleOpenChange = (nextOpen: boolean) => {
		if (isBusy) return;
		if (nextOpen) setErrorMessage(null);
		onOpenChange(nextOpen);
	};

	const handleConfirm = async () => {
		setIsSubmitting(true);
		setErrorMessage(null);
		try {
			await onConfirm();
			onOpenChange(false);
		} catch (error) {
			setErrorMessage(error instanceof Error ? error.message : 'The action could not be completed.');
			onError?.(error);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					{description ? <DialogDescription>{description}</DialogDescription> : null}
				</DialogHeader>
				{errorMessage ? (
					<p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">
						{errorMessage}
					</p>
				) : null}
				<DialogFooter>
					<Button type="button" variant="outline" disabled={isBusy} onClick={() => handleOpenChange(false)}>
						{cancelLabel}
					</Button>
					<Button type="button" variant={confirmVariant} loading={isBusy} onClick={() => void handleConfirm()}>
						{confirmLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
