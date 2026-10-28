'use client';

import { useMemo, useState, type FormEvent } from 'react';
import {
	CalendarDays,
	Check,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	ChevronsUpDown,
	Info,
	MoreVertical,
	Pencil,
	Plus,
	Search,
	Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import type { FiscalYear } from '@/features/billing-rules/model/types';
import { useFiscalYearManagement } from '@/features/settings/hooks/useFiscalYearManagement';
import { useFiscalYearSelectorSettings } from '@/features/settings/hooks/useFiscalYearSelectorSettings';
import {
	DEFAULT_FISCAL_YEAR_SELECTOR_SETTINGS,
	type FiscalYearSelectorSettings,
} from '@/features/settings/api/fiscal-year-selector.api';
import {
	convertADtoBS,
	formatFiscalYearForDisplay,
} from '@/utils/nepali-calender-dates/nepali-fiscal-year';
import { toNepaliDigits } from '@/utils/numbers';
import { useTranslations } from '@/utils/translations';

const PAGE_SIZE = 8;

type Confirmation = {
	type: 'activate' | 'archive' | 'delete';
	year: FiscalYear;
};

function displayDate(date: string): string {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(date);
	if (!match) return date;
	const [, year, month, day] = match;
	const parsed = new Date(Number(year), Number(month) - 1, Number(day));
	if (parsed.getFullYear() !== Number(year) || parsed.getMonth() !== Number(month) - 1 || parsed.getDate() !== Number(day)) {
		return date;
	}
	try {
		return toNepaliDigits(convertADtoBS(parsed));
	} catch {
		return date;
	}
}

function displayFiscalYear(year: FiscalYear): string {
	return formatFiscalYearForDisplay(year.code ?? year.name);
}

function StatusBadge({ active, label }: { active: boolean; label: string }) {
	return (
		<span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${active ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200' : 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200'}`}>
			<span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-400'}`} aria-hidden="true" />
			{label}
		</span>
	);
}

export function FiscalYearManagement() {
	const { t: translate } = useTranslations();
	const t = (key: string, params?: Record<string, string | number>) => translate(
		key.startsWith('fiscalYear') ? `billing.${key}` : key,
		params,
	);
	const {
		fiscalYears,
		isLoading,
		isSaving,
		error,
		reload,
		save,
		remove,
	} = useFiscalYearManagement();
	const preferences = useFiscalYearSelectorSettings();
	const [query, setQuery] = useState('');
	const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all');
	const [page, setPage] = useState(0);
	const [editing, setEditing] = useState<FiscalYear | null>(null);
	const [formOpen, setFormOpen] = useState(false);
	const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
	const [actionError, setActionError] = useState<string | null>(null);
	const [saved, setSaved] = useState(false);
	const [preferenceDraft, setPreferenceDraft] = useState<FiscalYearSelectorSettings | null>(null);
	const [preferenceSaved, setPreferenceSaved] = useState(false);
	const [preferenceSaveError, setPreferenceSaveError] = useState<string | null>(null);
	const [yearForm, setYearForm] = useState({ name: '', startDate: '', endDate: '' });
	const [yearFormError, setYearFormError] = useState<string | null>(null);

	const activeYear = fiscalYears.find((year) => year.status === 'ACTIVE') ?? null;
	const filteredYears = useMemo(() => {
		const normalizedQuery = query.trim().toLocaleLowerCase();
		return [...fiscalYears]
			.filter((year) => statusFilter === 'all' || (statusFilter === 'active' ? year.status === 'ACTIVE' : year.status !== 'ACTIVE'))
			.filter((year) => !normalizedQuery || `${year.name} ${year.code ?? ''} ${year.startDate} ${year.endDate}`.toLocaleLowerCase().includes(normalizedQuery))
			.sort((left, right) => right.startDate.localeCompare(left.startDate));
	}, [fiscalYears, query, statusFilter]);
	const pageCount = Math.ceil(filteredYears.length / PAGE_SIZE);
	const currentPage = Math.min(page, Math.max(0, pageCount - 1));
	const pageYears = filteredYears.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
	const currentPreferences = preferenceDraft ?? preferences.settings ?? DEFAULT_FISCAL_YEAR_SELECTOR_SETTINGS;

	const openForm = (year?: FiscalYear) => {
		setEditing(year ?? null);
		setYearForm(year
			? { name: year.name, startDate: year.startDate, endDate: year.endDate }
			: { name: '', startDate: '', endDate: '' });
		setYearFormError(null);
		setFormOpen(true);
	};

	const confirmAction = (type: Confirmation['type'], year: FiscalYear) => {
		setActionError(null);
		setConfirmation({ type, year });
	};

	const submitYear = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setYearFormError(null);
		setActionError(null);
		setSaved(false);
		const nextYear: FiscalYear = {
			id: editing?.id ?? crypto.randomUUID(),
			name: yearForm.name.trim(),
			code: yearForm.name.trim(),
			startDate: yearForm.startDate,
			endDate: yearForm.endDate,
			status: editing?.status ?? 'INACTIVE',
			isDefault: editing?.isDefault ?? false,
		};
		try {
			await save(editing
				? fiscalYears.map((year) => year.id === editing.id ? nextYear : year)
				: [...fiscalYears, nextYear]);
			setFormOpen(false);
			setEditing(null);
			setPage(0);
			setSaved(true);
		} catch (failure) {
			setYearFormError(failure instanceof Error ? failure.message : t('fiscalYearManagement.saveFailed'));
		}
	};

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

	const confirmChange = async () => {
		if (!confirmation) return;
		const change = confirmation;
		setActionError(null);
		setSaved(false);
		try {
			if (change.type === 'delete') {
				await remove(change.year.id);
			} else {
				const nextYears = fiscalYears.map((year) => {
					if (change.type === 'activate') {
						return { ...year, status: year.id === change.year.id ? 'ACTIVE' as const : 'INACTIVE' as const, isDefault: year.id === change.year.id };
					}
					return year.id === change.year.id ? { ...year, status: 'INACTIVE' as const, isDefault: false } : year;
				});
				await save(nextYears);
			}
			setConfirmation(null);
			setPage(0);
			setSaved(true);
		} catch (failure) {
			setActionError(failure instanceof Error ? failure.message : t('fiscalYearManagement.saveFailed'));
		}
	};

	const confirmationTitle = confirmation?.type === 'activate'
		? t('fiscalYearManagement.activateTitle')
		: confirmation?.type === 'archive'
			? t('fiscalYearManagement.archiveTitle')
			: t('fiscalYearManagement.deleteTitle');
	const confirmationDescription = confirmation?.type === 'activate'
		? t('fiscalYearManagement.activateDescription', { name: confirmation.year.name })
		: confirmation?.type === 'archive'
			? t('fiscalYearManagement.archiveDescription', { name: confirmation.year.name })
			: t('fiscalYearManagement.deleteDescription', { name: confirmation?.year.name ?? '' });

	return (
		<div className="space-y-5">
			<header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
				<div className="flex items-start gap-3">
					<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
						<CalendarDays className="h-5 w-5" aria-hidden="true" />
					</span>
					<div>
						<h1 className="text-xl font-semibold tracking-tight text-foreground">{t('fiscalYearManagement.title')}</h1>
						<p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t('fiscalYearManagement.description')}</p>
					</div>
				</div>
				<Button type="button" className="shrink-0" disabled={isSaving} onClick={() => openForm()}>
					<Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
					{t('fiscalYearManagement.add')}
				</Button>
			</header>

			<section aria-labelledby="active-fiscal-year" className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 sm:p-5">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center">
					<span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
						<CalendarDays className="h-6 w-6" aria-hidden="true" />
					</span>
					<div className="min-w-0 flex-1">
						<p id="active-fiscal-year" className="text-xs font-medium text-blue-800">{t('fiscalYearManagement.activeSummary')}</p>
						{activeYear ? (
							<>
								<div className="mt-1 flex flex-wrap items-center gap-2">
									<h2 className="text-xl font-semibold text-slate-900">{displayFiscalYear(activeYear)}</h2>
									<StatusBadge active label={t('fiscalYearManagement.active')} />
								</div>
								<p className="mt-1 text-sm text-slate-600">{displayDate(activeYear.startDate)} {t('fiscalYearDateFrom')} {displayDate(activeYear.endDate)} {t('fiscalYearDateTo')}</p>
							</>
						) : <p className="mt-1 text-lg font-semibold text-slate-700">{t('fiscalYearManagement.noActiveYear')}</p>}
					</div>
					<div className="flex max-w-sm items-start gap-2 border-t border-blue-200 pt-3 text-xs leading-relaxed text-slate-600 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
						<Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
						<p>{t('fiscalYearManagement.singleActiveNote')}</p>
					</div>
				</div>
			</section>

			<section aria-labelledby="fiscal-year-list-title" className="overflow-hidden rounded-xl border border-border bg-white">
				<div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h2 id="fiscal-year-list-title" className="font-semibold">{t('fiscalYearManagement.listTitle')}</h2>
						<p className="mt-0.5 text-xs text-muted-foreground">{t('fiscalYearManagement.listDescription')}</p>
					</div>
					<div className="flex flex-col gap-2 sm:flex-row">
						<div className="relative sm:w-60">
							<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
							<Input value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} placeholder={t('fiscalYearManagement.searchPlaceholder')} aria-label={t('fiscalYearManagement.searchLabel')} className="h-9 bg-white pl-9" />
						</div>
						<label className="relative">
							<span className="sr-only">{t('fiscalYearManagement.filterLabel')}</span>
							<select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as typeof statusFilter); setPage(0); }} className="h-9 w-full appearance-none rounded-md border border-input bg-white pl-3 pr-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-44">
								<option value="all">{t('fiscalYearManagement.filterAll')}</option>
								<option value="active">{t('fiscalYearManagement.filterActive')}</option>
								<option value="archived">{t('fiscalYearManagement.filterArchived')}</option>
							</select>
							<ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
						</label>
					</div>
				</div>

				{error ? (
					<div role="alert" className="m-4 flex flex-col gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive sm:flex-row sm:items-center">
						<span>{error}</span>
						<Button type="button" variant="outline" size="sm" className="sm:ml-auto" onClick={() => void reload()}>{t('fiscalYearManagement.retry')}</Button>
					</div>
				) : null}
				{actionError ? <p role="alert" className="mx-4 mt-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{actionError}</p> : null}
				{saved ? <p role="status" className="mx-4 mt-4 text-sm text-emerald-700">{t('fiscalYearManagement.saved')}</p> : null}

				{isLoading ? (
					<div role="status" className="space-y-3 p-6">
						{[0, 1, 2].map((item) => <div key={item} className="h-12 animate-pulse rounded-md bg-muted" />)}
						<span className="sr-only">{t('fiscalYearManagement.loading')}</span>
					</div>
				) : filteredYears.length === 0 ? (
					<div className="px-5 py-12 text-center">
						<CalendarDays className="mx-auto h-8 w-8 text-muted-foreground/60" aria-hidden="true" />
						<p className="mt-3 text-sm font-medium">{query || statusFilter !== 'all' ? t('fiscalYearManagement.noMatches') : t('fiscalYearManagement.empty')}</p>
						<p className="mt-1 text-xs text-muted-foreground">{t('fiscalYearManagement.emptyDescription')}</p>
					</div>
				) : (
					<>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>{t('fiscalYearManagement.columnYear')}</TableHead>
									<TableHead>{t('fiscalYearManagement.columnDateRange')}</TableHead>
									<TableHead>{t('fiscalYearManagement.columnStatus')}</TableHead>
									<TableHead className="text-right">{t('fiscalYearManagement.columnActions')}</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{pageYears.map((year) => {
									const isActive = year.status === 'ACTIVE';
									return (
										<TableRow key={year.id} className={isActive ? 'bg-emerald-50/40' : undefined}>
											<TableCell className="min-w-36">
												<p className="font-semibold">{displayFiscalYear(year)}</p>
											</TableCell>
											<TableCell className="min-w-52 text-sm text-muted-foreground">{displayDate(year.startDate)} {t('fiscalYearDateFrom')} {displayDate(year.endDate)} {t('fiscalYearDateTo')}</TableCell>
											<TableCell><StatusBadge active={isActive} label={isActive ? t('fiscalYearManagement.active') : t('fiscalYearManagement.archived')} /></TableCell>
											<TableCell>
												<div className="flex items-center justify-end gap-1.5">
													{!isActive ? (
														<Button type="button" variant="outline" size="sm" disabled={isSaving} onClick={() => confirmAction('activate', year)}>
															<Check className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
															<span className="hidden sm:inline">{t('fiscalYearManagement.setActive')}</span>
														</Button>
													) : null}
													<Button type="button" variant="outline" size="icon-sm" aria-label={t('fiscalYearManagement.edit', { name: year.name })} disabled={isSaving} onClick={() => openForm(year)}>
														<Pencil className="h-3.5 w-3.5" aria-hidden="true" />
													</Button>
													<DropdownMenu>
														<DropdownMenuTrigger asChild>
															<Button type="button" variant="outline" size="icon-sm" aria-label={t('fiscalYearManagement.moreActions', { name: year.name })} disabled={isSaving}>
																<MoreVertical className="h-4 w-4" aria-hidden="true" />
															</Button>
														</DropdownMenuTrigger>
														<DropdownMenuContent align="end">
															{isActive ? (
																<DropdownMenuItem onSelect={() => confirmAction('archive', year)}>
																	<ChevronsUpDown className="mr-2 h-4 w-4" aria-hidden="true" />{t('fiscalYearManagement.archive')}
																</DropdownMenuItem>
															) : (
																<DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => confirmAction('delete', year)}>
																	<Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />{t('fiscalYearManagement.delete')}
																</DropdownMenuItem>
															)}
														</DropdownMenuContent>
													</DropdownMenu>
												</div>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
						<footer className="flex flex-col gap-2 border-t border-border px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
							<span>{t('fiscalYearManagement.totalYears', { count: filteredYears.length })}</span>
							<div className="flex items-center justify-end gap-2">
								<Button type="button" variant="outline" size="icon-sm" aria-label={t('fiscalYearManagement.previousPage')} disabled={currentPage === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>
									<ChevronLeft className="h-4 w-4" aria-hidden="true" />
								</Button>
								<span>{t('fiscalYearManagement.pageCount', { current: currentPage + 1, total: pageCount })}</span>
								<Button type="button" variant="outline" size="icon-sm" aria-label={t('fiscalYearManagement.nextPage')} disabled={currentPage + 1 >= pageCount} onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}>
									<ChevronRight className="h-4 w-4" aria-hidden="true" />
								</Button>
							</div>
						</footer>
					</>
				)}
			</section>

			<details className="overflow-hidden rounded-xl border border-border bg-white">
				<summary className="flex cursor-pointer list-none items-center gap-3 p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring">
					<span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700"><CalendarDays className="h-4 w-4" aria-hidden="true" /></span>
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
							<Button type="button" variant="outline" size="sm" onClick={() => void preferences.reload()}>{t('fiscalYearManagement.retry')}</Button>
						</div>
					) : null}
					{preferenceSaveError ? <p role="alert" className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{preferenceSaveError}</p> : null}
					<form onSubmit={submitPreferences} className="space-y-4">
						<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
							<div className="space-y-1.5">
								<Label htmlFor="fiscal-years-back">{t('fiscalYearSelectorYearsBackLabel')}</Label>
								<Input id="fiscal-years-back" type="number" min={0} max={20} step={1} required value={currentPreferences.yearsBack} onChange={(event) => { setPreferenceSaved(false); setPreferenceDraft((current) => ({ ...(current ?? currentPreferences), yearsBack: Number(event.target.value) })); }} />
								<p className="text-xs text-muted-foreground">{t('fiscalYearManagement.pastYearsHelp')}</p>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="fiscal-years-forward">{t('fiscalYearSelectorYearsForwardLabel')}</Label>
								<Input id="fiscal-years-forward" type="number" min={0} max={10} step={1} required value={currentPreferences.yearsForward} onChange={(event) => { setPreferenceSaved(false); setPreferenceDraft((current) => ({ ...(current ?? currentPreferences), yearsForward: Number(event.target.value) })); }} />
								<p className="text-xs text-muted-foreground">{t('fiscalYearManagement.futureYearsHelp')}</p>
							</div>
							<div className="space-y-1.5 md:col-span-2 xl:col-span-1">
								<Label htmlFor="fiscal-years-excluded">{t('fiscalYearSelectorArchivedYearsLabel')}</Label>
								<Textarea
									id="fiscal-years-excluded"
									value={currentPreferences.archivedYears.join('\n')}
									onChange={(event) => { setPreferenceSaved(false); setPreferenceDraft((current) => ({ ...(current ?? currentPreferences), archivedYears: event.target.value.split(/\r?\n/u).map((year) => year.trim()).filter(Boolean) })); }}
									placeholder={t('fiscalYearSelectorArchivedYearsPlaceholder')}
									rows={3}
									className="min-h-20 rounded-md"
								/>
								<p className="text-xs text-muted-foreground">{t('fiscalYearManagement.excludedYearsHelp')}</p>
							</div>
						</div>
						<div className="flex flex-wrap items-center justify-end gap-3">
							{preferenceSaved ? <span role="status" className="text-sm text-emerald-700">{t('fiscalYearSelectorSaved')}</span> : null}
							<Button type="submit" disabled={preferences.isLoading || preferences.isSaving}>{preferences.isSaving ? t('system.saving') : t('fiscalYearSelectorSaveButton')}</Button>
						</div>
					</form>
				</div>
			</details>

			<Dialog open={formOpen} onOpenChange={setFormOpen}>
				<DialogContent>
					<form onSubmit={submitYear} className="space-y-5">
						<DialogHeader>
							<DialogTitle>{editing ? t('fiscalYearManagement.editTitle') : t('fiscalYearManagement.createTitle')}</DialogTitle>
							<DialogDescription>{t('fiscalYearManagement.formDescription')}</DialogDescription>
						</DialogHeader>
						{yearFormError ? <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{yearFormError}</p> : null}
						<div className="space-y-1.5">
							<Label htmlFor="fiscal-year-name">{t('fiscalYearManagement.nameLabel')}</Label>
							<Input id="fiscal-year-name" required maxLength={80} value={yearForm.name} onChange={(event) => setYearForm((current) => ({ ...current, name: event.target.value }))} autoFocus />
						</div>
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-1.5">
								<Label htmlFor="fiscal-year-start-date">{t('fiscalYearManagement.startDateLabel')}</Label>
								<Input id="fiscal-year-start-date" type="date" required value={yearForm.startDate} onChange={(event) => setYearForm((current) => ({ ...current, startDate: event.target.value }))} />
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="fiscal-year-end-date">{t('fiscalYearManagement.endDateLabel')}</Label>
								<Input id="fiscal-year-end-date" type="date" required min={yearForm.startDate || undefined} value={yearForm.endDate} onChange={(event) => setYearForm((current) => ({ ...current, endDate: event.target.value }))} />
							</div>
						</div>
						<p className="text-xs text-muted-foreground">{t('fiscalYearManagement.createDoesNotActivate')}</p>
						<DialogFooter>
							<Button type="button" variant="outline" disabled={isSaving} onClick={() => setFormOpen(false)}>{t('fiscalYearManagement.cancel')}</Button>
							<Button type="submit" disabled={isSaving}>{isSaving ? t('system.saving') : t('fiscalYearManagement.save')}</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<Dialog open={Boolean(confirmation)} onOpenChange={(open) => { if (!open) setConfirmation(null); }}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{confirmationTitle}</DialogTitle>
						<DialogDescription>{confirmationDescription}</DialogDescription>
					</DialogHeader>
					{actionError && confirmation ? <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{actionError}</p> : null}
					<DialogFooter>
						<Button type="button" variant="outline" disabled={isSaving} onClick={() => setConfirmation(null)}>{t('fiscalYearManagement.cancel')}</Button>
						<Button type="button" variant={confirmation?.type === 'delete' ? 'destructive' : 'default'} disabled={isSaving} onClick={() => void confirmChange()}>{isSaving ? t('system.saving') : t('fiscalYearManagement.confirm')}</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
