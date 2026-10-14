import { ConfirmDialog, type ConfirmDialogProps } from './ConfirmDialog';

export interface DeleteDialogProps extends Omit<ConfirmDialogProps, 'title' | 'description' | 'confirmLabel' | 'confirmVariant'> {
	itemName: string;
	description?: string;
	confirmLabel?: string;
}

export function DeleteDialog({
	itemName,
	description,
	confirmLabel = 'Delete',
	...props
}: DeleteDialogProps) {
	return (
		<ConfirmDialog
			{...props}
			title={`Delete ${itemName}?`}
			description={description ?? `This will permanently delete ${itemName}. This action cannot be undone.`}
			confirmLabel={confirmLabel}
			confirmVariant="destructive"
		/>
	);
}
