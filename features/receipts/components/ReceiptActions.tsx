'use client';

import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { ArrowLeft, Ban, Download, LoaderCircle, MessageSquareText, Pencil, Printer } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { NepaliDatePicker } from '@/components/ui/nepali-date-picker';
import { Textarea } from '@/components/ui/textarea';
import { TableActionIconButton } from '@/components/ui/table-action-icon-button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { ReceiptCorrection } from '@/features/receipts/api/bill-resource.api';
import type { ReceiptRecord } from '@/features/receipts/model/receipt';
import { formatCurrency, toNepaliDigits } from '@/utils/numbers';

type ReceiptAction = 'print' | 'download' | 'cancel' | 'correct';

const PAYMENT_METHODS = ['नगद', 'बैंक', 'अनलाइन'];

function createReceiptCorrection(receipt: ReceiptRecord): ReceiptCorrection {
	return {
		ownerName: receipt.customerName,
		billingDate: receipt.bill.content.billingDate,
		periodStart: receipt.bill.content.periodStart,
		periodEnd: receipt.bill.content.periodEnd,
		paymentMethod: receipt.paymentMethod,
		items: receipt.bill.content.items.map((item) => ({ ...item })),
		note: receipt.bill.content.note,
	};
}

function dateValue(value: string): Date | undefined {
	if (!value) return undefined;
	const date = new Date(`${value.slice(0, 10)}T00:00:00`);
	return Number.isNaN(date.getTime()) ? undefined : date;
}

function dateString(value: Date | undefined): string {
	if (!value) return '';
	const year = value.getFullYear();
	const month = String(value.getMonth() + 1).padStart(2, '0');
	const day = String(value.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function formatAmount(amount: number): string {
	return `रु. ${toNepaliDigits(formatCurrency(amount))}`;
}

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
	const correctionValues = correction ?? createReceiptCorrection(receipt);
	const originalValues = createReceiptCorrection(receipt);
	const hasChanges = JSON.stringify(correctionValues) !== JSON.stringify(originalValues);
	const subtotal = correctionValues.items.reduce((sum, item) => sum + item.amount, 0);
	const discount = receipt.bill.content.discount;
	const total = Math.max(0, subtotal - discount);

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
				{receipt.billingType === 'MEMBERSHIP' ? (
					<ActionButton
						label="रसिद सुधार"
						onClick={() => {
							setReason('');
							setFormError('');
							setCorrection(createReceiptCorrection(receipt));
							setCorrectOpen(true);
						}}
					>
						<Pencil className="size-4" aria-hidden="true" />
					</ActionButton>
				) : null}
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

			{receipt.status === 'PAID' && receipt.billingType === 'MEMBERSHIP' ? <Dialog open={correctOpen} onOpenChange={(open) => { if (pending !== 'correct') setCorrectOpen(open); }}>
				<DialogContent className="max-h-[92vh] max-w-6xl gap-0 overflow-y-auto p-0 sm:max-w-6xl">
					<form onSubmit={(event) => void submitCorrection(event)} className="space-y-4 p-5 sm:p-6">
						<div className="flex items-start justify-between gap-4">
							<DialogHeader>
								<DialogTitle className="text-2xl">रसिद सुधार</DialogTitle>
								<DialogDescription>रसिदको भुक्तानी विवरण, सेवा अवधि र शुल्क सच्याउनुहोस्।</DialogDescription>
							</DialogHeader>
							<Button type="button" variant="outline" className="shrink-0" disabled={pending === 'correct'} onClick={() => setCorrectOpen(false)}>
								<ArrowLeft aria-hidden="true" className="mr-2 size-4" /> रसिदमा फर्कनुहोस्
							</Button>
						</div>

						<section className="rounded-xl border bg-muted/20 p-4" aria-label="रसिद विवरण">
							<dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
								<div><dt className="text-sm text-muted-foreground">रसिद नम्बर</dt><dd className="font-semibold">{receipt.receiptNumber}</dd></div>
								<div><dt className="text-sm text-muted-foreground">नाम</dt><dd className="font-semibold">{receipt.customerName}</dd></div>
								<div><dt className="text-sm text-muted-foreground">सवारी साधन नम्बर</dt><dd className="font-semibold">{receipt.vehicleNumber}</dd></div>
								<div><dt className="text-sm text-muted-foreground">शाखा (Branch)</dt><dd className="font-semibold">{receipt.branchName}</dd></div>
							</dl>
							<p className="mt-3 text-sm text-muted-foreground">स्थिति: <span className="font-medium text-emerald-700">भुक्तानी</span></p>
						</section>

						<section className="space-y-4 rounded-xl border p-4">
							<h3 className="font-semibold">सच्याउने विवरण</h3>
							<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
								<div className="space-y-1.5">
									<label htmlFor={`correction-method-${receipt.id}`} className="text-sm font-medium">भुक्तानी प्रकार</label>
									<select
										id={`correction-method-${receipt.id}`}
										required
										value={correctionValues.paymentMethod}
										onChange={(event) => setCorrection({ ...correctionValues, paymentMethod: event.target.value })}
										className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
									>
										{[...new Set([...PAYMENT_METHODS, correctionValues.paymentMethod].filter(Boolean))].map((method) => <option key={method} value={method}>{method}</option>)}
									</select>
								</div>
								<div className="space-y-1.5">
									<label htmlFor={`correction-billing-date-${receipt.id}`} className="text-sm font-medium">भुक्तानी मिति</label>
									<NepaliDatePicker id={`correction-billing-date-${receipt.id}`} required value={dateValue(correctionValues.billingDate)} onChange={(date) => setCorrection({ ...correctionValues, billingDate: dateString(date) })} />
								</div>
								<div className="space-y-1.5">
									<label htmlFor={`correction-period-start-${receipt.id}`} className="text-sm font-medium">देखि मिति (BS)</label>
									<NepaliDatePicker id={`correction-period-start-${receipt.id}`} required value={dateValue(correctionValues.periodStart)} onChange={(date) => setCorrection({ ...correctionValues, periodStart: dateString(date) })} />
								</div>
								<div className="space-y-1.5">
									<label htmlFor={`correction-period-end-${receipt.id}`} className="text-sm font-medium">सम्म मिति (BS)</label>
									<NepaliDatePicker id={`correction-period-end-${receipt.id}`} required value={dateValue(correctionValues.periodEnd)} onChange={(date) => setCorrection({ ...correctionValues, periodEnd: dateString(date) })} />
								</div>
							</div>

							<div className="grid gap-3 sm:grid-cols-2">
								<div className="space-y-1.5">
									<label htmlFor={`correction-owner-${receipt.id}`} className="text-sm font-medium">नाम</label>
									<Input id={`correction-owner-${receipt.id}`} required value={correctionValues.ownerName} onChange={(event) => setCorrection({ ...correctionValues, ownerName: event.target.value })} maxLength={150} />
								</div>
							</div>

							<div className="overflow-x-auto rounded-lg border">
								<table className="w-full min-w-[36rem] text-sm">
									<thead className="bg-muted/40 text-left">
										<tr><th className="px-3 py-2 font-medium">सि.नं.</th><th className="px-3 py-2 font-medium">शुल्क शीर्षक</th><th className="px-3 py-2 font-medium">विवरण</th><th className="px-3 py-2 text-right font-medium">रकम</th></tr>
									</thead>
									<tbody className="divide-y">
										{correctionValues.items.map((item, index) => (
											<tr key={`${item.feeHeadId}-${index}`}>
												<td className="px-3 py-2">{toNepaliDigits(index + 1)}</td>
												<td className="px-3 py-2">{item.title}</td>
												<td className="px-3 py-2">{item.billingEntity || '—'}</td>
												<td className="w-44 px-3 py-2">
													<Input
														aria-label={`${item.title} रकम`}
														type="number"
														min="0"
														step="0.01"
														required
														value={item.amount}
														onChange={(event) => {
															const amount = Number(event.target.value);
															setCorrection({
																...correctionValues,
																items: correctionValues.items.map((current, itemIndex) => itemIndex === index ? { ...current, amount } : current),
															});
														}}
														className="text-right"
													/>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>

							<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
								<details className="text-sm">
									<summary className="cursor-pointer text-muted-foreground">सुधारअघि रहेको रकम हेर्नुहोस्</summary>
									<dl className="mt-2 space-y-1 rounded-lg border p-3">
										{originalValues.items.map((item, index) => <div key={`${item.feeHeadId}-${index}`} className="flex justify-between gap-6"><dt>{item.title}</dt><dd>{formatAmount(item.amount)}</dd></div>)}
										<div className="flex justify-between gap-6 border-t pt-1 font-medium"><dt>कुल रकम</dt><dd>{formatAmount(receipt.totalAmount)}</dd></div>
									</dl>
								</details>
								<dl className="w-full max-w-sm space-y-1 rounded-lg border p-3 text-sm">
									<div className="flex justify-between gap-4"><dt className="text-muted-foreground">जम्मा रकम</dt><dd>{formatAmount(subtotal)}</dd></div>
									<div className="flex justify-between gap-4"><dt className="text-muted-foreground">छुट</dt><dd>{formatAmount(discount)}</dd></div>
									<div className="flex justify-between gap-4 border-t pt-1 font-semibold"><dt>कुल रकम</dt><dd>{formatAmount(total)}</dd></div>
								</dl>
							</div>

							<div className="space-y-1.5">
								<label htmlFor={`correction-note-${receipt.id}`} className="text-sm font-medium">टिप्पणी (ऐच्छिक)</label>
								<Textarea id={`correction-note-${receipt.id}`} value={correctionValues.note} onChange={(event) => setCorrection({ ...correctionValues, note: event.target.value })} maxLength={500} />
							</div>

							<div className="space-y-1.5">
								<label htmlFor={`correction-reason-${receipt.id}`} className="text-sm font-medium">कारण</label>
								<Input id={`correction-reason-${receipt.id}`} required value={reason} onChange={(event) => setReason(event.target.value)} placeholder="उदाहरण: भुक्तानी मिति गलत थियो" maxLength={500} />
							</div>

							{formError ? <p role="alert" className="text-sm text-destructive">{formError}</p> : null}
							<DialogFooter className="border-t pt-4 sm:justify-between">
								<p className="self-center text-sm text-muted-foreground">{hasChanges ? 'परिवर्तन सुरक्षित गर्न तयार छ।' : 'सुरक्षित गर्न कुनै परिवर्तन छैन।'}</p>
								<Button type="submit" loading={pending === 'correct'} disabled={!reason.trim() || !hasChanges}>सुधार सुरक्षित गर्नुहोस्</Button>
							</DialogFooter>
						</section>
					</form>
				</DialogContent>
			</Dialog> : null}
		</TooltipProvider>
	);
}
