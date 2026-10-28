'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useBillingEntities } from '@/features/administration/billing-entities/hooks/useBillingEntities';
import type { ReceiptRecord } from '@/features/receipts/model/receipt';
import { createReceiptPdfBlob } from '@/features/receipts/services/receipt-document.service';
import { resolveBillBranding } from '@/shared/document-generation/utils/resolve-bill-branding';

export function useDownloadReceipt() {
	const [downloadingReceiptId, setDownloadingReceiptId] = useState<string | null>(null);
	const { records: billingEntities } = useBillingEntities();
	const { toast } = useToast();

	const downloadReceipt = async (receipt: ReceiptRecord) => {
		if (downloadingReceiptId) return;
		setDownloadingReceiptId(receipt.id);
		try {
			const blob = await createReceiptPdfBlob(receipt.bill, 1, {
				voided: receipt.status === 'CANCELLED',
				branding: resolveBillBranding(receipt.bill, billingEntities),
				showCopyLabel: false,
			});
			if (blob.type !== 'application/pdf' || blob.size === 0) {
				throw new Error('रसिदको PDF तयार भएन। कृपया पुनः प्रयास गर्नुहोस्।');
			}
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = `receipt-${receipt.receiptNumber.replace(/[^\w.-]+/gu, '-')}.pdf`;
			link.click();
			window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
		} catch (cause) {
			toast({
				title: 'रसिद डाउनलोड गर्न सकिएन',
				description: cause instanceof Error ? cause.message : 'कृपया पुनः प्रयास गर्नुहोस्।',
				variant: 'destructive',
			});
		} finally {
			setDownloadingReceiptId(null);
		}
	};

	return { downloadReceipt, downloadingReceiptId };
}
