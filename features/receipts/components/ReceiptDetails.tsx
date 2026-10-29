'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ReceiptRecord } from '@/features/receipts/model/receipt';
import { formatCurrency, toNepaliDigits } from '@/utils/numbers';

export function ReceiptDetails({ receipt, open, onOpenChange }: { receipt: ReceiptRecord | null; open: boolean; onOpenChange: (open: boolean) => void }) {
	if (!receipt) return null;
	const values = [
		['रसिद नम्बर', receipt.receiptNumber],
		['बिलको प्रकार', receipt.billingType === 'GENERAL' ? 'सामान्य बिल' : 'सदस्यता बिल'],
		...(receipt.billingType === 'GENERAL' ? [] : [
			['सवारी साधन नम्बर', receipt.vehicleNumber],
			['अन्तिम अङ्क', receipt.finalDigits],
		]),
		['ग्राहक', receipt.customerName],
		...(receipt.billingType === 'GENERAL' ? [
			['सम्पर्क नम्बर', receipt.customerPhone ?? ''],
			['पान नम्बर', receipt.customerPanNumber ?? ''],
		] : []),
		['संस्था', receipt.organizationName],
		['भुक्तानी मिति', receipt.paymentDate],
		['म्याद समाप्ति', receipt.validUntil],
		['भुक्तानी विधि', receipt.paymentMethod],
		['शाखा', receipt.branchName],
		['प्रयोगकर्ता', receipt.userName],
		['स्थिति', receipt.status === 'PAID' ? 'भुक्तानी' : receipt.status === 'CANCELLED' ? 'रद्द' : 'बाँकी'],
		['कुल रकम', `रु. ${toNepaliDigits(formatCurrency(receipt.totalAmount))}`],
	];

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
				<DialogHeader><DialogTitle>रसिद विवरण</DialogTitle><DialogDescription>{receipt.receiptNumber}</DialogDescription></DialogHeader>
				<dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">{values.map(([label, value]) => <div key={label} className="min-w-0 border-b border-border/70 pb-2"><dt className="text-[10px] text-muted-foreground">{label}</dt><dd className="mt-1 break-words text-sm font-medium">{value || '—'}</dd></div>)}</dl>
				<div className="rounded-md bg-muted/40 p-3"><p className="text-xs font-medium">कैफियत</p><p className="mt-1 text-xs text-muted-foreground">{receipt.bill.content.note || 'कैफियत छैन।'}</p></div>
			</DialogContent>
		</Dialog>
	);
}
