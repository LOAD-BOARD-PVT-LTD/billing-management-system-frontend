'use client';

import { useState } from 'react';
import { Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import type { BillingVehicle } from '@/features/billing/model/types';
import type { ResolvedOwnerOption } from '@/features/billing/utils/resolve-tqms-vehicle-owners';
import { toNepaliDigits } from '@/utils/numbers';

type VehicleOwnerSelectDialogProps = {
	open: boolean;
	vehicle: BillingVehicle;
	owners: ResolvedOwnerOption[];
	initialSelectedIndex: number;
	isInitialSafeguard: boolean;
	onConfirm: (selectedIndex: number) => void;
	onCancel: () => void;
};

export function VehicleOwnerSelectDialog({
	open,
	vehicle,
	owners,
	initialSelectedIndex,
	isInitialSafeguard,
	onConfirm,
	onCancel,
}: VehicleOwnerSelectDialogProps) {
	const [selectedIndex, setSelectedIndex] = useState(initialSelectedIndex);

	const getRoleLabel = (index: number) => {
		if (index === 0) return 'मुख्य धनी / संचालक (पहिलो)';
		if (index === 1) return 'सवारी धनी (दोस्रो · डिफल्ट)';
		return `धनी (${toNepaliDigits(index + 1)})`;
	};

	return (
		<Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onCancel(); }}>
			<DialogContent className="sm:max-w-lg" showCloseButton={!isInitialSafeguard}>
				<DialogHeader className="text-left">
					<DialogTitle className="flex items-center gap-2 text-base font-semibold">
						<span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
							<Users className="size-4" aria-hidden="true" />
						</span>
						सवारी धनी चयन गर्नुहोस्
					</DialogTitle>
					<DialogDescription className="text-xs leading-5">
						<strong className="text-foreground">{vehicle.vehicleNumber}</strong> मा दुईभन्दा बढी धनी/संचालक विवरण भएकाले बिलिङ रसिदमा प्रिन्ट हुने सवारी धनीको नाम पुष्टि गर्नुहोस्।
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-2" role="radiogroup" aria-label="रसिदका लागि सवारी धनी छान्नुहोस्">
					{owners.map((owner) => {
						const checked = selectedIndex === owner.index;
						return (
							<label
								key={`${owner.index}-${owner.name}`}
								className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-xs transition-colors ${
									checked
										? 'border-primary bg-primary/5 shadow-xs'
										: 'border-border/80 bg-background hover:bg-muted/40'
								}`}
							>
								<input
									type="radio"
									name="billing-dhani-owner"
									value={owner.index}
									checked={checked}
									onChange={() => setSelectedIndex(owner.index)}
									className="mt-1 h-4 w-4 accent-primary"
								/>
								<div className="min-w-0 flex-1 space-y-1">
									<div className="flex flex-wrap items-center gap-1.5">
										<span className="text-sm font-semibold text-foreground">
											{owner.name || 'नाम उपलब्ध छैन'}
										</span>
										<Badge variant={owner.index === 1 ? 'default' : 'secondary'} className="text-[10px]">
											{getRoleLabel(owner.index)}
										</Badge>
									</div>
									<p className="text-[11px] text-muted-foreground">
										फोन: {owner.phone || '—'} · ठेगाना: {owner.address || '—'}
									</p>
								</div>
							</label>
						);
					})}
				</div>

				<p className="rounded-md border border-border/70 bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
					धनीको फोन नम्बर, सक्रिय SMS नम्बर र ठेगाना मुख्य धनी (पहिलो) अनुसार रहनेछ।
				</p>

				<DialogFooter>
					<Button type="button" variant="outline" onClick={onCancel}>
						रद्द गर्नुहोस्
					</Button>
					<Button type="button" onClick={() => onConfirm(selectedIndex)}>
						धनी पुष्टि गर्नुहोस्
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
