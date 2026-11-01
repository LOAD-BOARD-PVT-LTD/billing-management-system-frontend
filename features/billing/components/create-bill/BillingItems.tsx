import { memo, useMemo } from 'react';
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

export const BillingItems = memo(function BillingItems({
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
	const activeEntities = useMemo(
		() => entities.filter((entity) => entity.status === 'ACTIVE'),
		[entities],
	);
	const selectedItems = useMemo(
		() => items.filter((item) => selectedItemIds.has(item.id)),
		[items, selectedItemIds],
	);
	const selectedTotal = useMemo(
		() => selectedItems.reduce((total, item) => total + Math.max(0, item.amount), 0),
		[selectedItems],
	);

	return (
		<section className="space-y-0.5 rounded-md border border-border bg-card">
			<div className="flex flex-wrap items-center justify-between gap-1 border-b border-border/70 px-1.5 py-0.5">
				<div className="flex items-center gap-2">
					<h2 className="text-xs font-semibold text-foreground">शुल्क शीर्षकहरू</h2>
					<span className="text-xs font-medium text-primary">जम्मा रु. {formatCurrency(selectedTotal)}</span>
				</div>
				{hasPeriodicRule && (
					<label className="flex items-center gap-1 text-xs font-medium text-foreground">
						महिना संख्या
						<Input
							type="number"
							min="1"
							max="12"
							value={billingMonths}
							onChange={(event) => onBillingMonthsChange(Math.max(1, Math.min(12, Number(event.target.value) || 1)))}
							className="h-6 w-14 rounded-md px-1 py-0 text-center text-xs"
						/>
					</label>
				)}
			</div>
			{rulesError ? (
				<div role="alert" className="flex items-center justify-between gap-2 px-3 py-2 text-xs text-destructive">
					<span>नियमहरू लोड हुन सकेन: {rulesError}</span>
					<Button type="button" variant="outline" size="xs" onClick={onReloadRules}>
						पुनः प्रयास
					</Button>
				</div>
			) : isLoadingRules ? (
				<p role="status" className="px-3 py-2 text-center text-sm text-muted-foreground">
					नियमहरू लोड हुँदै छन्...
				</p>
			) : items.length > 0 ? (
				<div className="space-y-0.5" role="list" aria-label="शुल्क शीर्षकहरूको सूची">
					{items.map((item, index) => (
						<BillingItemRow
							key={item.id}
							index={index}
							item={item}
							feeHeads={feeHeads}
							entities={activeEntities}
							allowManualAmountOverride={allowManualAmountOverride}
							allowSelection={Boolean(item.ruleId || item.isManual || item.isUnconfigured)}
							isSelected={selectedItemIds.has(item.id)}
							isLinkedAutoSelected={autoLinkedItemIds.has(item.id)}
							onChange={onChange}
							onSelectForReceipt={onSelectItemForReceipt}
							onDeselectFromReceipt={onDeselectItemFromReceipt}
						/>
					))}
				</div>
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
});
