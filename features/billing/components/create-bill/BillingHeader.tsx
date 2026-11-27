'use client';

import { memo, useEffect, useState } from 'react';
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
	Users,
	X,
} from 'lucide-react';
import { SearchableCombobox } from '@/components/ui/SearchableCombobox';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/components/ui/use-toast';
import { getOptionalTqmsUrl } from '@/lib/config/tqms';
import { useTqmsVehicleSearch } from '@/features/billing/hooks/useTqmsVehicleSearch';
import { useUpdateBillingVehiclePhone } from '@/features/billing/hooks/useUpdateBillingVehiclePhone';
import {
	readVehicleManagementTags,
	VEHICLE_MANAGEMENT_TAGS,
	type VehicleManagementTag,
	type VehicleResourceDocument,
} from '@/features/billing/api/vehicle-resource.api';
import { useUpdateBillingVehicleManagementTags } from '@/features/billing/hooks/useUpdateBillingVehicleManagementTags';
import {
	useVehicleReconciliation,
	type ReconciliationFieldDiff,
} from '@/features/reconciliation';
import { VehiclePhoneUpdateDialog } from './VehiclePhoneUpdateDialog';
import { requiresDhaniOwnerSelection } from '@/features/billing/utils/resolve-tqms-vehicle-owners';
import type { BillingVehicle } from '@/features/billing/model/types';
import type { TqmsVehicleSearchMatch } from '@/features/billing/schemas/tqms-vehicle-search.schema';
import type { VehiclePhoneUpdateInput } from '@/features/billing/schemas/vehicle-phone-update.schema';
import type { ReceiptRecord } from '@/features/receipts/model/receipt';

const MANAGEMENT_TAG_LABELS: Record<VehicleManagementTag, string> = {
	swoyam: 'स्वयम्',
	sangh: 'संघ',
};

type BillingHeaderProps = {
	selectedVehicle: BillingVehicle | null;
	onSelectVehicle: (vehicle: BillingVehicle) => void;
	onClearSelection: () => void;
	onSmsPhoneChange: (phone: string) => void;
	onVehicleResourceStatusChange: (vehicleId: string | null) => void;
	onOpenOwnerSelect?: () => void;
	loadReceipts: () => Promise<ReceiptRecord[]>;
	onPendingVehicleCacheSync?: (
		pending: { billingResource: VehicleResourceDocument; tqmsVehicle: BillingVehicle } | null,
	) => void;
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
	onVehicleResourceStatusChange,
	onOpenOwnerSelect,
	loadReceipts,
	onPendingVehicleCacheSync,
	onReconciliationRequired,
}: BillingHeaderProps) {
	const canSelectDhaniOwner = selectedVehicle
		? requiresDhaniOwnerSelection(
			selectedVehicle.resourceContent?.Owners ?? selectedVehicle.resourceContent?.owners,
		)
		: false;
	const operatorName = selectedVehicle?.operatorName?.trim();
	const hasDistinctOperator = Boolean(
		operatorName && operatorName !== selectedVehicle?.ownerName.trim(),
	);
	const [query, setQuery] = useState('');
	const [isOpen, setIsOpen] = useState(false);
	const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);
	const [managementTags, setManagementTags] = useState<VehicleManagementTag[]>([]);
	const [isLoadingManagementTags, setIsLoadingManagementTags] = useState(false);
	const [managementTagsError, setManagementTagsError] = useState<string | null>(null);
	const [managementTagsRetry, setManagementTagsRetry] = useState(0);
	const { toast } = useToast();
	const { updatePhone, isSaving: isUpdatingPhone } = useUpdateBillingVehiclePhone();
	const {
		updateManagementTags,
		isSaving: isUpdatingManagementTags,
	} = useUpdateBillingVehicleManagementTags();
	const { reconcileLookup, isReconciling } = useVehicleReconciliation();

	const { matches, isLoading, error } = useTqmsVehicleSearch(
		query,
		isOpen,
	);

	useEffect(() => {
		let isCurrent = true;
		if (!selectedVehicle) {
			setManagementTags([]);
			setManagementTagsError(null);
			setIsLoadingManagementTags(false);
			return () => {
				isCurrent = false;
			};
		}

		setManagementTags([]);
		setIsLoadingManagementTags(true);
		setManagementTagsError(null);
		void readVehicleManagementTags(selectedVehicle)
			.then((tags) => {
				if (isCurrent) setManagementTags(tags);
			})
			.catch((cause: unknown) => {
				if (isCurrent) {
					setManagementTagsError(
						cause instanceof Error ? cause.message : 'कृपया पुनः प्रयास गर्नुहोस्।',
					);
				}
			})
			.finally(() => {
				if (isCurrent) setIsLoadingManagementTags(false);
			});

		return () => {
			isCurrent = false;
		};
	}, [selectedVehicle, managementTagsRetry]);

	const handleManagementTagChange = async (tag: VehicleManagementTag, checked: boolean) => {
		if (!selectedVehicle) return;
		const nextTags = VEHICLE_MANAGEMENT_TAGS.filter((value) => (
			checked ? managementTags.includes(value) || value === tag : managementTags.includes(value) && value !== tag
		));
		setManagementTagsError(null);
		try {
			await updateManagementTags(selectedVehicle, nextTags);
			setManagementTags(nextTags);
		} catch (cause) {
			const message = cause instanceof Error ? cause.message : 'कृपया पुनः प्रयास गर्नुहोस्।';
			setManagementTagsError(message);
			toast({
				title: 'व्यवस्थापन ट्याग सुरक्षित गर्न सकिएन',
				description: message,
				variant: 'destructive',
			});
		}
	};

	const handleSelect = async (vehicle: BillingVehicle, searchMatch?: TqmsVehicleSearchMatch) => {
		setQuery(vehicle.vehicleNumber);
		setIsOpen(false);

		try {
			const billingHistory = await loadReceipts();
			const result = await reconcileLookup(vehicle.vehicleNumber, {
				...(searchMatch ? { preloadedMatch: searchMatch } : {}),
				fallbackSmsPhone: vehicle.smsPhone,
				receipts: billingHistory,
			});

			if (result.type === 'RESOURCE_MISSING') {
				onPendingVehicleCacheSync?.(null);
				onVehicleResourceStatusChange(result.tqmsVehicle.tqmsVehicleId);
				if (result.tqmsVehicle.id !== selectedVehicle?.id) onSelectVehicle(result.tqmsVehicle);
				toast({
					title: 'सवारी प्रोफाइल पुनःस्थापना आवश्यक',
					description: result.hasBillingHistory
						? 'पुरानो बिल भेटियो तर VehicleResource प्रोफाइल छैन। हालको TQMS विवरण प्रयोग हुनेछ र बिल बचत गर्दा प्रोफाइल बनाइनेछ।'
						: 'VehicleResource प्रोफाइल छैन। बिल बचत गर्दा हालको TQMS विवरणबाट प्रोफाइल बनाइनेछ।',
				});
				return;
			}

			if (result.type === 'MATCHED') {
				onVehicleResourceStatusChange(null);
				onPendingVehicleCacheSync?.(
					result.needsCacheSync && result.tqmsVehicle
						? { billingResource: result.billingResource, tqmsVehicle: result.tqmsVehicle }
						: null,
				);
				const vehicleToSelect = result.billingVehicle;
				if (vehicleToSelect && (result.needsCacheSync || vehicleToSelect.id !== selectedVehicle?.id)) {
					onSelectVehicle(vehicleToSelect);
				}
				return;
			}

			if (result.type === 'RECONCILIATION_REQUIRED') {
				onPendingVehicleCacheSync?.(null);
				onVehicleResourceStatusChange(null);
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
		onPendingVehicleCacheSync?.(null);
		onClearSelection();
	};

	const handleOwnerUpdate = () => {
		if (!selectedVehicle?.tqmsVehicleId) return;
		const url = getOptionalTqmsUrl(`/admin/vehicle/edit/${encodeURIComponent(selectedVehicle.tqmsVehicleId)}`);
		if (!url) {
			toast({
				title: 'TQMS लिङ्क उपलब्ध छैन',
				description: 'NEXT_PUBLIC_TQMS_BASE_URL कन्फिगर गरिएको छैन।',
				variant: 'destructive',
			});
			return;
		}
		window.open(url, '_blank', 'noopener,noreferrer');
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
					items={matches}
					isLoading={isLoading || isReconciling}
					errorMessage={error}
					filterItems={false}
					selectedKey={selectedVehicle?.id}
					placeholder={isReconciling ? 'विवरण प्रमाणीकरण गर्दैछ...' : 'सवारी नम्बर खोज्नुहोस्...'}
					emptyMessage="मिल्ने सवारी भेटिएन। नम्बर जाँच्नुहोस् वा अर्को नम्बर खोज्नुहोस्।"
					getKey={(match) => match.tqmsVehicle.id}
					getSearchText={(match) => match.tqmsVehicle.vehicleNumber}
					onValueChange={(value) => {
						setQuery(value);
						if (selectedVehicle) onClearSelection();
					}}
					onOpenChange={setIsOpen}
					onSelect={(match) => void handleSelect(match.tqmsVehicle, match)}
					renderItem={(match, isSelected) => (
						<>
							<span className="min-w-0">
								<span className="block truncate font-medium">{match.tqmsVehicle.vehicleNumber}</span>
								<span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
									{match.tqmsVehicle.vehicleType} · {match.tqmsVehicle.ownerName}
									{match.cacheVehicle ? ' · बिलिङमा अभिलेख छ' : ''}
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
					<div className="flex flex-wrap items-center justify-between gap-1 border-b border-border/70 px-1 py-0.5">
						<Popover>
							<PopoverTrigger asChild>
								<Button
									type="button"
									variant="outline"
									size="sm"
									disabled={isLoadingManagementTags || isUpdatingManagementTags}
									rightIcon={isLoadingManagementTags
										? <LoaderCircle className="h-3 w-3 animate-spin" />
										: <ChevronDown className="h-3 w-3" />}
									aria-label="सवारी व्यवस्थापन ट्याग छान्नुहोस्"
									className="h-6 px-1.5 text-[11px]"
								>
									व्यवस्थापन
									{managementTags.length > 0
										? ` · ${managementTags.map((tag) => MANAGEMENT_TAG_LABELS[tag]).join(', ')}`
										: ''}
								</Button>
							</PopoverTrigger>
							<PopoverContent align="start" className="w-56 space-y-2 p-2">
								<p className="text-xs font-medium text-foreground">व्यवस्थापन ट्याग</p>
								{managementTagsError ? (
									<div className="space-y-1">
										<p role="alert" className="text-xs text-destructive">{managementTagsError}</p>
										<Button
											type="button"
											variant="link"
											size="xs"
											className="h-auto p-0 text-xs"
											onClick={() => setManagementTagsRetry((attempt) => attempt + 1)}
										>
											पुनः प्रयास गर्नुहोस्
										</Button>
									</div>
								) : null}
								{VEHICLE_MANAGEMENT_TAGS.map((tag) => (
									<label key={tag} className="flex cursor-pointer items-center gap-2 text-sm">
										<Checkbox
											checked={managementTags.includes(tag)}
											disabled={isLoadingManagementTags || isUpdatingManagementTags || Boolean(managementTagsError)}
											onCheckedChange={(checked) => {
												void handleManagementTagChange(tag, checked === true);
											}}
										/>
										{MANAGEMENT_TAG_LABELS[tag]}
									</label>
								))}
								{isLoadingManagementTags ? (
									<p role="status" className="text-xs text-muted-foreground">व्यवस्थापन ट्याग लोड हुँदैछ...</p>
								) : null}
							</PopoverContent>
						</Popover>
						<div className="flex flex-wrap gap-1">
							{canSelectDhaniOwner && onOpenOwnerSelect ? (
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={onOpenOwnerSelect}
									leftIcon={<Users className="h-3.5 w-3.5" />}
									className="h-6 px-1.5 text-[11px]"
								>
									धनी छान्नुहोस्
								</Button>
							) : null}
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

					<div className="grid grid-cols-2 gap-1.5 p-2 sm:grid-cols-3 lg:grid-cols-6">
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

						{hasDistinctOperator ? (
							<div className="space-y-0.5">
								<p className="flex items-center gap-1 text-[11px] text-muted-foreground">
									<UserRound className="h-3 w-3" /> संचालकको नाम
								</p>
								<p
									className="truncate text-xs font-semibold text-foreground"
									title={operatorName}
								>
									{operatorName}
								</p>
							</div>
						) : null}

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
