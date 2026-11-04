import { formatCurrency } from '@/utils/numbers';

type BillingTotalsSummaryProps = {
	subtotal: number;
	discount: number;
	vatAmount: number;
	vatRatePct: number;
	vatEnabled: boolean;
	vatApplicable: boolean;
};

export function BillingTotalsSummary({
	subtotal,
	discount,
	vatAmount,
	vatRatePct,
	vatEnabled,
	vatApplicable,
}: BillingTotalsSummaryProps) {
	const payable = Math.max(0, subtotal - discount + vatAmount);

	return (
		<dl className="min-w-0 rounded-md border border-border/80 bg-muted/20 px-3 py-2 text-xs">
			<div className="flex items-center justify-between gap-3 text-muted-foreground">
				<dt>{discount > 0 ? 'छुटअघिको रकम' : 'करयोग्य रकम'}</dt>
				<dd className="font-medium tabular-nums text-foreground">रु. {formatCurrency(subtotal)}</dd>
			</div>
			{discount > 0 ? (
				<div className="mt-1 flex items-center justify-between gap-3 text-muted-foreground">
					<dt>छुट</dt>
					<dd className="tabular-nums">− रु. {formatCurrency(discount)}</dd>
				</div>
			) : null}
			{vatEnabled ? (
				<div className="mt-1 flex items-center justify-between gap-3 text-muted-foreground">
					<dt>VAT ({vatRatePct}%)</dt>
					<dd className="tabular-nums">{vatApplicable ? `रु. ${formatCurrency(vatAmount)}` : 'लागू छैन'}</dd>
				</div>
			) : null}
			<div className="mt-1 flex items-center justify-between gap-3 border-t border-border/70 pt-1 font-semibold text-foreground">
				<dt>कुल रकम</dt>
				<dd className="tabular-nums">रु. {formatCurrency(payable)}</dd>
			</div>
		</dl>
	);
}
