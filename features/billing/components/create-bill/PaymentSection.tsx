import { memo, useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BillingTotalsSummary } from '@/features/billing/components/create-bill/BillingTotalsSummary';

const paymentMethods = ['नगद', 'बैंक', 'अनलाइन'];

type PaymentSectionProps = {
	total: number;
	discount: number;
	vatAmount?: number;
	vatRatePct?: number;
	vatEnabled?: boolean;
	vatApplicable?: boolean;
	onDiscountChange: (value: number) => void;
	onSave: (paymentMethod: string, note: string) => void;
	isSaving: boolean;
	isCheckingDuplicate: boolean;
	disabledReason: string | null;
	error: string | null;
};

export const PaymentSection = memo(function PaymentSection({
	total,
	discount,
	vatAmount = 0,
	vatRatePct = 0,
	vatEnabled = false,
	vatApplicable = vatAmount > 0,
	onDiscountChange,
	onSave,
	isSaving,
	isCheckingDuplicate,
	disabledReason,
	error,
}: PaymentSectionProps) {
	const [paymentMethod, setPaymentMethod] = useState(paymentMethods[0]);
	const [note, setNote] = useState('');

	return (
		<section className="rounded-md border border-border bg-card p-1.5">
			<div className="grid gap-2 lg:grid-cols-[minmax(190px,0.65fr)_minmax(0,1.35fr)] lg:items-center">
				<BillingTotalsSummary
					subtotal={total}
					discount={discount}
					vatAmount={vatAmount}
					vatRatePct={vatRatePct}
					vatEnabled={vatEnabled}
					vatApplicable={vatApplicable}
				/>
				<div className="grid min-w-0 gap-2 sm:grid-cols-[100px_minmax(0,1fr)_120px_auto] sm:items-end">
					<label className="space-y-0.5 text-xs text-muted-foreground">
						छुट रकम
						<Input type="number" min="0" max={total} value={discount} onChange={(event) => onDiscountChange(Math.max(0, Number(event.target.value) || 0))} className="h-8 rounded-md px-2 py-0 text-sm" />
					</label>
					<label className="space-y-0.5 text-xs text-muted-foreground">
						टिप्पणी (ऐच्छिक)
						<Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="उदाहरण: काउन्टरमा नगद बुझियो" className="h-8 rounded-md px-2 py-0 text-sm" />
					</label>
					<label className="space-y-0.5 text-xs text-muted-foreground">
						भुक्तानी प्रकार
						<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-0 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
							{paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}
						</select>
					</label>
					<div className="flex justify-end">
						<Button
							type="button"
							size="xs"
							className="h-8 whitespace-nowrap px-3 text-sm"
							disabled={isSaving || isCheckingDuplicate}
							loading={isSaving || isCheckingDuplicate}
							onClick={() => onSave(paymentMethod, note)}
						>
							<Save aria-hidden="true" className="mr-1.5 size-3.5" />{isCheckingDuplicate ? 'जाँच हुँदै छ' : 'बिल सेभ गर्नुहोस्'}
						</Button>
					</div>
				</div>
			</div>
			{disabledReason && (
				<p role="status" className="mt-1 border-t border-border pt-0.5 text-[11px] text-amber-800">
					सेभ गर्दा यी कुरा सच्याउनुहोस्: {disabledReason}
				</p>
			)}
			{error && <p role="alert" className="mt-1 border-t border-border pt-0.5 text-[11px] text-destructive">बिल सुरक्षित गर्न सकिएन: {error}</p>}
		</section>
	);
});
