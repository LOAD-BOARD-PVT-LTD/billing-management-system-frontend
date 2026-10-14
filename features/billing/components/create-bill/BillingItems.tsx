import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { BillingEntityRecord } from '@/features/administration/billing-entities/types/billing-entity.types';
import type { FeeHead } from '@/features/billing-rules/model/types';
import { BillingItemRow } from '@/features/billing/components/create-bill/BIllingItemRow';
import type { BillingLine } from '@/features/billing/model/types';

type BillingItemsProps = {
	items: BillingLine[];
	feeHeads: FeeHead[];
	entities: BillingEntityRecord[];
	isLoadingRules: boolean;
	rulesError: string | null;
	hasPeriodicRule: boolean;
	billingMonths: number;
	onBillingMonthsChange: (months: number) => void;
	allowManualAmountOverride: boolean;
	onChange: (id: string, changes: Partial<BillingLine>) => void;
	onAddManualItem: () => void;
	onReloadRules: () => void;
};

export function BillingItems({
	items,
	feeHeads,
	entities,
	isLoadingRules,
	rulesError,
	hasPeriodicRule,
	billingMonths,
	onBillingMonthsChange,
	allowManualAmountOverride,
	onChange,
	onAddManualItem,
	onReloadRules,
}: BillingItemsProps) {
	const activeEntities = entities.filter((entity) => entity.status === 'ACTIVE');

	return (
		<section className="overflow-hidden rounded-md border border-border bg-card">
			<div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-3 py-2">
				<h2 className="text-sm font-semibold">बिलिङ नियम</h2>
				{hasPeriodicRule && (
					<label className="flex items-center gap-2 text-xs text-muted-foreground">
						<span>बिलिङ महिना</span>
						<Input
							type="number"
							min="1"
							max="12"
							step="1"
							required
							value={billingMonths || ''}
							onChange={(event) => onBillingMonthsChange(Number(event.target.value) || 0)}
							aria-label="बिलिङ महिना"
							className="h-8 w-20 rounded-md"
						/>
					</label>
				)}
			</div>
			{!allowManualAmountOverride && (
				<p className="border-b border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground" role="status">
					चयन गरिएको शाखामा Manual Amount Override अनुमति छैन। रकम परिवर्तन र Manual शुल्क थप्न मिल्दैन।
				</p>
			)}
			<div className="grid grid-cols-[32px_minmax(0,1fr)_112px_minmax(150px,0.9fr)] gap-2 border-b border-border bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground sm:gap-3">
				<span>सि.नं.</span>
				<span>शुल्क शीर्षक</span>
				<span className="text-right">रकम</span>
				<span>Billing Entity</span>
			</div>
			{activeEntities.length === 0 ? (
				<p role="alert" className="border-b border-border/70 bg-amber-50 px-3 py-2 text-sm text-amber-900">
					कुनै सक्रिय Billing Entity उपलब्ध छैन। शुल्कमा संस्था चयन गर्न Billing Entity सक्रिय गर्नुहोस्।
				</p>
			) : null}
			{items.length ? items.map((item, index) => (
				<BillingItemRow
					key={item.id}
					index={index}
					item={item}
					feeHeads={feeHeads}
					entities={activeEntities}
					allowManualAmountOverride={allowManualAmountOverride}
					onChange={onChange}
				/>
			)) : rulesError ? (
				<p role="alert" className="px-3 py-6 text-center text-sm text-destructive">
					बिलिङ नियम लोड गर्न सकिएन: {rulesError}
					<Button type="button" variant="link" size="xs" className="ml-2 h-auto p-0" onClick={onReloadRules}>
						पुनः प्रयास
					</Button>
				</p>
			) : isLoadingRules ? (
				<p role="status" className="px-3 py-6 text-center text-sm text-muted-foreground">
					बिलिङ नियम लोड हुँदैछ...
				</p>
			) : (
				<p className="px-3 py-6 text-center text-sm text-muted-foreground">
					छानिएको वित्तीय वर्ष र सवारी श्रेणीका लागि सक्रिय नियम भेटिएन। आवश्यक भए म्यानुअल शुल्क थप्नुहोस्।
				</p>
			)}
			<div className="flex justify-end border-t border-border/70 px-3 py-2">
				<Button type="button" variant="outline" size="sm" onClick={onAddManualItem} disabled={!allowManualAmountOverride}>
					<Plus aria-hidden="true" className="mr-2 size-4" />
					Manual शुल्क थप्नुहोस्
				</Button>
			</div>
		</section>
	);
}
