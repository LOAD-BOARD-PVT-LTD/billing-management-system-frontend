import { CheckCircle2, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type ReconciliationActionsProps = {
	isSubmitting: boolean;
	canConfirm: boolean;
	onCancel: () => void;
	onConfirm: () => void;
};

export function ReconciliationActions({
	isSubmitting,
	canConfirm,
	onCancel,
	onConfirm,
}: ReconciliationActionsProps) {
	return (
		<div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/80 pt-3">
			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={onCancel}
				disabled={isSubmitting}
				className="h-8 px-3 text-xs"
			>
				रद्द गर्नुहोस्
			</Button>
			<Button
				type="button"
				size="sm"
				onClick={onConfirm}
				disabled={!canConfirm || isSubmitting}
				className="h-8 gap-1.5 px-3 text-xs"
			>
				{isSubmitting ? (
					<>
						<LoaderCircle className="size-3.5 animate-spin" />
						सुरक्षित गर्दैछ...
					</>
				) : (
					<>
						<CheckCircle2 className="size-3.5" />
						निर्णय पुष्टि गर्नुहोस् र बिल अगाडि बढाउनुहोस्
					</>
				)}
			</Button>
		</div>
	);
}
