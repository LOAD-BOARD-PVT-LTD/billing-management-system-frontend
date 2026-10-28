import { useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NepaliDatePicker } from '@/components/ui/nepali-date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBranches } from '@/features/administration/branches/hooks/useBranches';
import type { FiscalYear } from '@/features/billing-rules/model/types';
import type { BillingVehicle } from '@/features/billing/model/types';
import type { BillDetails } from '@/features/billing/model/bill.types';
import { fontasyFromUnicode } from '@/utils/fontasy-himali';
import { bikramSambatToGregorian, parseBikramSambatDate } from '@/utils/nepali-calender-dates/nepali-date';

function parseDate(value: string): Date | undefined {
	const normalizedValue = value.trim();
	const bsDate = parseBikramSambatDate(normalizedValue);
	if (bsDate) return bikramSambatToGregorian(bsDate);

	const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(normalizedValue);
	if (!match) return undefined;
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const date = new Date(year, month - 1, day);
	return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
		? date
		: undefined;
}

type VehicleBillingProps = {
	vehicle: BillingVehicle;
	fiscalYears: FiscalYear[];
	selectedFiscalYearId: string;
	isLoadingBillingRules: boolean;
	billingRulesError: string | null;
	onFiscalYearChange: (id: string) => void;
	onReloadBillingRules: () => void;
	onBillingDetailsChange: (details: BillDetails) => void;
	assignedBranchId?: string | null;
};

export function VehicleBilling({
	vehicle,
	fiscalYears,
	selectedFiscalYearId,
	isLoadingBillingRules,
	billingRulesError,
	onFiscalYearChange,
	onReloadBillingRules,
	onBillingDetailsChange,
	assignedBranchId,
}: VehicleBillingProps) {
	const [billingDate, setBillingDate] = useState<Date | undefined>(() => parseDate(vehicle.billingDate) ?? new Date());
	const [periodStart, setPeriodStart] = useState<Date | undefined>(() => parseDate(vehicle.periodStart) ?? new Date());
	const [periodEnd, setPeriodEnd] = useState<Date | undefined>(() => parseDate(vehicle.periodEnd) ?? new Date());
	const [selectedBranchId, setSelectedBranchId] = useState('');
	const fiscalYearValue = selectedFiscalYearId;
	const selectedFiscalYear = fiscalYears.find((fiscalYear) => fiscalYear.id === fiscalYearValue);
	const { records: branches, isLoading: isLoadingBranches, loadError: branchError, reload: reloadBranches } = useBranches();
	const activeBranches = branches.filter((branch) => branch.status === 'ACTIVE');
	const vehicleBranch = vehicle.branch.trim().toLocaleLowerCase();
	const matchedBranch = activeBranches.find((branch) =>
		[branch.name, branch.code].some((value) => value.trim().toLocaleLowerCase() === vehicleBranch),
	);
	const assignedBranch = activeBranches.find((branch) => branch.id === assignedBranchId);
	const branchValue = selectedBranchId || assignedBranch?.id || matchedBranch?.id || '';
	const selectedBranch = activeBranches.find((branch) => branch.id === branchValue);
	const toDateValue = (date: Date | undefined) => date
		? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
		: '';

	useEffect(() => {
		onBillingDetailsChange({
			branchId: branchValue,
			branchName: selectedBranch?.name ?? '',
			branchCode: selectedBranch?.code ?? '',
			branchAddress: selectedBranch?.address ?? '',
			branchPhone: selectedBranch?.phone ?? '',
			branchContactPerson: selectedBranch?.contactPerson ?? '',
			allowManualReceiptAmountOverride: selectedBranch?.allowManualReceiptAmountOverride ?? false,
			fiscalYearId: selectedFiscalYear?.id ?? '',
			fiscalYearName: selectedFiscalYear?.name ?? '',
			billingDate: toDateValue(billingDate),
			periodStart: toDateValue(periodStart),
			periodEnd: toDateValue(periodEnd),
			billingMonths: 0,
		});
	}, [
		billingDate,
		branchValue,
		onBillingDetailsChange,
		periodEnd,
		periodStart,
		selectedBranch?.name,
		selectedBranch?.code,
		selectedBranch?.address,
		selectedBranch?.phone,
		selectedBranch?.contactPerson,
		selectedBranch?.allowManualReceiptAmountOverride,
		selectedFiscalYear?.id,
		selectedFiscalYear?.name,
	]);

	return (
		<section className="rounded-md border border-border bg-card">
			<div className="grid gap-x-2 gap-y-1 p-1 sm:grid-cols-2 xl:grid-cols-5">
				<label className="space-y-0.5 text-xs text-muted-foreground">
					शाखा
					<Select value={branchValue} onValueChange={setSelectedBranchId} disabled={isLoadingBranches || Boolean(branchError) || activeBranches.length === 0}>
						<SelectTrigger aria-label="बिलिङ शाखा छान्नुहोस्" className="h-7 rounded-md px-2 py-0 text-sm">
							{isLoadingBranches
								? <span className="flex items-center gap-2"><LoaderCircle aria-hidden="true" className="size-4 animate-spin" />शाखा लोड हुँदैछ...</span>
								: <SelectValue placeholder="बिलिङ शाखा छान्नुहोस्" />}
						</SelectTrigger>
						<SelectContent>
							{activeBranches.map((branch) => (
								<SelectItem key={branch.id} value={branch.id}>
									{branch.name} ({branch.code})
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{branchError ? (
						<span role="alert" className="block text-xs text-destructive">
							{branchError}
							<Button type="button" variant="link" size="xs" className="ml-1 h-auto p-0" onClick={() => void reloadBranches()}>
								पुनः प्रयास
							</Button>
						</span>
					) : !isLoadingBranches && activeBranches.length === 0 ? (
						<span role="status" className="block text-xs text-muted-foreground">कुनै सक्रिय शाखा उपलब्ध छैन।</span>
					) : null}
				</label>
				<label className="space-y-0.5 text-xs text-muted-foreground">
					वित्तीय वर्ष
					<Select
						value={fiscalYearValue}
						onValueChange={onFiscalYearChange}
						disabled={isLoadingBillingRules || fiscalYears.length === 0}
					>
						<SelectTrigger aria-label="वित्तीय वर्ष छान्नुहोस्" className="h-7 rounded-md px-2 py-0 text-sm">
							{isLoadingBillingRules && fiscalYears.length === 0
								? <span className="flex items-center gap-2"><LoaderCircle aria-hidden="true" className="size-4 animate-spin" />वित्तीय वर्ष लोड हुँदैछ...</span>
								: (
									<SelectValue placeholder="वित्तीय वर्ष छान्नुहोस्">
										{selectedFiscalYear && (
											<span className="font-fontasy-himali-tt-input">
												{fontasyFromUnicode(selectedFiscalYear.name)}
											</span>
										)}
									</SelectValue>
								)}
						</SelectTrigger>
						<SelectContent>
							{fiscalYears.map((fiscalYear) => (
								<SelectItem key={fiscalYear.id} value={fiscalYear.id} className="font-fontasy-himali-tt-input">
									{fontasyFromUnicode(fiscalYear.name)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{billingRulesError && fiscalYears.length === 0 ? (
						<span role="alert" className="block text-xs text-destructive">
							वित्तीय वर्ष लोड गर्न सकिएन: {billingRulesError}
							<Button type="button" variant="link" size="xs" className="ml-1 h-auto p-0" onClick={onReloadBillingRules}>
								पुनः प्रयास
							</Button>
						</span>
					) : !isLoadingBillingRules && fiscalYears.length === 0 ? (
						<span role="status" className="block text-xs text-muted-foreground">Billing Rules response मा वित्तीय वर्ष उपलब्ध छैन।</span>
					) : null}
				</label>
				<label className="space-y-0.5 text-xs text-muted-foreground">
					भुक्तानी मिति
					<NepaliDatePicker
						value={billingDate}
						onChange={setBillingDate}
						placeholder="भुक्तानी मिति छान्नुहोस्"
						className="h-7 rounded-md"
					/>
				</label>
				<label className="space-y-0.5 text-xs text-muted-foreground">
					देखि
					<NepaliDatePicker
						value={periodStart}
						onChange={(date) => {
							setPeriodStart(date);
							if (date && periodEnd && date > periodEnd) setPeriodEnd(undefined);
						}}
						placeholder="सुरु मिति छान्नुहोस्"
						className="h-7 rounded-md"
					/>
				</label>
				<label className="space-y-0.5 text-xs text-muted-foreground">
					सम्म
					<NepaliDatePicker
						value={periodEnd}
						onChange={setPeriodEnd}
						fromDate={periodStart}
						placeholder="अन्त्य मिति छान्नुहोस्"
						className="h-7 rounded-md"
					/>
				</label>
			</div>
		</section>
	);
}
