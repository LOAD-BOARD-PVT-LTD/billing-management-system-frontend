'use client';

import { memo, useState } from 'react';
import {
	Check,
	ChevronDown,
	ExternalLink,
	LoaderCircle,
	MapPin,
	MessageCircle,
	Phone,
	Search,
	Truck,
	UserRound,
	X,
} from 'lucide-react';
import { SearchableCombobox } from '@/components/ui/SearchableCombobox';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { getTqmsUrl } from '@/lib/config/tqms';
import { useTqmsVehicleSearch } from '@/features/billing/hooks/useTqmsVehicleSearch';
import { useUpdateBillingVehiclePhone } from '@/features/billing/hooks/useUpdateBillingVehiclePhone';
import type { VehicleResourceDocument } from '@/features/billing/api/vehicle-resource.api';
import {
	useVehicleReconciliation,
	type ReconciliationFieldDiff,
} from '@/features/reconciliation';
import { VehiclePhoneUpdateDialog } from './VehiclePhoneUpdateDialog';
import type { BillingVehicle } from '@/features/billing/model/types';
import type { VehiclePhoneUpdateInput } from '@/features/billing/schemas/vehicle-phone-update.schema';
import type { ReceiptRecord } from '@/features/receipts/model/receipt';

type BillingHeaderProps = {
	selectedVehicle: BillingVehicle | null;
	onSelectVehicle: (vehicle: BillingVehicle) => void;
	onClearSelection: () => void;
	onSmsPhoneChange: (phone: string) => void;
	loadReceipts: () => Promise<ReceiptRecord[]>;
	onReconciliationRequired?: (data: {
		billingVehicle: BillingVehicle;
		tqmsVehicle: BillingVehicle;
		billingResource: VehicleResourceDocument;
		diffs: ReconciliationFieldDiff[];
		receipts: ReceiptRecord[];
	}) => void;
};

export const BillingHeader = memo(function BillingHeader({
	selectedVehicle,
	onSelectVehicle,
	onClearSelection,
	onSmsPhoneChange,
	loadReceipts,
	onReconciliationRequired,
}: BillingHeaderProps) {
	const [query, setQuery] = useState('');
	const [isOpen, setIsOpen] = useState(false);
	const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);
	const { toast } = useToast();
	const { updatePhone, isSaving: isUpdatingPhone } = useUpdateBillingVehiclePhone();
	const { reconcileLookup, isReconciling } = useVehicleReconciliation();

	const { vehicles, isLoading, error } = useTqmsVehicleSearch(
		query,
		isOpen,
	);

	const handleSelect = async (vehicle: BillingVehicle) => {
		setQuery(vehicle.vehicleNumber);
		setIsOpen(false);

		try {
			const billingHistory = await loadReceipts();
			const result = await reconcileLookup(vehicle.vehicleNumber, {
				preloadedTqms: vehicle,
				fallbackSmsPhone: vehicle.smsPhone,
				receipts: billingHistory,
			});

			if (result.type === 'FIRST_TIME') {
				if (result.tqmsVehicle.id !== selectedVehicle?.id) onSelectVehicle(result.tqmsVehicle);
				return;
			}

			if (result.type === 'MATCHED') {
				const vehicleToSelect = result.billingVehicle;
				if (vehicleToSelect && vehicleToSelect.id !== selectedVehicle?.id) {
					onSelectVehicle(vehicleToSelect);
				}
				return;
			}

			if (result.type === 'RECONCILIATION_REQUIRED') {
				onReconciliationRequired?.({
					billingVehicle: result.billingVehicle,
					tqmsVehicle: result.tqmsVehicle,
					billingResource: result.billingResource,
					diffs: result.diffs,
					receipts: billingHistory,
				});
			}
		} catch (error) {
			toast({
				title: 'सवारी विवरण जाँच गर्न सकिएन',
				description: error instanceof Error ? error.message : 'कृपया पुनः प्रयास गर्नुहोस्।',
				variant: 'destructive',
			});
		}
	};

	const handleClear = () => {
		setQuery('');
		setIsOpen(false);
		onClearSelection();
	};

	const handleOwnerUpdate = () => {
		if (!selectedVehicle?.tqmsVehicleId) return;
		window.open(
			getTqmsUrl(`/admin/vehicle/edit/${encodeURIComponent(selectedVehicle.tqmsVehicleId)}`),
			'_blank',
			'noopener,noreferrer',
		);
	};

	const handlePhoneUpdate = async (input: VehiclePhoneUpdateInput) => {
		if (!selectedVehicle) return;
		await updatePhone(selectedVehicle, input);
		onSmsPhoneChange(input.phone);
		setPhoneDialogOpen(false);
		toast({
			title: 'SMS नम्बर परिवर्तन भयो',
			description: `${selectedVehicle.vehicleNumber} का लागि नयाँ नम्बर सुरक्षित भयो।`,
		});
	};

	return (
		<div className="relative z-20 space-y-1">
			<div className="grid grid-cols-[minmax(0,1fr)_32px_32px] items-center gap-1 rounded-md border border-border bg-card p-1 sm:grid-cols-[120px_minmax(0,1fr)_32px_32px]">
				<label
					htmlFor="billing-vehicle-search"
					className="hidden pl-2 text-xs font-medium text-muted-foreground sm:block"
				>
					सवारी नम्बर
				</label>
				<SearchableCombobox
					id="billing-vehicle-search"
					value={query}
					open={isOpen}
					items={vehicles}
					isLoading={isLoading || isReconciling}
					errorMessage={error}
					filterItems={false}
					selectedKey={selectedVehicle?.id}
					placeholder={isReconciling ? 'विवरण प्रमाणीकरण गर्दैछ...' : 'सवारी नम्बर खोज्नुहोस्...'}
					emptyMessage="मिल्ने सवारी भेटिएन। नम्बर जाँच्नुहोस् वा अर्को नम्बर खोज्नुहोस्।"
					getKey={(vehicle) => vehicle.id}
					getSearchText={(vehicle) => vehicle.vehicleNumber}
					onValueChange={(value) => {
						setQuery(value);
						if (selectedVehicle) onClearSelection();
					}}
					onOpenChange={setIsOpen}
					onSelect={(vehicle) => void handleSelect(vehicle)}
					renderItem={(vehicle, isSelected) => (
						<>
							<span className="min-w-0">
								<span className="block truncate font-medium">{vehicle.vehicleNumber}</span>
								<span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
									{vehicle.vehicleType} · {vehicle.ownerName}
								</span>
							</span>
							{isSelected && (
								<Check aria-hidden="true" className="size-4 shrink-0 text-primary" />
							)}
						</>
					)}
					className="min-w-0"
					inputClassName="h-8 rounded-md border-border/70 bg-background text-sm"
				/>
				<button
					type="button"
					aria-label="सवारी खोज्नुहोस्"
					disabled={isReconciling}
					onClick={() => {
						const trimmed = query.trim();
						if (trimmed) {
							void handleSelect({ vehicleNumber: trimmed, id: trimmed } as BillingVehicle);
						} else {
							setIsOpen((prev) => !prev);
						}
					}}
					className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
				>
					{isReconciling ? (
						<LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
					) : isOpen ? (
						<ChevronDown aria-hidden="true" className="size-4" />
					) : (
						<Search aria-hidden="true" className="size-4" />
					)}
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
								SMS नम्बर परिवर्तन गर्नुहोस्
							</Button>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={handleOwnerUpdate}
								disabled={!selectedVehicle.tqmsVehicleId}
								rightIcon={<ExternalLink className="h-3 w-3" />}
								className="h-6 px-1.5 text-[11px]"
							>
								मालिकको विवरण सच्याउनुहोस्
							</Button>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-1.5 p-2 sm:grid-cols-3 lg:grid-cols-5">
						<div className="space-y-0.5">
							<p className="flex items-center gap-1 text-[11px] text-muted-foreground">
								<Truck className="h-3 w-3" /> सवारी प्रकार
							</p>
							<p
								className="truncate text-xs font-semibold text-foreground"
								title={selectedVehicle.vehicleType}
							>
								{selectedVehicle.vehicleType || 'सवारी प्रकार उपलब्ध छैन'}
							</p>
						</div>

						<div className="space-y-0.5">
							<p className="flex items-center gap-1 text-[11px] text-muted-foreground">
								<UserRound className="h-3 w-3" /> धनीको नाम
							</p>
							<p
								className="truncate text-xs font-semibold text-foreground"
								title={selectedVehicle.ownerName}
							>
								{selectedVehicle.ownerName || 'मालिकको विवरण उपलब्ध छैन'}
							</p>
						</div>

						<div className="space-y-0.5">
							<p className="flex items-center gap-1 text-[11px] text-muted-foreground">
								<Phone className="h-3 w-3" /> धनीको फोन
							</p>
							<p className="truncate text-xs font-semibold text-foreground">
								{selectedVehicle.phone || 'फोन उपलब्ध छैन'}
							</p>
						</div>

						<div className="space-y-0.5">
							<p className="flex items-center gap-1 text-[11px] text-muted-foreground">
								<MessageCircle className="h-3 w-3" /> सक्रिय SMS नम्बर
							</p>
							<p className="truncate text-xs font-semibold text-foreground">
								{selectedVehicle.smsPhone || selectedVehicle.phone || 'उपलब्ध छैन'}
							</p>
						</div>

						<div className="space-y-0.5">
							<p className="flex items-center gap-1 text-[11px] text-muted-foreground">
								<MapPin className="h-3 w-3" /> धनीको ठेगाना
							</p>
							<p
								className="line-clamp-2 text-xs font-semibold leading-4 text-foreground"
								title={selectedVehicle.ownerAddress}
							>
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
});
