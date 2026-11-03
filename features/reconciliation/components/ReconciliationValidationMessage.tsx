export type ReconciliationValidationMessageProps = {
	message: string | null;
};

export function ReconciliationValidationMessage({ message }: ReconciliationValidationMessageProps) {
	if (!message) return null;

	return (
		<div
			role="alert"
			className="rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-xs font-medium text-destructive"
		>
			{message}
		</div>
	);
}
