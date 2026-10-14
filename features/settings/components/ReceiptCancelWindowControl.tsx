'use client';

import { useState } from 'react';
import { AlertCircle, Clock3 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useReceiptCancelWindow } from '@/features/settings/hooks/useReceiptCancelWindow';

export function ReceiptCancelWindowControl() {
	const { policy, isLoading, isSaving, error, reload, save } = useReceiptCancelWindow();
	const [draft, setDraft] = useState<{ enabled: boolean; hours: string } | null>(null);
	const enabled = draft?.enabled ?? policy?.enabled ?? false;
	const hours = draft?.hours ?? String(policy?.hours ?? 24);

	const submit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const parsedHours = Number(hours);
		if (!Number.isInteger(parsedHours) || parsedHours <= 0 || parsedHours > 8760) return;
		await save({ enabled, hours: parsedHours });
	};

	const invalidHours = !Number.isInteger(Number(hours)) || Number(hours) <= 0 || Number(hours) > 8760;

	return (
		<form onSubmit={(event) => void submit(event)} className="space-y-5 rounded-lg border border-border/80 bg-card p-4 shadow-sm sm:p-6">
			<div className="flex items-start gap-3">
				<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700"><Clock3 className="h-4 w-4" aria-hidden="true" /></span>
				<div>
					<h3 className="text-sm font-semibold">रसिद रद्द समय सीमा</h3>
					<p className="mt-1 text-xs leading-5 text-muted-foreground">भुक्तानीपछि रसिद कति घण्टासम्म रद्द गर्न मिल्ने हो यहाँ सेट गर्नुहोस्।</p>
				</div>
			</div>
			{error ? <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"><AlertCircle className="size-4 shrink-0" aria-hidden="true" />{error}<Button type="button" size="xs" variant="link" className="ml-auto h-auto p-0" onClick={() => void reload()}>पुनः प्रयास</Button></div> : null}
			{isLoading ? <p role="status" className="text-xs text-muted-foreground">सेटिङ लोड हुँदैछ...</p> : (
				<>
					<label className="flex cursor-pointer items-center justify-between rounded-lg border border-border px-3 py-3 text-sm">
						<span>समय सीमा लागू गर्नुहोस्</span>
						<input type="checkbox" checked={enabled} onChange={(event) => setDraft({ enabled: event.target.checked, hours })} aria-label="रसिद रद्द समय सीमा लागू गर्नुहोस्" className="size-4 accent-primary" />
					</label>
					<div className="space-y-1.5">
						<label htmlFor="receipt-cancel-hours" className="text-sm font-medium">घण्टा सीमा</label>
						<Input id="receipt-cancel-hours" type="number" min={1} max={8760} step={1} value={hours} onChange={(event) => setDraft({ enabled, hours: event.target.value })} disabled={!enabled || isSaving} aria-invalid={invalidHours} />
						<p className="text-xs text-muted-foreground">यो policy on भएपछि यही समयभित्र मात्र रसिद रद्द गर्न मिल्छ। बन्द हुँदा समय सीमा लागू हुँदैन।</p>
					</div>
					<div className="flex justify-end">
						<Button type="submit" loading={isSaving} disabled={invalidHours || !policy}>सेभ गर्नुहोस्</Button>
					</div>
				</>
			)}
		</form>
	);
}
