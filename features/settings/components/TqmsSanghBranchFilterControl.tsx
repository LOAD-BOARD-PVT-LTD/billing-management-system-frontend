'use client';

import { useState } from 'react';
import { AlertCircle, Building2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { useTqmsSanghBranchFilter } from '@/features/settings/hooks/useTqmsSanghBranchFilter';
import { useTranslations } from '@/utils/translations';

export function TqmsSanghBranchFilterControl() {
	const { document, branchName, isLoading, isSaving, error, loadError, reload, save } = useTqmsSanghBranchFilter();
	const [draft, setDraft] = useState<string | null>(null);
	const { toast } = useToast();
	const { t } = useTranslations();
	const value = draft ?? branchName;

	const submit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		try {
			await save(value);
			setDraft(null);
			toast({
				title: t('settings.tqmsSanghBranchFilterTitle'),
				description: value.trim()
					? t('settings.tqmsSanghBranchFilterSaved')
					: t('settings.tqmsSanghBranchFilterCleared'),
			});
		} catch (cause) {
			toast({
				title: t('settings.tqmsSanghBranchFilterTitle'),
				description: cause instanceof Error ? cause.message : t('settings.tqmsSanghBranchFilterSaveFailed'),
				variant: 'destructive',
			});
		}
	};

	const changed = value.trim() !== branchName;

	return (
		<form onSubmit={(event) => void submit(event)} className="space-y-5 rounded-lg border border-border/80 bg-card p-4 shadow-sm sm:p-6">
			<div className="flex items-start gap-3">
				<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700"><Building2 className="h-4 w-4" aria-hidden="true" /></span>
				<div>
					<h3 className="text-sm font-semibold">{t('settings.tqmsSanghBranchFilterTitle')}</h3>
					<p className="mt-1 text-xs leading-5 text-muted-foreground">{t('settings.tqmsSanghBranchFilterDescription')}</p>
				</div>
			</div>
			{error ? <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"><AlertCircle className="size-4 shrink-0" aria-hidden="true" />{error}<Button type="button" size="xs" variant="link" className="ml-auto h-auto p-0" onClick={() => void reload()}>पुनः प्रयास गर्नुहोस्</Button></div> : null}
			{isLoading ? <p role="status" className="text-xs text-muted-foreground">सेटिङ लोड हुँदैछ...</p> : !document || loadError ? null : (
				<>
					<div className="space-y-1.5">
						<label htmlFor="tqms-sangh-branch-filter" className="text-sm font-medium">{t('settings.tqmsSanghBranchFilterLabel')}</label>
						<Input id="tqms-sangh-branch-filter" value={value} maxLength={150} onChange={(event) => setDraft(event.target.value)} placeholder={t('settings.tqmsSanghBranchFilterPlaceholder')} disabled={isSaving} />
						<p className="text-xs text-muted-foreground">{t('settings.tqmsSanghBranchFilterDescription')}</p>
					</div>
					<div className="flex justify-end gap-2">
						<Button type="button" variant="outline" disabled={!value || isSaving} onClick={() => setDraft('')}>खाली गर्नुहोस्</Button>
						<Button type="submit" loading={isSaving} disabled={!changed || value.length > 150}>{t('settings.tqmsSanghBranchFilterSaveButton')}</Button>
					</div>
				</>
			)}
		</form>
	);
}
