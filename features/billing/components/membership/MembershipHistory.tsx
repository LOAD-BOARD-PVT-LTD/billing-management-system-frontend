'use client';

import { ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { ReceiptRecord } from '@/features/receipts/model/receipt';
import { convertADtoBS } from '@/utils/nepali-calender-dates/nepali-fiscal-year';
import { formatCurrency, toNepaliDigits } from '@/utils/numbers';

type MembershipHistoryProps = {
	vehicleId: string;
	vehicleNumber: string;
	records: ReceiptRecord[];
	isLoading: boolean;
	error: string | null;
	onReload: () => void;
	onDownloadReceipt: (receipt: ReceiptRecord) => void;
	downloadingReceiptId: string | null;
};

function displayDate(value: string) {
	const date = new Date(`${value}T00:00:00`);
	if (Number.isNaN(date.getTime())) return toNepaliDigits(value || '—');
	try {
		return toNepaliDigits(convertADtoBS(date).replaceAll('-', '/'));
	} catch {
		return toNepaliDigits(value.replaceAll('-', '/'));
	}
}

function belongsToVehicle(receipt: ReceiptRecord, vehicleId: string, vehicleNumber: string) {
	const billVehicleId = receipt.bill.content.vehicle.id.trim();
	if (vehicleId && billVehicleId) return billVehicleId === vehicleId;

	return receipt.vehicleNumber.trim().toLocaleLowerCase()
		=== vehicleNumber.trim().toLocaleLowerCase();
}

function dateSortValue(receipt: ReceiptRecord) {
	const billingDate = Date.parse(`${receipt.billingDate}T00:00:00`);
	return Number.isNaN(billingDate) ? Date.parse(receipt.bill.createdAt) || 0 : billingDate;
}

export function MembershipHistory({
	vehicleId,
	vehicleNumber,
	records,
	isLoading,
	error,
	onReload,
	onDownloadReceipt,
	downloadingReceiptId,
}: MembershipHistoryProps) {
	const history = records
		.filter((receipt) => belongsToVehicle(receipt, vehicleId, vehicleNumber))
		.sort((left, right) => dateSortValue(right) - dateSortValue(left));

	return (
		<section className="overflow-hidden rounded-md border border-border bg-card">
			<header className="flex flex-wrap items-center justify-between gap-1 border-b border-border px-2 py-1">
				<h2 className="flex items-center gap-1 text-xs font-semibold text-foreground">
					<ClipboardList aria-hidden="true" className="size-3.5 text-primary" />सदस्यता विवरण
				</h2>
				<nav aria-label="सदस्यता लिङ्कहरू" className="flex items-center gap-1">
					<Button asChild size="xs" className="h-6 px-2">
						<Link href="/dashboard/receipts">रसीदहरू</Link>
					</Button>
					<Button asChild type="button" variant="outline" size="xs" className="h-6 px-2">
						<Link href="/dashboard/member-transaction-report">सदस्यता रिपोर्ट</Link>
					</Button>
				</nav>
			</header>
			{error ? (
				<div role="alert" className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs text-destructive">
					<span>अघिल्ला बिलहरूको विवरण लोड गर्न सकिएन: {error}</span>
					<Button type="button" variant="outline" size="sm" onClick={onReload}>
						पुनः प्रयास
					</Button>
				</div>
			) : isLoading ? (
				<p role="status" className="px-3 py-2 text-center text-xs text-muted-foreground">
					अघिल्ला बिलहरू लोड हुँदैछन्...
				</p>
			) : history.length === 0 ? (
				<p className="px-3 py-2 text-center text-xs text-muted-foreground">
					यस सवारीको अघिल्लो बिल भेटिएन।
				</p>
			) : (
				<div className="max-h-32 overflow-auto">
					<table className="w-full min-w-[1050px] text-left text-xs">
						<thead className="bg-muted/50 text-muted-foreground">
							<tr>
								<th scope="col" className="sticky top-0 bg-muted/95 px-2 py-1 font-medium">मिति</th>
								<th scope="col" className="sticky top-0 bg-muted/95 px-2 py-1 font-medium">देखि</th>
								<th scope="col" className="sticky top-0 bg-muted/95 px-2 py-1 font-medium">सम्म</th>
								<th scope="col" className="sticky top-0 bg-muted/95 px-2 py-1 font-medium">रसिद नं.</th>
								<th scope="col" className="sticky top-0 bg-muted/95 px-2 py-1 text-right font-medium">रकम</th>
								<th scope="col" className="sticky top-0 bg-muted/95 px-2 py-1 font-medium">शाखा</th>
								<th scope="col" className="sticky top-0 bg-muted/95 px-2 py-1 font-medium">प्रयोगकर्ता नाम (Username)</th>
								<th scope="col" className="sticky top-0 bg-muted/95 px-2 py-1 font-medium">शुल्क विवरण</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{history.map((receipt) => {
								const items = receipt.bill.content.items
									.map((item) => item.title.trim())
									.filter(Boolean);
								const feeDescription = items.length > 0 ? [...new Set(items)].join(', ') : '—';

								return (
									<tr key={receipt.id} className="align-top">
										<td className="whitespace-nowrap px-2 py-1">{displayDate(receipt.billingDate)}</td>
										<td className="whitespace-nowrap px-2 py-1">{displayDate(receipt.bill.content.periodStart)}</td>
										<td className="whitespace-nowrap px-2 py-1">{displayDate(receipt.bill.content.periodEnd)}</td>
										<td className="whitespace-nowrap px-2 py-1 font-medium">
											<button
												type="button"
												className="text-primary hover:underline disabled:cursor-wait disabled:opacity-60"
												aria-label={`रसिद ${receipt.receiptNumber} (${toNepaliDigits(receipt.fiscalYear)}) डाउनलोड गर्नुहोस्`}
												disabled={downloadingReceiptId !== null}
												onClick={() => onDownloadReceipt(receipt)}
											>
												{receipt.receiptNumber} ({toNepaliDigits(receipt.fiscalYear)})
											</button>
										</td>
										<td className="whitespace-nowrap px-2 py-1 text-right tabular-nums">
											रु. {toNepaliDigits(formatCurrency(receipt.totalAmount))}
										</td>
										<td className="px-2 py-1">{receipt.branchName || '—'}</td>
										<td className="px-2 py-1">{receipt.userName || '—'}</td>
										<td className="max-w-72 whitespace-normal px-2 py-1">{feeDescription}</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}
		</section>
	);
}
