'use client';

import { useState, type FormEvent } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { vehiclePhoneUpdateSchema, type VehiclePhoneUpdateInput } from '@/features/billing/schemas/vehicle-phone-update.schema';
import type { BillingVehicle } from '@/features/billing/model/types';

export function VehiclePhoneUpdateDialog({
	vehicle,
	open,
	isSaving,
	onOpenChange,
	onSubmit,
}: {
	vehicle: BillingVehicle;
	open: boolean;
	isSaving: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (input: VehiclePhoneUpdateInput) => Promise<void>;
}) {
	const [phone, setPhone] = useState(vehicle.smsPhone || vehicle.phone);
	const [reason, setReason] = useState('');
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const result = vehiclePhoneUpdateSchema.safeParse({ phone, reason });
		if (!result.success) {
			setError(result.error.issues[0]?.message ?? 'कृपया विवरण जाँच गर्नुहोस्।');
			return;
		}

		try {
			setError(null);
			await onSubmit(result.data);
		} catch (submitError) {
			setError(submitError instanceof Error ? submitError.message : 'नम्बर परिवर्तन गर्न सकिएन।');
		}
	};

	return (
		<Dialog open={open} onOpenChange={(nextOpen) => { if (!isSaving) onOpenChange(nextOpen); }}>
			<DialogContent className="max-h-[min(85vh,calc(100dvh-2rem))] overflow-y-auto rounded-2xl sm:max-w-xl">
				<DialogHeader className="text-left">
					<DialogTitle className="text-xl">धनीको नम्बर परिवर्तन गर्नुहोस्</DialogTitle>
					<DialogDescription>
						{vehicle.vehicleNumber} का लागि सक्रिय SMS नम्बर परिवर्तन गर्नुहोस्। TQMS मा रहेको नम्बर परिवर्तन हुँदैन।
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
					<label className="block space-y-1.5 text-sm font-medium">
						TQMS धनी नम्बर
						<Input value={vehicle.phone} readOnly className="bg-muted/40" />
						<span className="block text-xs font-normal text-muted-foreground">TQMS मा दर्ता भएको मूल नम्बर।</span>
					</label>

					<label className="block space-y-1.5 text-sm font-medium">
						सक्रिय SMS नम्बर
						<Input
							type="tel"
							inputMode="tel"
							autoComplete="tel"
							value={phone}
							onChange={(event) => { setPhone(event.target.value); setError(null); }}
							placeholder="९८XXXXXXXX"
							required
						/>
						<span className="block text-xs font-normal text-muted-foreground">भविष्यमा बिलिङ SMS पठाउन यो नम्बर प्रयोग हुनेछ।</span>
					</label>

					<label className="block space-y-1.5 text-sm font-medium">
						परिवर्तनको कारण
						<Textarea
							value={reason}
							onChange={(event) => { setReason(event.target.value); setError(null); }}
							placeholder="नम्बर परिवर्तन गर्नुको कारण लेख्नुहोस्"
							maxLength={500}
							rows={3}
							required
						/>
						<span className="block text-right text-xs font-normal text-muted-foreground">{reason.length}/500</span>
					</label>

					{error && (
						<p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
							{error}
						</p>
					)}

					<div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
						<Button
							type="button"
							variant="outline"
							disabled={isSaving}
							onClick={() => { setPhone(vehicle.phone); setError(null); }}
							leftIcon={<RotateCcw className="h-4 w-4" />}
						>
							TQMS नम्बर राख्नुहोस्
						</Button>
						<Button type="submit" loading={isSaving}>सेभ गर्नुहोस्</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
