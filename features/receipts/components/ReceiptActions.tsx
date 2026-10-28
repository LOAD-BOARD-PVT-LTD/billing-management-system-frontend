'use client';

import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Ban, Download, LoaderCircle, MessageSquareText, Pencil, Printer } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { TableActionIconButton } from '@/components/ui/table-action-icon-button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { ReceiptCorrection } from '@/features/receipts/api/bill-resource.api';
import type { ReceiptRecord } from '@/features/receipts/model/receipt';

type ReceiptAction = 'print' | 'download' | 'cancel' | 'correct';

interface ReceiptActionsProps {
	receipt: ReceiptRecord;
	onPrint: (receipt: ReceiptRecord) => Promise<void>;
	printing: boolean;
	onDownload: (receipt: ReceiptRecord) => Promise<void>;
	onCancel: (receipt: ReceiptRecord, reason: string) => Promise<void>;
	onCorrect: (receipt: ReceiptRecord, correction: ReceiptCorrection, reason: string) => Promise<void>;
	canCancel: boolean;
	cancelUnavailableReason?: string;
}

function ActionButton({
	label,
	disabled = false,
	busy = false,
	destructive = false,
	onClick,
	children,
}: {
	label: string;
	disabled?: boolean;
	busy?: boolean;
	destructive?: boolean;
	onClick?: () => void;
	children: ReactNode;
}) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<span className="inline-flex">
					<TableActionIconButton
						type="button"
						aria-label={label}
						title={label}
						disabled={disabled || busy}
						className={destructive ? 'text-destructive hover:bg-destructive/10 hover:text-destructive' : undefined}
						onClick={onClick}
					>
						{busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : children}
					</TableActionIconButton>
				</span>
			</TooltipTrigger>
			<TooltipContent side="top">{label}</TooltipContent>
		</Tooltip>
	);
}

export function ReceiptActions({
	receipt,
	onPrint,
	printing,
	onDownload,
	onCancel,
	onCorrect,
	canCancel,
	cancelUnavailableReason,
}: ReceiptActionsProps) {
	const [pending, setPending] = useState<ReceiptAction | null>(null);
	const [cancelOpen, setCancelOpen] = useState(false);
	const [correctOpen, setCorrectOpen] = useState(false);
	const [reason, setReason] = useState('');
	const [formError, setFormError] = useState('');
	const [correction, setCorrection] = useState<ReceiptCorrection | null>(null);
	const correctionValues = correction ?? {
		vehicleNumber: receipt.vehicleNumber,
		ownerName: receipt.customerName,
		validUntil: receipt.validUntil,
	};

	const runAction = async (action: 'print' | 'download', callback: () => Promise<void>) => {
		setPending(action);
		try {
			await callback();
		} finally {
			setPending(null);
		}
	};

	const submitCancellation = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setFormError('');
		setPending('cancel');
		try {
			await onCancel(receipt, reason);
			setCancelOpen(false);
			setReason('');
		} catch (error) {
			setFormError(error instanceof Error ? error.message : 'रसिद रद्द गर्न सकिएन।');
		} finally {
			setPending(null);
		}
	};

	const submitCorrection = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setFormError('');
		setPending('correct');
		try {
			await onCorrect(receipt, correctionValues, reason);
			setCorrectOpen(false);
			setReason('');
		} catch (error) {
			setFormError(error instanceof Error ? error.message : 'रसिद सुधार गर्न सकिएन।');
		} finally {
			setPending(null);
		}
	};

	return (
		<TooltipProvider delayDuration={200}>
			<div className="flex items-center justify-end gap-1">
				<ActionButton
					label="रसिद प्रिन्ट"
					busy={printing || pending === 'print'}
					onClick={() => void runAction('print', () => onPrint(receipt))}
				>
					<Printer className="size-4" aria-hidden="true" />
				</ActionButton>
				<ActionButton
					label="Download PDF"
					busy={pending === 'download'}
					onClick={() => void runAction('download', () => onDownload(receipt))}
				>
					<Download className="size-4" aria-hidden="true" />
				</ActionButton>
				{receipt.status === 'PAID' ? (
					<>
				<ActionButton
					label="रसिद सुधार"
					onClick={() => {
						setReason('');
						setFormError('');
						setCorrection({
							vehicleNumber: receipt.vehicleNumber,
							ownerName: receipt.customerName,
							validUntil: receipt.validUntil,
						});
						setCorrectOpen(true);
					}}
				>
					<Pencil className="size-4" aria-hidden="true" />
				</ActionButton>
				<ActionButton label="सन्देश पठाउनुहोस् (API उपलब्ध छैन)" disabled>
					<MessageSquareText className="size-4" aria-hidden="true" />
				</ActionButton>
				<ActionButton
					label={receipt.status !== 'PAID' ? 'भुक्तानी भएको रसिद मात्र रद्द गर्न मिल्छ' : canCancel ? 'रसिद रद्द' : cancelUnavailableReason ?? 'रसिद रद्द गर्न मिल्दैन'}
					destructive
					disabled={!canCancel}
					onClick={() => {
						setReason('');
						setFormError('');
						setCancelOpen(true);
					}}
				>
					<Ban className="size-4" aria-hidden="true" />
				</ActionButton>
					</>
				) : null}
			</div>

			{receipt.status === 'PAID' ? <Dialog open={cancelOpen} onOpenChange={(open) => { if (pending !== 'cancel') setCancelOpen(open); }}>
				<DialogContent className="max-w-2xl">
					<form onSubmit={(event) => void submitCancellation(event)} className="space-y-4">
						<DialogHeader>
							<DialogTitle>रसिद रद्द गर्नुहोस्</DialogTitle>
							<DialogDescription>यो काम फिर्ता गर्न मिल्दैन। रद्द गरिएको रसिद नम्बर पुनः प्रयोग हुँदैन।</DialogDescription>
						</DialogHeader>
						<div className="space-y-2">
							<label htmlFor={`cancel-reason-${receipt.id}`} className="text-sm font-medium">रद्द गर्ने कारण</label>
							<Input id={`cancel-reason-${receipt.id}`} autoFocus required value={reason} onChange={(event) => setReason(event.target.value)} placeholder="उदाहरण: गलत रसिद/गलत रकम" maxLength={500} />
						</div>
						{formError ? <p role="alert" className="text-sm text-destructive">{formError}</p> : null}
						<DialogFooter>
							<Button type="button" variant="outline" disabled={pending === 'cancel'} onClick={() => setCancelOpen(false)}>रद्द गर्नुहोस्</Button>
							<Button type="submit" variant="destructive" loading={pending === 'cancel'} disabled={!reason.trim()}>रसिद रद्द गर्नुहोस्</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog> : null}

			{receipt.status === 'PAID' ? <Dialog open={correctOpen} onOpenChange={(open) => { if (pending !== 'correct') setCorrectOpen(open); }}>
				<DialogContent className="max-w-2xl">
					<form onSubmit={(event) => void submitCorrection(event)} className="space-y-4">
						<DialogHeader>
							<DialogTitle>रसिद सुधार गर्नुहोस्</DialogTitle>
							<DialogDescription>सुधारको कारणसहित रसिदको सवारी, नाम वा भुक्तानी मिति सम्म सच्याउनुहोस्।</DialogDescription>
						</DialogHeader>
						<div className="grid gap-3 sm:grid-cols-2">
							<div className="space-y-1.5">
								<label htmlFor={`correction-vehicle-${receipt.id}`} className="text-sm font-medium">सवारी साधन नम्बर</label>
								<Input id={`correction-vehicle-${receipt.id}`} required value={correctionValues.vehicleNumber} onChange={(event) => setCorrection({ ...correctionValues, vehicleNumber: event.target.value })} maxLength={100} />
							</div>
							<div className="space-y-1.5">
								<label htmlFor={`correction-owner-${receipt.id}`} className="text-sm font-medium">नाम</label>
								<Input id={`correction-owner-${receipt.id}`} required value={correctionValues.ownerName} onChange={(event) => setCorrection({ ...correctionValues, ownerName: event.target.value })} maxLength={150} />
							</div>
							<div className="space-y-1.5 sm:col-span-2">
								<label htmlFor={`correction-valid-until-${receipt.id}`} className="text-sm font-medium">भुक्तानी मिति सम्म</label>
								<Input id={`correction-valid-until-${receipt.id}`} type="date" required value={correctionValues.validUntil} onChange={(event) => setCorrection({ ...correctionValues, validUntil: event.target.value })} />
							</div>
							<div className="space-y-1.5 sm:col-span-2">
								<label htmlFor={`correction-reason-${receipt.id}`} className="text-sm font-medium">सुधार गर्ने कारण</label>
								<Textarea id={`correction-reason-${receipt.id}`} required value={reason} onChange={(event) => setReason(event.target.value)} placeholder="सुधारको कारण लेख्नुहोस्" maxLength={500} />
							</div>
						</div>
						{formError ? <p role="alert" className="text-sm text-destructive">{formError}</p> : null}
						<DialogFooter>
							<Button type="button" variant="outline" disabled={pending === 'correct'} onClick={() => setCorrectOpen(false)}>रद्द गर्नुहोस्</Button>
							<Button type="submit" loading={pending === 'correct'} disabled={!reason.trim()}>सुधार सेभ गर्नुहोस्</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog> : null}
		</TooltipProvider>
	);
}
