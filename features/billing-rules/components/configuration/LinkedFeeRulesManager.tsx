'use client';

import { useMemo, useState } from 'react';
import { Link2, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';

import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLinkedFeeRules } from '@/features/settings/hooks/useLinkedFeeRules';
import { validateLinkedFeeRules, type LinkedFeeRule, type LinkedFeeRulesSettings } from '@/features/settings/api/linked-fee-rules.api';
import { useBillingRuleConfig } from '@/features/billing-rules/hooks/useBillingRuleConfig';
import { formatFiscalYearForDisplay } from '@/utils/nepali-calender-dates/nepali-fiscal-year';

function createRule(fiscalYearId: string): LinkedFeeRule {
	return {
		id: crypto.randomUUID(),
		fiscalYearId,
		sourceFeeHeadId: '',
		linkedFeeHeadId: '',
		active: true,
		oncePerFiscalYear: false,
	};
}

export function LinkedFeeRulesManager() {
	const { settings, isLoading, isSaving, error, reload, save } = useLinkedFeeRules();
	const {
		config,
		isLoading: isLoadingBillingRules,
		error: billingRulesError,
		reload: reloadBillingRules,
	} = useBillingRuleConfig();
	const { feeHeads, fiscalYears } = config;
	const [draftState, setDraftState] = useState<{
		source: LinkedFeeRulesSettings;
		value: LinkedFeeRulesSettings;
	} | null>(null);
	const [fiscalYearId, setFiscalYearId] = useState('');
	const [actionError, setActionError] = useState<string | null>(null);
	const [saved, setSaved] = useState(false);

	const draft = draftState?.source === settings ? draftState.value : settings;
	const updateDraft = (update: (current: LinkedFeeRulesSettings) => LinkedFeeRulesSettings) => {
		if (!settings) return;
		setDraftState((current) => {
			const currentValue = current?.source === settings ? current.value : settings;
			return { source: settings, value: update(currentValue) };
		});
	};

	const availableYears = useMemo(
		() => [...fiscalYears].sort((left, right) => right.startDate.localeCompare(left.startDate)),
		[fiscalYears],
	);
	const defaultYear = availableYears.find((year) => year.status === 'ACTIVE' && year.isDefault)
		?? availableYears.find((year) => year.status === 'ACTIVE')
		?? availableYears[0];
	const selectedYearId = availableYears.some((year) => year.id === fiscalYearId)
		? fiscalYearId
		: defaultYear?.id ?? '';
	const yearFeeHeads = feeHeads.filter((feeHead) => (
		feeHead.status === 'ACTIVE' && (!feeHead.fiscalYearId || feeHead.fiscalYearId === selectedYearId)
	));
	const yearRules = draft?.rules.filter((rule) => rule.fiscalYearId === selectedYearId) ?? [];
	const isDirty = Boolean(draft && settings && JSON.stringify(draft) !== JSON.stringify(settings));
	const loadError = error ?? billingRulesError;

	const updateRule = (id: string, changes: Partial<LinkedFeeRule>) => {
		const normalizedChanges = changes.sourceFeeHeadId
			? changes.sourceFeeHeadId === draft?.rules.find((rule) => rule.id === id)?.linkedFeeHeadId
				? { ...changes, linkedFeeHeadId: '' }
				: changes
			: changes;
		updateDraft((current) => ({
			...current,
			rules: current.rules.map((rule) => rule.id === id ? { ...rule, ...normalizedChanges } : rule),
		}));
		setSaved(false);
		setActionError(null);
	};

	const saveDraft = async () => {
		if (!draft) return;
		setActionError(null);
		setSaved(false);
		try {
			validateLinkedFeeRules(draft);
			for (const rule of draft.rules) {
				const sourceExists = feeHeads.some((feeHead) => feeHead.id === rule.sourceFeeHeadId && (!feeHead.fiscalYearId || feeHead.fiscalYearId === rule.fiscalYearId));
				const linkedExists = feeHeads.some((feeHead) => feeHead.id === rule.linkedFeeHeadId && (!feeHead.fiscalYearId || feeHead.fiscalYearId === rule.fiscalYearId));
				if (!sourceExists || !linkedExists) throw new Error('नियममा छानिएको शुल्क शीर्षक सोही आर्थिक वर्षको उपलब्ध हुनुपर्छ।');
			}
			await save(draft);
			setDraftState(null);
			setSaved(true);
		} catch (saveError) {
			setActionError(saveError instanceof Error ? saveError.message : 'नियम सुरक्षित हुन सकेन।');
		}
	};

	return (
		<section className="space-y-2 rounded-lg border border-border bg-card p-3" aria-label="जोडिएको शुल्क नियम">
			<header className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<span className="grid size-7 place-items-center rounded-md bg-primary/10 text-primary">
						<Link2 className="size-4" aria-hidden="true" />
					</span>
					<div>
						<h2 className="text-sm font-semibold">जोडिएको शुल्क नियम</h2>
						<p className="text-xs text-muted-foreground">एउटा शुल्क समावेश हुँदा अर्को शुल्क स्वतः चयन गर्नुहोस्।</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Select value={selectedYearId} onValueChange={setFiscalYearId} disabled={!availableYears.length}>
						<SelectTrigger className="h-8 w-40 text-xs" aria-label="आर्थिक वर्ष छान्नुहोस्">
							<SelectValue placeholder="आर्थिक वर्ष" />
						</SelectTrigger>
						<SelectContent>
							{availableYears.map((year) => (
								<SelectItem key={year.id} value={year.id}>
									{formatFiscalYearForDisplay(year.code ?? year.name)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</header>

			{isLoading || isLoadingBillingRules ? (
				<LoadingSpinner size="sm" label="जोडिएको शुल्क नियम लोड हुँदैछ..." className="py-2" />
			) : loadError ? (
				<div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-2.5 py-2 text-xs text-destructive" role="alert">
					<span>नियम लोड हुन सकेन: {loadError}</span>
					<Button type="button" size="xs" variant="outline" onClick={() => { void reload(); void reloadBillingRules(); }}>पुनः प्रयास</Button>
				</div>
			) : draft ? (
				<>
					<div className="flex flex-wrap items-center justify-between gap-2 border-y border-border/70 py-1.5">
						<label className="flex items-center gap-2 text-xs font-medium">
							<Checkbox
								checked={draft.enabled}
								onCheckedChange={(checked) => {
									updateDraft((current) => ({ ...current, enabled: checked === true }));
									setSaved(false);
									setActionError(null);
								}}
								aria-label="जोडिएको शुल्क स्वतः छान्ने"
							/>
							जोडिएको शुल्क स्वतः छान्ने
						</label>
						<Button
							type="button"
							size="xs"
							variant="outline"
							leftIcon={<Plus className="size-3.5" aria-hidden="true" />}
							disabled={!selectedYearId || yearFeeHeads.length < 2}
							onClick={() => {
								updateDraft((current) => ({ ...current, rules: [...current.rules, createRule(selectedYearId)] }));
								setSaved(false);
								setActionError(null);
							}}
						>
							नियम थप्नुहोस्
						</Button>
					</div>

					{!availableYears.length ? (
						<p className="py-2 text-xs text-muted-foreground">पहिले आर्थिक वर्ष थप्नुहोस्।</p>
					) : yearFeeHeads.length < 2 ? (
						<p className="py-2 text-xs text-muted-foreground">यस आर्थिक वर्षमा जोड्न कम्तीमा दुई सक्रिय शुल्क शीर्षक चाहिन्छ।</p>
					) : yearRules.length ? (
						<div className="space-y-1.5">
							<div className="hidden grid-cols-[minmax(120px,1fr)_20px_minmax(120px,1fr)_auto_auto_32px] items-center gap-2 px-2 text-[11px] font-medium text-muted-foreground sm:grid">
								<span>मुख्य शुल्क</span><span /><span>स्वतः जोडिने शुल्क</span><span>सक्रिय</span><span>वर्षमा एकपटक</span><span />
							</div>
							{yearRules.map((rule, index) => {
								const destinationOptions = yearFeeHeads.filter((feeHead) => feeHead.id !== rule.sourceFeeHeadId);
								return (
									<div key={rule.id} className="grid grid-cols-1 items-center gap-1.5 rounded-md border border-border/70 bg-background p-2 sm:grid-cols-[minmax(120px,1fr)_20px_minmax(120px,1fr)_auto_auto_32px] sm:gap-2">
										<Select value={rule.sourceFeeHeadId} onValueChange={(value) => updateRule(rule.id, { sourceFeeHeadId: value })}>
											<SelectTrigger className="h-8 text-xs" aria-label={`नियम ${index + 1} को मुख्य शुल्क`}><SelectValue placeholder="मुख्य शुल्क छान्नुहोस्" /></SelectTrigger>
											<SelectContent>{yearFeeHeads.map((feeHead) => <SelectItem key={feeHead.id} value={feeHead.id}>{feeHead.name}</SelectItem>)}</SelectContent>
										</Select>
										<span className="hidden text-center text-muted-foreground sm:block" aria-hidden="true">→</span>
										<Select value={rule.linkedFeeHeadId} onValueChange={(value) => updateRule(rule.id, { linkedFeeHeadId: value })}>
											<SelectTrigger className="h-8 text-xs" aria-label={`नियम ${index + 1} को जोडिने शुल्क`}><SelectValue placeholder="जोडिने शुल्क छान्नुहोस्" /></SelectTrigger>
											<SelectContent>{destinationOptions.map((feeHead) => <SelectItem key={feeHead.id} value={feeHead.id}>{feeHead.name}</SelectItem>)}</SelectContent>
										</Select>
										<label className="flex items-center gap-1.5 text-xs text-muted-foreground">
											<Checkbox checked={rule.active} onCheckedChange={(checked) => updateRule(rule.id, { active: checked === true })} aria-label={`नियम ${index + 1} सक्रिय`} />
											<span className="sm:hidden">सक्रिय</span>
										</label>
										<label className="flex items-center gap-1.5 text-xs text-muted-foreground">
											<Checkbox checked={rule.oncePerFiscalYear} onCheckedChange={(checked) => updateRule(rule.id, { oncePerFiscalYear: checked === true })} aria-label={`नियम ${index + 1} वर्षमा एकपटक`} />
											<span className="sm:hidden">वर्षमा एकपटक</span>
										</label>
										<Button
											type="button"
											variant="ghost"
											size="icon-sm"
											className="h-8 w-8 justify-self-end text-muted-foreground hover:text-destructive"
											aria-label={`नियम ${index + 1} हटाउनुहोस्`}
											onClick={() => {
												updateDraft((current) => ({ ...current, rules: current.rules.filter((item) => item.id !== rule.id) }));
												setSaved(false);
											}}
										>
											<Trash2 className="size-3.5" aria-hidden="true" />
										</Button>
									</div>
								);
							})}
						</div>
					) : (
						<p className="py-2 text-center text-xs text-muted-foreground">यस आर्थिक वर्षका लागि जोडिएको शुल्क नियम छैन।</p>
					)}

					{actionError ? <p className="text-xs text-destructive" role="alert">{actionError}</p> : null}
					{saved ? <p className="text-xs text-emerald-700" role="status">जोडिएको शुल्क नियम सुरक्षित भयो।</p> : null}
					<footer className="flex flex-wrap justify-end gap-2 border-t border-border/70 pt-2">
						<Button
							type="button"
							variant="outline"
							size="xs"
							leftIcon={<RotateCcw className="size-3.5" aria-hidden="true" />}
							disabled={!isDirty || isSaving}
							onClick={() => {
								setDraftState(null);
								setActionError(null);
								setSaved(false);
							}}
						>
							रिसेट
						</Button>
						<Button
							type="button"
							size="xs"
							leftIcon={<Save className="size-3.5" aria-hidden="true" />}
							disabled={!isDirty || isSaving}
							onClick={() => void saveDraft()}
						>
							{isSaving ? 'सुरक्षित हुँदैछ...' : 'सुरक्षित गर्नुहोस्'}
						</Button>
					</footer>
				</>
			) : null}
		</section>
	);
}
