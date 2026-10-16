import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { FeeHead } from '@/features/billing-rules/model/types';
import type { BillingEntityRecord } from '@/features/administration/billing-entities/types/billing-entity.types';
import type { BillingLine } from '@/features/billing/model/types';

type BillingItemRowProps = {
	index: number;
	item: BillingLine;
	feeHeads: FeeHead[];
	entities: BillingEntityRecord[];
	allowManualAmountOverride: boolean;
	allowSelection: boolean;
	isSelected: boolean;
	onChange: (id: string, changes: Partial<BillingLine>) => void;
	onSelectForReceipt: (id: string) => void;
	onDeselectFromReceipt: (id: string) => void;
};

export function BillingItemRow({
	index,
	item,
	feeHeads,
	entities,
	allowManualAmountOverride,
	allowSelection,
	isSelected,
	onChange,
	onSelectForReceipt,
	onDeselectFromReceipt,
}: BillingItemRowProps) {
	const [isAmountFocused, setIsAmountFocused] = useState(false);

	return (
		<div
			className={`grid grid-cols-[24px_minmax(0,1fr)] items-center gap-x-2 gap-y-1 border-b border-border/70 px-3 py-1.5 last:border-b-0 sm:grid-cols-[28px_minmax(0,1.2fr)_minmax(160px,0.9fr)_minmax(190px,1.1fr)] sm:gap-2 ${allowSelection && isSelected ? 'border-l-4 border-l-sky-600 bg-sky-50/80' : ''}`}
		>
			<span className="row-span-3 text-xs tabular-nums text-muted-foreground sm:row-span-1">{index + 1}</span>
			{item.isManual ? (
				<div className="col-start-2 min-w-0 sm:col-start-auto">
					<Select
						value={item.feeHeadId ?? ''}
						onValueChange={(feeHeadId) => {
							const feeHead = feeHeads.find((head) => head.id === feeHeadId);
							if (feeHead) onChange(item.id, { feeHeadId, title: feeHead.name });
						}}
						disabled={feeHeads.length === 0}
					>
						<SelectTrigger aria-label={`शुल्क शीर्षक ${index + 1}`} className="h-7 text-xs">
							<SelectValue placeholder="शीर्षक छान्नुहोस्" />
						</SelectTrigger>
						<SelectContent>
							{feeHeads.map((feeHead) => (
								<SelectItem key={feeHead.id} value={feeHead.id}>{feeHead.name}</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			) : (
				<span className="col-start-2 min-w-0 sm:col-start-auto">
					<span className="truncate text-xs sm:text-sm" title={item.title}>{item.title}</span>
				</span>
			)}
			<div className="col-start-2 flex min-w-0 items-center gap-2 sm:col-start-auto">
				<Input
					aria-label={`${item.title} रकम`}
					type="number"
					min="0"
					step="1"
					value={item.amount}
					onClick={() => {
						if (allowSelection) onSelectForReceipt(item.id);
					}}
					onFocus={() => setIsAmountFocused(true)}
					onBlur={() => setIsAmountFocused(false)}
					onChange={(event) => onChange(item.id, { amount: Math.max(0, Number(event.target.value) || 0) })}
					disabled={!allowManualAmountOverride}
					title={!allowManualAmountOverride ? 'यो शाखामा रसिद रकम परिवर्तन गर्न अनुमति छैन।' : undefined}
					className="h-7 min-w-0 flex-1 text-right text-xs tabular-nums"
				/>
				{allowSelection && isSelected && isAmountFocused ? (
					<button
						type="button"
						aria-label={`${item.title || 'शुल्क'} लाई रसिदबाट हटाउनुहोस्`}
						title="रसीदबाट हटाउनुहोस्"
						onPointerDown={(event) => event.preventDefault()}
						onClick={() => onDeselectFromReceipt(item.id)}
						className="grid size-7 shrink-0 place-items-center rounded-md border border-destructive/40 bg-background text-destructive shadow-xs transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
					>
						<Trash2 aria-hidden="true" className="size-4" />
					</button>
				) : null}
			</div>
			<div className="col-start-2 min-w-0 sm:col-start-auto">
				<Select
					value={item.entityId ?? ''}
					onValueChange={(entityId) => {
						const entity = entities.find((record) => record.id === entityId);
						if (entity) onChange(item.id, { entityId, entity: entity.entity });
					}}
					disabled={entities.length === 0}
				>
					<SelectTrigger aria-label={`Billing Entity ${index + 1}`} className="h-7 w-full text-xs">
						<SelectValue placeholder="संस्था छान्नुहोस्" />
					</SelectTrigger>
					<SelectContent>
						{entities.map((entity) => (
							<SelectItem key={entity.id} value={entity.id}>{entity.entity}</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		</div>
	);
}
