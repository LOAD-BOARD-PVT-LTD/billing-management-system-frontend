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
	onChange: (id: string, changes: Partial<BillingLine>) => void;
};

export function BillingItemRow({ index, item, feeHeads, entities, allowManualAmountOverride, onChange }: BillingItemRowProps) {
	return (
		<div className="grid grid-cols-[32px_minmax(0,1fr)_112px_minmax(150px,0.9fr)] items-center gap-2 border-b border-border/70 px-3 py-1.5 last:border-b-0 sm:gap-3">
			<span className="text-xs tabular-nums text-muted-foreground">{index + 1}</span>
			{item.isManual ? (
				<Select
					value={item.feeHeadId ?? ''}
					onValueChange={(feeHeadId) => {
						const feeHead = feeHeads.find((head) => head.id === feeHeadId);
						if (feeHead) onChange(item.id, { feeHeadId, title: feeHead.name });
					}}
					disabled={feeHeads.length === 0}
				>
					<SelectTrigger aria-label={`शुल्क शीर्षक ${index + 1}`} className="h-8">
						<SelectValue placeholder="शीर्षक छान्नुहोस्" />
					</SelectTrigger>
					<SelectContent>
						{feeHeads.map((feeHead) => (
							<SelectItem key={feeHead.id} value={feeHead.id}>{feeHead.name}</SelectItem>
						))}
					</SelectContent>
				</Select>
			) : (
				<span className="truncate text-sm" title={item.title}>{item.title}</span>
			)}
			<Input
				aria-label={`${item.title} रकम`}
				type="number"
				min="0"
				step="1"
				value={item.amount}
				onChange={(event) => onChange(item.id, { amount: Math.max(0, Number(event.target.value) || 0) })}
				disabled={!allowManualAmountOverride}
				title={!allowManualAmountOverride ? 'यो शाखामा रसिद रकम परिवर्तन गर्न अनुमति छैन।' : undefined}
				className="h-8 text-right tabular-nums"
			/>
			<Select
				value={item.entityId ?? ''}
				onValueChange={(entityId) => {
					const entity = entities.find((record) => record.id === entityId);
					if (entity) onChange(item.id, { entityId, entity: entity.entity });
				}}
				disabled={entities.length === 0}
			>
				<SelectTrigger aria-label={`Billing Entity ${index + 1}`} className="h-8">
					<SelectValue placeholder="संस्था छान्नुहोस्" />
				</SelectTrigger>
				<SelectContent>
					{entities.map((entity) => (
						<SelectItem key={entity.id} value={entity.id}>{entity.entity}</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
