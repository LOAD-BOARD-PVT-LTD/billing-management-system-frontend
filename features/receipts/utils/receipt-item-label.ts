import { formatDocumentCount } from '@/shared/document-generation/utils/format-currency';

export function formatReceiptItemLabel(item: {
	title: string;
	billingMonths?: number;
}): string {
	if (!Number.isInteger(item.billingMonths) || !item.billingMonths || item.billingMonths < 1) {
		return item.title;
	}

	return `${item.title} (${formatDocumentCount(item.billingMonths)} महिना)`;
}
