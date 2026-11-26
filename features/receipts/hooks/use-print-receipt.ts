'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/components/ui/use-toast';
import { useBillingEntities } from '@/features/administration/billing-entities/hooks/useBillingEntities';
import { recordReceiptPrint } from '@/features/receipts/api/bill-resource.api';
import type { ReceiptRecord } from '@/features/receipts/model/receipt';
import { createReceiptPdfBlob } from '@/features/receipts/services/receipt-document.service';
import { receiptsKeys } from '@/lib/query/query-keys';
import { resolveBillBranding } from '@/shared/document-generation/utils/resolve-bill-branding';

export function usePrintReceipt() {
	const [printingReceiptId, setPrintingReceiptId] = useState<string | null>(null);
	const queryClient = useQueryClient();
	const { records: billingEntities } = useBillingEntities();
	const { toast } = useToast();

	const printReceipt = async (receipt: ReceiptRecord, copies: number) => {
		if (printingReceiptId) return;
		const printWindow = window.open('', '_blank');
		if (!printWindow) {
			toast({
				title: 'रसिद प्रिन्ट गर्न सकिएन',
				description: 'पप-अप रोकिएको छ। यस साइटका लागि पप-अप अनुमति दिएर पुनः प्रयास गर्नुहोस्।',
				variant: 'destructive',
			});
			return;
		}

		setPrintingReceiptId(receipt.id);
		let url = '';
		try {
			const blob = await createReceiptPdfBlob(receipt.bill, copies, {
				voided: receipt.status === 'CANCELLED',
				branding: resolveBillBranding(receipt.bill, billingEntities),
				copyNumberStart: receipt.printedCopyCount + 1,
			});
			if (blob.type !== 'application/pdf' || blob.size === 0) throw new Error('रसिद PDF तयार भएन।');
			url = URL.createObjectURL(blob);
			printWindow.location.href = url;
			await recordReceiptPrint(receipt.id, receipt.resourceContent ?? receipt.bill.content, receipt.externalContent, copies);
			await queryClient.invalidateQueries({ queryKey: receiptsKeys.lists() });
			printWindow.focus();
			toast({
				title: 'रसिद हेर्न तयार भयो',
				description: `${copies} प्रतिलिपि सहित रसिद नयाँ ट्याबमा खुल्यो। त्यहाँबाट आवश्यक भए प्रिन्ट गर्नुहोस्।`,
			});
		} catch (cause) {
			printWindow.close();
			if (url) URL.revokeObjectURL(url);
			toast({
				title: 'रसिद प्रिन्ट गर्न सकिएन',
				description: cause instanceof Error ? cause.message : 'कृपया पुनः प्रयास गर्नुहोस्।',
				variant: 'destructive',
			});
		} finally {
			if (url) window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
			setPrintingReceiptId(null);
		}
	};

	return { printReceipt, printingReceiptId };
}
