'use client';

import { useState, type FormEvent } from 'react';
import { AlertCircle, CalendarDays, ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { useUsers } from '@/features/administration/users/hooks/useUsers';
import type { BillingFiscalYearControlTarget } from '@/features/settings/api/fiscal-year-management.api';
import {
	DEFAULT_FISCAL_YEAR_SELECTOR_SETTINGS,
	type FiscalYearSelectorSettings,
} from '@/features/settings/api/fiscal-year-selector.api';
import type {
	BillingFiscalYearAccessStatus,
	BillingFiscalYearControlEntry,
} from '@/features/settings/api/grouped-settings.api';
import { useFiscalYearManagement } from '@/features/settings/hooks/useFiscalYearManagement';
import { useFiscalYearSelectorSettings } from '@/features/settings/hooks/useFiscalYearSelectorSettings';
import { useTranslations } from '@/utils/translations';

function formatControlTimestamp(iso: string | null): string {
	if (!iso) return '—';
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return '—';
	const pad = (value: number) => String(value).padStart(2, '0');
	const day = pad(date.getDate());
	const month = pad(date.getMonth() + 1);
	const year = date.getFullYear();
	const hours = pad(date.getHours());
	const minutes = pad(date.getMinutes());
	const seconds = pad(date.getSeconds());
	return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
}

interface BillingYearRowConfig {
	target: BillingFiscalYearControlTarget;
	controlLabel: string;
	entry: BillingFiscalYearControlEntry;
	openDateLabel: string;
	openActorLabel: string;
}

export function FiscalYearManagement() {
	const { t: translate } = useTranslations();
	const t = (key: string, params?: Record<string, string | number>) => translate(
		key.startsWith('fiscalYear') ? `billing.${key}` : key,
		params,
	);
	const { toast } = useToast();
	const { user: authUser } = useAuth();
	const { records: users } = useUsers();
	const {
		currentFiscalYear,
		previousYearControl,
		nextYearControl,
		isLoading,
		isSaving,
		error,
		reload,
		setBillingYearStatus,
	} = useFiscalYearManagement();
	const preferences = useFiscalYearSelectorSettings();
	const [savingTarget, setSavingTarget] = useState<BillingFiscalYearControlTarget | null>(null);
	const [preferenceDraft, setPreferenceDraft] = useState<FiscalYearSelectorSettings | null>(null);
	const [preferenceSaved, setPreferenceSaved] = useState(false);
	const [preferenceSaveError, setPreferenceSaveError] = useState<string | null>(null);

	const currentPreferences = preferenceDraft ?? preferences.settings ?? DEFAULT_FISCAL_YEAR_SELECTOR_SETTINGS;

	const submitPreferences = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setPreferenceSaved(false);
		setPreferenceSaveError(null);
		try {
			const updated = await preferences.save(currentPreferences);
			setPreferenceDraft(updated.settings);
			setPreferenceSaved(true);
		} catch (failure) {
			setPreferenceSaveError(failure instanceof Error ? failure.message : t('fiscalYearSelectorSaveFailed'));
		}
	};

	const currentUserRecord = authUser?.email
		? users.find((user) => user.email.toLowerCase() === authUser.email.toLowerCase())
		: undefined;
	const performedBy = currentUserRecord?.name.trim()
		|| authUser?.name?.trim()
		|| authUser?.email
		|| 'System Administrator';

	const handleToggle = async (
		target: BillingFiscalYearControlTarget,
		entry: BillingFiscalYearControlEntry,
	) => {
		const nextStatus: BillingFiscalYearAccessStatus = entry.status === 'OPEN' ? 'CLOSED' : 'OPEN';
		setSavingTarget(target);
		try {
			await setBillingYearStatus(target, nextStatus, performedBy);
			toast({
				title: nextStatus === 'OPEN'
					? `आर्थिक वर्ष ${entry.fiscalYear} बिलिङका लागि खोलियो।`
					: `आर्थिक वर्ष ${entry.fiscalYear} बिलिङका लागि बन्द गरियो।`,
			});
		} catch (failure) {
			toast({
				title: 'आर्थिक वर्षको अवस्था परिवर्तन गर्न सकिएन।',
				description: failure instanceof Error ? failure.message : 'कृपया पुनः प्रयास गर्नुहोस्।',
				variant: 'destructive',
			});
		} finally {
			setSavingTarget(null);
		}
	};

	const rows: BillingYearRowConfig[] = [
		...(previousYearControl
			? [{
				target: 'previousYear' as const,
				controlLabel: 'अघिल्लो आर्थिक वर्ष',
				entry: previousYearControl,
				openDateLabel: 'खोलेको मिति',
				openActorLabel: 'खोल्ने',
			}]
			: []),
		...(nextYearControl
			? [{
				target: 'nextYear' as const,
				controlLabel: 'अर्को आर्थिक वर्ष',
				entry: nextYearControl,
				openDateLabel: 'चालु मिति',
				openActorLabel: 'चालु गर्ने',
			}]
			: []),
	];

	return (
		<div className="space-y-4">
			<section className="space-y-4 rounded-xl border border-border/80 bg-card p-5 shadow-sm sm:p-6">
			<header className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h3 className="text-base font-semibold text-foreground">रसिद आर्थिक वर्ष बन्द/खोल्ने</h3>
					<p className="mt-1 text-xs text-muted-foreground">
						अघिल्लो आर्थिक वर्ष खोल्ने/बन्द गर्ने र अर्को आर्थिक वर्ष चालु/बन्द गर्ने।
					</p>
				</div>
				{currentFiscalYear ? (
					<span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
						चालु आर्थिक वर्ष: {currentFiscalYear}
					</span>
				) : null}
			</header>

			{error ? (
				<div
					role="alert"
					className="flex flex-wrap items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
				>
					<AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
					<span className="min-w-0 flex-1">{error}</span>
					<Button type="button" variant="outline" size="sm" onClick={() => void reload()}>
						पुनः प्रयास
					</Button>
				</div>
			) : null}

			{isLoading ? (
				<div role="status" className="space-y-3">
					<div className="h-24 animate-pulse rounded-lg bg-muted" />
					<div className="h-24 animate-pulse rounded-lg bg-muted" />
					<span className="sr-only">आर्थिक वर्ष नियन्त्रण लोड हुँदैछ...</span>
				</div>
			) : (
				<div className="space-y-3">
					{rows.map(({ target, controlLabel, entry, openDateLabel, openActorLabel }) => {
						const isOpen = entry.status === 'OPEN';
						const dateLabel = isOpen ? openDateLabel : 'बन्द मिति';
						const actorLabel = isOpen ? openActorLabel : 'बन्द गर्ने';
						const buttonLabel = isOpen ? 'बन्द गर्नुहोस्' : 'खोल्नुहोस्';

						return (
							<div key={target} className="rounded-lg border border-border/70 bg-background p-4">
								<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
									<div>
										<p className="text-xs text-muted-foreground">नियन्त्रण</p>
										<p className="mt-1 text-sm font-semibold text-foreground">{controlLabel}</p>
									</div>
									<div>
										<p className="text-xs text-muted-foreground">वित्तीय वर्ष</p>
										<p className="mt-1 text-sm font-semibold text-foreground">{entry.fiscalYear}</p>
									</div>
									<div>
										<p className="text-xs text-muted-foreground">अवस्था</p>
										<p className="mt-1 text-sm font-semibold text-foreground">{entry.status}</p>
									</div>
									<div>
										<p className="text-xs text-muted-foreground">{dateLabel}</p>
										<p className="mt-1 text-sm font-semibold text-foreground tabular-nums">
											{formatControlTimestamp(entry.updatedAt)}
										</p>
									</div>
									<div>
										<p className="text-xs text-muted-foreground">{actorLabel}</p>
										<p className="mt-1 truncate text-sm font-semibold text-foreground">
											{entry.updatedBy ?? '—'}
										</p>
									</div>
								</div>
								<div className="mt-3 flex justify-end">
									<Button
										type="button"
										size="sm"
										loading={savingTarget === target}
										disabled={isSaving}
										onClick={() => void handleToggle(target, entry)}
									>
										{buttonLabel}
									</Button>
								</div>
							</div>
						);
					})}
				</div>
			)}
			</section>

			<details className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
				<summary className="flex cursor-pointer list-none items-center gap-3 p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring">
					<span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
						<CalendarDays className="h-4 w-4" aria-hidden="true" />
					</span>
					<span className="min-w-0 flex-1">
						<span className="block font-semibold">{t('fiscalYearManagement.preferencesTitle')}</span>
						<span className="mt-0.5 block text-xs text-muted-foreground">{t('fiscalYearManagement.preferencesDescription')}</span>
					</span>
					<ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
				</summary>
				<div className="border-t border-border p-4 sm:p-5">
					{preferences.error ? (
						<div role="alert" className="mb-4 flex flex-wrap items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
							<span className="flex-1">{preferences.error}</span>
							<Button type="button" variant="outline" size="sm" onClick={() => void preferences.reload()}>
								{t('fiscalYearManagement.retry')}
							</Button>
						</div>
					) : null}
					{preferenceSaveError ? (
						<p role="alert" className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
							{preferenceSaveError}
						</p>
					) : null}
					<form onSubmit={submitPreferences} className="space-y-4">
						<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
							<div className="space-y-1.5">
								<Label htmlFor="fiscal-years-back">{t('fiscalYearSelectorYearsBackLabel')}</Label>
								<Input
									id="fiscal-years-back"
									type="number"
									min={0}
									max={20}
									step={1}
									required
									value={currentPreferences.yearsBack}
									onChange={(event) => {
										setPreferenceSaved(false);
										setPreferenceDraft((current) => ({ ...(current ?? currentPreferences), yearsBack: Number(event.target.value) }));
									}}
								/>
								<p className="text-xs text-muted-foreground">{t('fiscalYearManagement.pastYearsHelp')}</p>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="fiscal-years-forward">{t('fiscalYearSelectorYearsForwardLabel')}</Label>
								<Input
									id="fiscal-years-forward"
									type="number"
									min={0}
									max={10}
									step={1}
									required
									value={currentPreferences.yearsForward}
									onChange={(event) => {
										setPreferenceSaved(false);
										setPreferenceDraft((current) => ({ ...(current ?? currentPreferences), yearsForward: Number(event.target.value) }));
									}}
								/>
								<p className="text-xs text-muted-foreground">{t('fiscalYearManagement.futureYearsHelp')}</p>
							</div>
							<div className="space-y-1.5 md:col-span-2 xl:col-span-1">
								<Label htmlFor="fiscal-years-excluded">{t('fiscalYearSelectorArchivedYearsLabel')}</Label>
								<Textarea
									id="fiscal-years-excluded"
									value={currentPreferences.archivedYears.join('\n')}
									onChange={(event) => {
										setPreferenceSaved(false);
										setPreferenceDraft((current) => ({
											...(current ?? currentPreferences),
											archivedYears: event.target.value.split(/\r?\n/u).map((year) => year.trim()).filter(Boolean),
										}));
									}}
									placeholder={t('fiscalYearSelectorArchivedYearsPlaceholder')}
									rows={3}
									className="min-h-20 rounded-md"
								/>
								<p className="text-xs text-muted-foreground">{t('fiscalYearManagement.excludedYearsHelp')}</p>
							</div>
						</div>
						<div className="flex flex-wrap items-center justify-end gap-3">
							{preferenceSaved ? <span role="status" className="text-sm text-emerald-700">{t('fiscalYearSelectorSaved')}</span> : null}
							<Button type="submit" disabled={preferences.isLoading || preferences.isSaving}>
								{preferences.isSaving ? t('system.saving') : t('fiscalYearSelectorSaveButton')}
							</Button>
						</div>
					</form>
				</div>
			</details>
		</div>
	);
}
