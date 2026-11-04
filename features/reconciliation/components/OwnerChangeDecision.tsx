import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { BillingVehicle } from '@/features/billing/model/types';
import type { OwnerChangeType } from '../types/reconciliation.types';

type OwnerChangeDecisionProps = {
	billingVehicle: BillingVehicle;
	tqmsVehicle: BillingVehicle;
	value: OwnerChangeType | null;
	onChange: (value: OwnerChangeType) => void;
	onCancel: () => void;
	onSave: () => void;
};

function ownerIdentifier(owner: Record<string, unknown>): string {
	const identifier = owner.OwnerId ?? owner.ownerId ?? owner.DhaniId ?? owner.dhaniId ?? owner.Id ?? owner.id;
	return identifier === undefined || identifier === null || String(identifier).trim() === ''
		? 'उपलब्ध छैन'
		: String(identifier);
}

function OwnerSummary({ label, vehicle }: { label: string; vehicle: BillingVehicle }) {
	const owners = Array.isArray(vehicle.resourceContent.Owners)
		? vehicle.resourceContent.Owners.filter((owner): owner is Record<string, unknown> => (
			Boolean(owner) && typeof owner === 'object' && !Array.isArray(owner)
		))
		: [];
	const ownerRows = owners.length
		? owners.map((owner) => {
			const name = String(owner.Name ?? owner.name ?? '').trim() || '—';
			const isDhani = name.toLocaleLowerCase() === vehicle.ownerName.toLocaleLowerCase();
			const isOperator = name.toLocaleLowerCase() === vehicle.operatorName?.toLocaleLowerCase();
			return {
				role: isOperator && !isDhani ? 'सञ्चालकको नाम' : 'धनीको नाम',
				name,
				id: ownerIdentifier(owner),
			};
		})
		: [
			...(vehicle.operatorName && vehicle.operatorName !== vehicle.ownerName
				? [{ role: 'सञ्चालकको नाम', name: vehicle.operatorName, id: 'उपलब्ध छैन' }]
				: []),
			{
				role: vehicle.operatorName && vehicle.operatorName !== vehicle.ownerName
					? 'धनीको नाम'
					: 'धनी/सञ्चालकको नाम',
				name: vehicle.ownerName || '—',
				id: 'उपलब्ध छैन',
			},
		];
	return (
		<div className="space-y-1">
			<h4 className="text-xs font-medium text-muted-foreground">{label}</h4>
			{ownerRows.map((owner, index) => (
				<div key={`${owner.role}-${owner.name}-${index}`} className="text-sm leading-5">
					<p>{owner.role}: {owner.name}</p>
					<p className="text-xs text-muted-foreground">धनी ID: {owner.id}</p>
				</div>
			))}
		</div>
	);
}

export function OwnerChangeDecision({
	billingVehicle,
	tqmsVehicle,
	value,
	onChange,
	onCancel,
	onSave,
}: OwnerChangeDecisionProps) {
	return (
		<div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/50 p-4" role="presentation">
			<Card
				role="dialog"
				aria-modal="true"
				aria-labelledby="owner-change-title"
				className="w-full max-w-xl space-y-4 border-border/80 p-5 shadow-xl"
			>
				<header>
					<h3 id="owner-change-title" className="text-lg font-semibold">धनीको विवरण परिवर्तन</h3>
					<p className="mt-1 text-sm text-muted-foreground">
						यो नाम सुधार हो वा धनी परिवर्तन हो, छान्नुहोस्। सदस्य नम्बर र पुराना रसिद बदलिने छैनन्।
					</p>
				</header>
				<div className="grid gap-4 rounded-md border border-border/70 p-3 sm:grid-cols-2">
					<OwnerSummary label="पहिलेको नाम" vehicle={billingVehicle} />
					<OwnerSummary label="हालको नाम" vehicle={tqmsVehicle} />
				</div>
				<fieldset className="space-y-2">
					<legend className="text-sm font-medium">परिवर्तनको प्रकार</legend>
					<label className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm">
						<input
							type="radio"
							name="owner-change-type"
							value="NAME_CORRECTION"
							checked={value === 'NAME_CORRECTION'}
							onChange={() => onChange('NAME_CORRECTION')}
						/>
						नाम सच्याइएको हो
					</label>
					<label className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm">
						<input
							type="radio"
							name="owner-change-type"
							value="OWNERSHIP_TRANSFER"
							checked={value === 'OWNERSHIP_TRANSFER'}
							onChange={() => onChange('OWNERSHIP_TRANSFER')}
						/>
						धनी परिवर्तन भएको हो
					</label>
				</fieldset>
				<div className="flex justify-end gap-2 border-t border-border/70 pt-3">
					<Button type="button" variant="outline" onClick={onCancel}>रद्द गर्नुहोस्</Button>
					<Button type="button" onClick={onSave} disabled={!value}>निर्णय सुरक्षित गर्नुहोस्</Button>
				</div>
			</Card>
		</div>
	);
}
