import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { BillingEntityRecord } from '@/features/administration/billing-entities/types/billing-entity.types';
import type { FeeHead } from '@/features/billing-rules/model/types';
import { BillingItemRow } from '@/features/billing/components/create-bill/BIllingItemRow';
import type { BillingLine } from '@/features/billing/model/types';
import { formatCurrency } from '@/utils/numbers';

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
	selectedItemIds: Set<string>;
	autoLinkedItemIds: Set<string>;
	onChange: (id: string, changes: Partial<BillingLine>) => void;
	onSelectItemForReceipt: (id: string) => void;
	onDeselectItemFromReceipt: (id: string, isLinkedAutoSelected?: boolean) => void;
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
	selectedItemIds,
	autoLinkedItemIds,
	onChange,
	onSelectItemForReceipt,
	onDeselectItemFromReceipt,
	onAddManualItem,
	onReloadRules,
}: BillingItemsProps) {
	const activeEntities = entities.filter((entity) => entity.status === 'ACTIVE');
	const selectedItems = items.filter((item) => selectedItemIds.has(item.id));
	const selectedTotal = selectedItems.reduce((total, item) => total + Math.max(0, item.amount), 0);

	return (
		<section className="overflow-hidden rounded-md border border-border bg-card">
			<div className="flex flex-wrap items-center justify-between gap-1 border-b border-border px-1.5 py-0.5">
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
							className="h-7 w-20 rounded-md"
						/>
					</label>
				)}
			</div>
			{!allowManualAmountOverride && (
				<p className="border-b border-border/70 bg-muted/30 px-1.5 py-0.5 text-xs text-muted-foreground" role="status">
					चयन गरिएको शाखामा Manual Amount Override अनुमति छैन। रकम परिवर्तन र Manual शुल्क थप्न मिल्दैन।
				</p>
			)}
			{allowManualAmountOverride ? (
				<div className="flex min-w-0 items-center gap-1 border-b border-sky-200 bg-sky-50/70 px-1.5 py-0.5 text-xs" aria-live="polite">
					<p className="shrink-0 font-semibold text-sky-900">
						रसीदमा समावेश: {selectedItems.length} शुल्क · रु {formatCurrency(selectedTotal)}
					</p>
					<p className="min-w-0 truncate text-sky-800" title={selectedItems.map((item) => item.title || 'शीर्षक चयन भएको छैन').join('、')}>
						{selectedItems.length
							? selectedItems.map((item) => item.title || 'शीर्षक चयन भएको छैन').join('、')
							: 'कुनै शुल्क चयन गरिएको छैन।'}
					</p>
				</div>
			) : null}
			<div className="grid grid-cols-[20px_minmax(0,1fr)] gap-x-1 border-b border-border bg-muted/40 px-1.5 py-0.5 text-xs font-semibold text-muted-foreground sm:grid-cols-[20px_minmax(0,1fr)_minmax(130px,0.8fr)_minmax(160px,1fr)] sm:gap-1">
				<span>सि.नं.</span>
				<span className="sm:col-start-2">शुल्क शीर्षक</span>
				<span className="col-start-2 sm:col-start-3">रकम</span>
				<span className="col-start-2 sm:col-start-4">Billing Entity</span>
			</div>
			{activeEntities.length === 0 ? (
				<p role="alert" className="border-b border-border/70 bg-amber-50 px-3 py-1.5 text-xs text-amber-900">
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
					allowSelection={allowManualAmountOverride}
					isSelected={selectedItemIds.has(item.id)}
					isLinkedAutoSelected={autoLinkedItemIds.has(item.id)}
					onChange={onChange}
					onSelectForReceipt={onSelectItemForReceipt}
					onDeselectFromReceipt={(id) => onDeselectItemFromReceipt(id, autoLinkedItemIds.has(id))}
				/>
			)) : rulesError ? (
				<p role="alert" className="px-3 py-2 text-center text-sm text-destructive">
					बिलिङ नियम लोड गर्न सकिएन: {rulesError}
					<Button type="button" variant="link" size="xs" className="ml-2 h-auto p-0" onClick={onReloadRules}>
						पुनः प्रयास
					</Button>
				</p>
			) : isLoadingRules ? (
				<p role="status" className="px-3 py-2 text-center text-sm text-muted-foreground">
					बिलिङ नियम लोड हुँदैछ...
				</p>
			) : (
				<p className="px-3 py-2 text-center text-sm text-muted-foreground">
					छानिएको वित्तीय वर्ष र सवारी श्रेणीका लागि सक्रिय नियम भेटिएन। आवश्यक भए म्यानुअल शुल्क थप्नुहोस्।
				</p>
			)}
			<div className="flex justify-end border-t border-border/70 px-1 py-0.5">
				<Button type="button" variant="outline" size="xs" onClick={onAddManualItem} disabled={!allowManualAmountOverride}>
					<Plus aria-hidden="true" className="mr-1.5 size-3.5" />
					Manual शुल्क थप्नुहोस्
				</Button>
			</div>
		</section>
	);
}
