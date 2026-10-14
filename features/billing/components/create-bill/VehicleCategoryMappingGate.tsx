'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowRight, LoaderCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useVehicleCategoryMapping } from '@/features/billing/hooks/useVehicleCategoryMapping';
import type { BillingVehicle } from '@/features/billing/model/types';

export function VehicleCategoryMappingGate({
	vehicle,
	children,
}: {
	vehicle: BillingVehicle;
	children: ReactNode | ((mappedCategoryId: string) => ReactNode);
}) {
	const mapping = useVehicleCategoryMapping(vehicle);
	const [categoryId, setCategoryId] = useState('');
	const [actionError, setActionError] = useState<string | null>(null);
	const [isSyncingTypes, setIsSyncingTypes] = useState(false);

	if (mapping.state === 'mapped') {
		return <>{typeof children === 'function' ? children(mapping.mappedCategory!.id) : children}</>;
	}

	const selectedCategory = mapping.categories.find((category) => category.id === categoryId) ?? null;

	const handleMapCategory = async () => {
		if (!selectedCategory) return;
		setActionError(null);
		try {
			await mapping.mapToCategory(selectedCategory);
		} catch (error) {
			setActionError(error instanceof Error ? error.message : 'सवारी श्रेणी म्याप गर्न सकिएन।');
		}
	};

	const handleSyncTypes = async () => {
		setIsSyncingTypes(true);
		setActionError(null);
		try {
			await mapping.syncTqmsTypes();
			await mapping.reloadTqmsTypes();
		} catch (error) {
			setActionError(error instanceof Error ? error.message : 'TQMS सवारी प्रकार सिंक गर्न सकिएन।');
		} finally {
			setIsSyncingTypes(false);
		}
	};

	return (
		<section aria-live="polite" className="mx-auto max-w-2xl rounded-xl border border-amber-200 bg-amber-50/70 p-5 shadow-sm">
			<div className="flex items-start gap-3">
				<div className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-700">
					{mapping.state === 'checking'
						? <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
						: <AlertCircle aria-hidden="true" className="size-5" />}
				</div>
				<div className="min-w-0 flex-1">
					<h2 className="text-base font-semibold text-foreground">
						{mapping.state === 'checking' ? 'सवारी श्रेणी म्यापिङ जाँच हुँदैछ' : 'बिलिङका लागि सवारी श्रेणी म्यापिङ आवश्यक'}
					</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						सवारी: <span className="font-medium text-foreground">{vehicle.vehicleNumber}</span>
						<span className="px-1.5">·</span>
						TQMS सवारी प्रकार: <span className="font-medium text-foreground">{vehicle.vehicleType}</span>
					</p>

					{mapping.state === 'checking' ? (
						<p className="mt-3 text-sm text-muted-foreground">TQMS प्रकार र बिलिङ सवारी श्रेणी जाँच हुँदैछ...</p>
					) : mapping.state === 'error' ? (
						<div role="alert" className="mt-3 space-y-2 text-sm text-destructive">
							{!mapping.tqmsType ? (
								<div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
									<p className="font-medium">TQMS सवारी प्रकार “{vehicle.vehicleType}” Vehicle Types मा भेटिएन।</p>
									<p className="mt-1">कृपया Vehicle Types मा mapping राखेपछि मात्र रसिद बनाउनुहोस्।</p>
									<Link
										href="/dashboard/vehicle-types"
										className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-md bg-red-700 px-3 py-2 font-medium text-white transition-colors hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
									>
										Vehicle Types mapping मा जानुहोस्
										<ArrowRight aria-hidden="true" className="size-4" />
									</Link>
								</div>
							) : (
								<p>{mapping.error}</p>
							)}
							<div className="flex flex-wrap gap-2">
								<Button type="button" size="sm" variant="outline" onClick={() => void mapping.reloadCategories()}>
									बिलिङ श्रेणी पुनः लोड
								</Button>
								<Button type="button" size="sm" variant="outline" onClick={() => void mapping.reloadTqmsTypes()}>
									TQMS प्रकार पुनः लोड
								</Button>
								{!mapping.tqmsType && (
									<Button type="button" size="sm" variant="outline" onClick={() => void handleSyncTypes()} loading={isSyncingTypes}>
										<RefreshCw aria-hidden="true" className="mr-2 size-4" />
										TQMS प्रकार सिंक गर्नुहोस्
									</Button>
								)}
							</div>
							{actionError && <p>{actionError}</p>}
						</div>
					) : (
						<div className="mt-4 space-y-3">
							<p role="alert" className="text-sm text-amber-900">
								यो सवारीको TQMS प्रकार <span className="font-semibold">{mapping.tqmsType?.name}</span> कुनै Billing Vehicle Category मा म्याप गरिएको छैन। म्यापिङ नभएसम्म बिलिङ गर्न सकिँदैन।
							</p>
							{mapping.categories.length === 0 ? (
								<p className="text-sm text-destructive">
									Billing Vehicle Category उपलब्ध छैन। पहिले Vehicle Category स्रोतमा श्रेणी सिर्जना गर्नुहोस्।
								</p>
							) : (
								<div className="flex flex-col gap-2 sm:flex-row">
									<Select value={categoryId} onValueChange={setCategoryId}>
										<SelectTrigger aria-label="Billing Vehicle Category">
											<SelectValue placeholder="Billing Vehicle Category छान्नुहोस्" />
										</SelectTrigger>
										<SelectContent>
											{mapping.categories.map((category) => (
												<SelectItem key={category.id} value={category.id}>
													{category.category}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<Button
										type="button"
										onClick={() => void handleMapCategory()}
										loading={mapping.isSaving}
										disabled={!selectedCategory || !mapping.tqmsType || mapping.isSaving}
									>
										सवारी श्रेणी म्याप गर्नुहोस्
									</Button>
								</div>
							)}
							{actionError && <p role="alert" className="text-sm text-destructive">{actionError}</p>}
						</div>
					)}
				</div>
			</div>
		</section>
	);
}
