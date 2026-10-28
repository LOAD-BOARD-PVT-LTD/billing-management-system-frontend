'use client';

import { useState } from 'react';
import { Check, ChevronDown, ExternalLink, MapPin, MessageCircle, Phone, Search, UserRound, X } from 'lucide-react';
import { SearchableCombobox } from '@/components/ui/SearchableCombobox';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useTqmsVehicleSearch } from '@/features/billing/hooks/useTqmsVehicleSearch';
import { useUpdateBillingVehiclePhone } from '@/features/billing/hooks/useUpdateBillingVehiclePhone';
import { VehiclePhoneUpdateDialog } from './VehiclePhoneUpdateDialog';
import type { BillingVehicle } from '@/features/billing/model/types';
import type { VehiclePhoneUpdateInput } from '@/features/billing/schemas/vehicle-phone-update.schema';

type BillingHeaderProps = {
	selectedVehicle: BillingVehicle | null;
	onSelectVehicle: (vehicle: BillingVehicle) => void;
	onClearSelection: () => void;
	onSmsPhoneChange: (phone: string) => void;
};

export function BillingHeader({
	selectedVehicle,
	onSelectVehicle,
	onClearSelection,
	onSmsPhoneChange,
}: BillingHeaderProps) {
	const [query, setQuery] = useState('');
	const [isOpen, setIsOpen] = useState(false);
	const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);
	const { toast } = useToast();
	const { updatePhone, isSaving: isUpdatingPhone } = useUpdateBillingVehiclePhone();
	const { vehicles, isLoading, error } = useTqmsVehicleSearch(
		query,
		query.trim() !== selectedVehicle?.vehicleNumber,
	);

	const handleSelect = (vehicle: BillingVehicle) => {
		onSelectVehicle(vehicle);
		setQuery(vehicle.vehicleNumber);
		setIsOpen(false);
	};

	const handleClear = () => {
		setQuery('');
		setIsOpen(false);
		onClearSelection();
	};

	const handleOwnerUpdate = () => {
		if (!selectedVehicle?.id) return;
		const url = new URL(
			`/admin/vehicle/edit/${encodeURIComponent(selectedVehicle.id)}`,
			'https://tqms.bitspanda.com',
		);
		window.open(url.toString(), '_blank', 'noopener,noreferrer');
	};

	const handlePhoneUpdate = async (input: VehiclePhoneUpdateInput) => {
		if (!selectedVehicle) return;
		await updatePhone(selectedVehicle, input);
		onSmsPhoneChange(input.phone);
		setPhoneDialogOpen(false);
		toast({
			title: 'सक्रिय SMS नम्बर परिवर्तन भयो',
			description: `${selectedVehicle.vehicleNumber} का लागि नयाँ नम्बर सुरक्षित भयो।`,
		});
	};

	return (
		<div className="relative z-20 space-y-1">
			<div className="grid grid-cols-[minmax(0,1fr)_32px_32px] items-center gap-1 rounded-md border border-border bg-card p-1 sm:grid-cols-[120px_minmax(0,1fr)_32px_32px]">
				<label htmlFor="billing-vehicle-search" className="hidden pl-2 text-xs font-medium text-muted-foreground sm:block">
					सवारी नम्बर
				</label>
				<SearchableCombobox
					id="billing-vehicle-search"
					value={query}
					open={isOpen}
					items={vehicles}
					isLoading={isLoading}
					errorMessage={error}
					filterItems={false}
					selectedKey={selectedVehicle?.id}
					placeholder="सवारी नम्बर खोज्नुहोस्..."
					emptyMessage="मिल्ने सवारी भेटिएन। नम्बर जाँच्नुहोस् वा अर्को नम्बर खोज्नुहोस्।"
					getKey={(vehicle) => vehicle.id}
					getSearchText={(vehicle) => vehicle.vehicleNumber}
					onValueChange={(value) => {
						setQuery(value);
						if (selectedVehicle) onClearSelection();
					}}
					onOpenChange={setIsOpen}
					onSelect={handleSelect}
					renderItem={(vehicle, isSelected) => (
						<>
							<span className="min-w-0">
								<span className="block truncate font-medium">{vehicle.vehicleNumber}</span>
								<span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
									{vehicle.vehicleType} · {vehicle.ownerName}
								</span>
							</span>
							{isSelected && <Check aria-hidden="true" className="size-4 shrink-0 text-primary" />}
						</>
					)}
					className="min-w-0"
					inputClassName="h-8 rounded-md border-border/70 bg-background text-sm"
				/>
				<button
					type="button"
					aria-label="सवारी खोज्नुहोस्"
					onClick={() => setIsOpen(true)}
					className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					{isOpen ? <ChevronDown aria-hidden="true" className="size-4" /> : <Search aria-hidden="true" className="size-4" />}
				</button>
				<button
					type="button"
					aria-label={selectedVehicle ? 'सवारी परिवर्तन गर्नुहोस्' : 'खोज खाली गर्नुहोस्'}
					onClick={handleClear}
					className="grid size-8 place-items-center rounded-md border border-border bg-background text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					<X aria-hidden="true" className="size-4" />
				</button>
			</div>

			{selectedVehicle && (
				<Card className="overflow-hidden rounded-md border-border/80 bg-card shadow-none">
					<div className="flex flex-wrap items-center justify-end gap-1 border-b border-border/70 px-1 py-0.5">
						<div className="flex flex-wrap gap-1">
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => setPhoneDialogOpen(true)}
								disabled={!selectedVehicle.tqmsVehicleId || isUpdatingPhone}
								leftIcon={<Phone className="h-3.5 w-3.5" />}
								className="h-6 px-1.5 text-[11px]"
							>
								धनीको नम्बर परिवर्तन गर्नुहोस्
							</Button>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={handleOwnerUpdate}
								disabled={!selectedVehicle.tqmsVehicleId}
								leftIcon={<ExternalLink className="h-3.5 w-3.5" />}
								className="h-6 px-1.5 text-[11px]"
							>
								TQMS धनी अपडेट
							</Button>
						</div>
					</div>
					<div className="grid divide-y divide-border/70 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-[1.1fr_1fr_0.9fr_0.9fr_1.6fr] lg:divide-x lg:divide-y-0">
						<div className="min-w-0 px-1.5 py-1">
							<p className="text-[11px] font-medium text-muted-foreground">सवारी प्रकार</p>
							<p className="truncate text-xs font-semibold text-foreground" title={selectedVehicle.vehicleType}>
								{selectedVehicle.vehicleType}
							</p>
						</div>
						<div className="min-w-0 px-1.5 py-1">
							<p className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
								<UserRound aria-hidden="true" className="size-3.5" />धनीको नाम
							</p>
							<p className="truncate text-xs font-semibold text-foreground" title={selectedVehicle.ownerName}>
								{selectedVehicle.ownerName}
							</p>
						</div>
						<div className="min-w-0 px-1.5 py-1">
							<p className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
								<Phone aria-hidden="true" className="size-3.5" />धनीको फोन
							</p>
							<p className="truncate text-xs font-semibold tabular-nums text-foreground">
								{selectedVehicle.phone || 'उपलब्ध छैन'}
							</p>
						</div>
						<div className="min-w-0 px-1.5 py-1">
							<p className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
								<MessageCircle aria-hidden="true" className="size-3.5" />सक्रिय SMS नम्बर
							</p>
							<p className="truncate text-xs font-semibold tabular-nums text-foreground">
								{selectedVehicle.smsPhone || 'उपलब्ध छैन'}
							</p>
						</div>
						<div className="min-w-0 px-1.5 py-1 sm:col-span-2 lg:col-span-1">
							<p className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
								<MapPin aria-hidden="true" className="size-3.5" />धनीको ठेगाना
							</p>
							<p className="line-clamp-2 text-xs font-semibold leading-4 text-foreground" title={selectedVehicle.ownerAddress}>
								{selectedVehicle.ownerAddress || 'ठेगाना उपलब्ध छैन'}
							</p>
						</div>
					</div>
				</Card>
			)}
			{selectedVehicle && (
				<VehiclePhoneUpdateDialog
					key={`${selectedVehicle.id}-${phoneDialogOpen ? 'open' : 'closed'}`}
					vehicle={selectedVehicle}
					open={phoneDialogOpen}
					isSaving={isUpdatingPhone}
					onOpenChange={setPhoneDialogOpen}
					onSubmit={handlePhoneUpdate}
				/>
			)}
		</div>
	);
}
