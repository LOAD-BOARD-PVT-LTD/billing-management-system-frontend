'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/components/ui/use-toast';
import { recordReceiptPrint } from '@/features/receipts/api/bill-resource.api';
import type { ReceiptRecord } from '@/features/receipts/model/receipt';
import { buildReceiptPdfUrl } from '@/features/receipts/utils/receipt-pdf-url';
import { receiptsKeys } from '@/lib/query/query-keys';

export function usePrintReceipt() {
	const [printingReceiptId, setPrintingReceiptId] = useState<string | null>(null);
	const queryClient = useQueryClient();
	const { toast } = useToast();

	const printReceipt = async (receipt: ReceiptRecord, copies: number) => {
		if (printingReceiptId) return;
		const pdfUrl = buildReceiptPdfUrl(receipt.id, {
			copies,
			copyStart: receipt.printedCopyCount + 1,
		});
		const printWindow = window.open(pdfUrl, '_blank', 'noopener,noreferrer');
		if (!printWindow) {
			toast({
				title: 'रसिद प्रिन्ट गर्न सकिएन',
				description: 'पप-अप रोकिएको छ। यस साइटका लागि पप-अप अनुमति दिएर पुनः प्रयास गर्नुहोस्।',
				variant: 'destructive',
			});
			return;
		}

		setPrintingReceiptId(receipt.id);
		try {
			await recordReceiptPrint(receipt.id, receipt.resourceContent ?? receipt.bill.content, receipt.externalContent, copies);
			await queryClient.invalidateQueries({ queryKey: receiptsKeys.lists() });
			toast({
				title: 'रसिद हेर्न तयार भयो',
				description: `${copies} प्रतिलिपि सहित रसिद नयाँ ट्याबमा खुल्यो। त्यहाँबाट आवश्यक भए प्रिन्ट गर्नुहोस्।`,
			});
		} catch (cause) {
			toast({
				title: 'प्रिन्ट अभिलेख सुरक्षित भएन',
				description: cause instanceof Error ? cause.message : 'कृपया पुनः प्रयास गर्नुहोस्।',
				variant: 'destructive',
			});
		} finally {
			setPrintingReceiptId(null);
		}
	};

	return { printReceipt, printingReceiptId };
}
