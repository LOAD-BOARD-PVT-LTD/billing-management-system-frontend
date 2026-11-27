'use client';
import { useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { DataTablePagination } from '@/components/data-tables/DataTablePagination';
import { ReceiptColumnMenu } from '@/features/receipts/components/ReceiptColumnMenu';
import { ReceiptFilters } from '@/features/receipts/components/ReceiptFilters';
import { ReceiptHeader } from '@/features/receipts/components/ReceiptHeader';
import { ReceiptTable } from '@/features/receipts/components/ReceiptTable';
import { useReceiptColumns } from '@/features/receipts/hooks/use-receipt-columns';
import { useReceiptFilters } from '@/features/receipts/hooks/use-receipt-filters';
import type { ReceiptRecord, ReceiptSortDirection } from '@/features/receipts/model/receipt';
import type { ReceiptColumnId } from '@/features/receipts/utils/receipt-table-columns';
import { useReceipts } from '@/features/receipts/hooks/use-receipts';
import { useBranches } from '@/features/administration/branches/hooks/useBranches';
import { useUsers } from '@/features/administration/users/hooks/useUsers';
import { cancelReceipt, correctReceipt, type ReceiptCorrection } from '@/features/receipts/api/bill-resource.api';
import { useDownloadReceipt } from '@/features/receipts/hooks/use-download-receipt';
import { usePrintReceipt } from '@/features/receipts/hooks/use-print-receipt';
import { useReceiptCancelWindow } from '@/features/settings/hooks/useReceiptCancelWindow';
import { getReceiptOwnerDisplayLines } from '@/features/receipts/utils/receipt-owners';
import { createReceiptsExportTemplate } from '@/features/receipts/utils/receipt-export';
import { exportReportExcel } from '@/shared/report-export';
import { getReceiptBillIdSortValue } from '@/lib/receipts/receipt-bill-sort';

const PAGE_SIZE = 10;

function sortValue(receipt: ReceiptRecord, column: string): string | number {
	switch (column) {
		case 'customer': {
			const lines = getReceiptOwnerDisplayLines(
				receipt.customerName || receipt.bill.content.vehicle.ownerName,
				receipt.billingType === 'MEMBERSHIP' ? receipt.bill.content.vehicle.operatorName : '',
				receipt.billingType === 'MEMBERSHIP' ? receipt.bill.content.vehicle.phone : '',
			);
			return lines.map((line) => `${line.label} ${line.name}${line.suffix}`).join(' ');
		}
		case 'totalAmount': return receipt.totalAmount;
		case 'paymentDate': return receipt.paymentDate;
		case 'validUntil': return receipt.validUntil;
		case 'finalDigits': return receipt.finalDigits;
		case 'status': return receipt.status;
		case 'paymentMethod': return receipt.paymentMethod;
		case 'vehicleNumber': return receipt.vehicleNumber;
		default: return receipt.receiptNumber;
	}
}

function downloadCsv(rows: ReceiptRecord[], columns: ReceiptColumnId[], fiscalYear: string) {
	exportReportExcel(createReceiptsExportTemplate(columns, fiscalYear), rows);
}

export function ReceiptList() {
	const { records, isLoading, error, reload } = useReceipts();
	const { records: branches } = useBranches();
	const { records: users } = useUsers();
	const { downloadReceipt: downloadReceiptFile } = useDownloadReceipt();
	const { policy: cancelWindow, error: cancelWindowError } = useReceiptCancelWindow();
	const { toast } = useToast();
	const fiscalYears = Array.from(new Set(records.map((receipt) => receipt.fiscalYear).filter(Boolean)));
	const [fiscalYear, setFiscalYear] = useState('all');
	const [page, setPage] = useState(1);
	const [sortColumn, setSortColumn] = useState('receiptNumber');
	const [sortDirection, setSortDirection] = useState<ReceiptSortDirection>('desc');
	const [copyCount, setCopyCount] = useState(1);
	const { printReceipt, printingReceiptId } = usePrintReceipt();
	const { visibleColumns, applyColumns } = useReceiptColumns();
	const { filters, updateFilter, flushSearch, clearFilters, filteredRecords, isFiltered } = useReceiptFilters(records, fiscalYear, users);

	const sortedRecords = useMemo(() => {
		if (!sortDirection) return filteredRecords;
		const direction = sortDirection === 'asc' ? 1 : -1;
		return [...filteredRecords].sort((first, second) => {
			if (sortColumn === 'receiptNumber') {
				const left = getReceiptBillIdSortValue(first.bill.id, first.receiptNumber);
				const right = getReceiptBillIdSortValue(second.bill.id, second.receiptNumber);
				if (left !== null && right !== null) return (left < right ? -1 : left > right ? 1 : 0) * direction;
				if (left !== null) return -1 * direction;
				if (right !== null) return 1 * direction;
				return String(first.receiptNumber).localeCompare(String(second.receiptNumber), 'ne') * direction;
			}
			const left = sortValue(first, sortColumn);
			const right = sortValue(second, sortColumn);
			return (typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right), 'ne')) * direction;
		});
	}, [filteredRecords, sortColumn, sortDirection]);
	const pageCount = Math.max(1, Math.ceil(sortedRecords.length / PAGE_SIZE));
	const currentPage = Math.min(page, pageCount);
	const pageRecords = sortedRecords.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
	const updateReceiptFilter = <K extends keyof typeof filters>(key: K, value: (typeof filters)[K]) => {
		updateFilter(key, value);
		if (key === 'branch') {
			updateFilter('user', 'all');
		}
		setPage(1);
	};
	const printSelectedReceipt = (receipt: ReceiptRecord) => printReceipt(receipt, copyCount);
	const handleSort = (column: string, direction: ReceiptSortDirection) => {
		setSortColumn(column);
		setSortDirection(direction);
	};
	const downloadReceipt = (receipt: ReceiptRecord) => downloadReceiptFile(receipt);
	const cancelReceiptRecord = async (receipt: ReceiptRecord, reason: string) => {
		try {
			if (!canCancel(receipt)) {
				throw new Error(cancelUnavailableReason(receipt) ?? 'रसिद रद्द गर्ने समय सीमा सकिएको छ।');
			}
			await cancelReceipt(receipt, reason);
			toast({ title: 'रसिद रद्द भयो', description: `${receipt.receiptNumber} रद्द गरिएको छ।` });
			await reload();
		} catch (cause) {
			toast({
				title: 'रसिद रद्द गर्न सकिएन',
				description: cause instanceof Error ? cause.message : 'कृपया पुनः प्रयास गर्नुहोस्।',
				variant: 'destructive',
			});
			throw cause;
		}
	};
	const correctReceiptRecord = async (receipt: ReceiptRecord, correction: ReceiptCorrection, reason: string) => {
		try {
			await correctReceipt(receipt, correction, reason);
			toast({ title: 'रसिद सुधार भयो', description: `${receipt.receiptNumber} सुधार गरिएको छ।` });
			await reload();
		} catch (cause) {
			toast({
				title: 'रसिद सुधार गर्न सकिएन',
				description: cause instanceof Error ? cause.message : 'कृपया पुनः प्रयास गर्नुहोस्।',
				variant: 'destructive',
			});
			throw cause;
		}
	};
	const canCancel = (receipt: ReceiptRecord) => {
		if (!cancelWindow) return false;
		if (!cancelWindow.enabled) return true;
		const paidAt = Date.parse(receipt.bill.createdAt);
		const elapsed = Date.now() - paidAt;
		return Number.isFinite(paidAt) && elapsed >= 0 && elapsed <= cancelWindow.hours * 60 * 60 * 1000;
	};
	const cancelUnavailableReason = (receipt: ReceiptRecord) => {
		if (cancelWindowError) return 'रद्द समय सीमा सेटिङ लोड नभएकाले रद्द गर्न मिल्दैन';
		if (!cancelWindow) return 'रद्द समय सीमा सेटिङ लोड हुँदैछ';
		if (receipt.status !== 'PAID') return 'भुक्तानी भएको रसिद मात्र रद्द गर्न मिल्छ';
		if (!cancelWindow.enabled) return undefined;
		if (!Number.isFinite(Date.parse(receipt.bill.createdAt))) return 'रसिदको भुक्तानी समय उपलब्ध छैन';
		return 'रद्द गर्ने समय सीमा सकिएको छ';
	};

	return (
		<section className="space-y-4 pb-8">
			<ReceiptHeader
				fiscalYear={fiscalYear}
				fiscalYears={fiscalYears}
				onFiscalYearChange={(value) => { setFiscalYear(value); setPage(1); }}
				copyCount={copyCount}
				onCopyCountChange={setCopyCount}
				onExport={() => downloadCsv(sortedRecords, visibleColumns, fiscalYear)}
				columnsMenu={<ReceiptColumnMenu visibleColumns={visibleColumns} onApply={applyColumns} />}
				resultCount={sortedRecords.length}
			/>

			{error && (
				<div role="alert" className="flex flex-col gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between">
					<span className="flex items-start gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{error}</span>
					<Button type="button" variant="outline" size="sm" onClick={() => void reload()}>पुनः प्रयास</Button>
				</div>
			)}

			<ReceiptFilters
				records={records}
				branches={branches}
				users={users}
				filters={filters}
				onUpdate={updateReceiptFilter}
				onSearchCommit={flushSearch}
				onClear={() => { clearFilters(); setPage(1); }}
				isFiltered={isFiltered}
			/>

			<section className="rounded-lg border border-border/80 bg-card p-3 shadow-sm sm:p-4" aria-label="रसिद तालिका">
				<div className="mb-3 flex items-center justify-between gap-3">
					<p className="text-xs text-muted-foreground" aria-live="polite">{sortedRecords.length} रसिद</p>
					<p className="text-[10px] text-muted-foreground">देखाइएका स्तम्भ: {visibleColumns.length}</p>
				</div>
				<ReceiptTable
					rows={pageRecords}
					visibleColumns={visibleColumns}
					sortColumn={sortColumn}
					sortDirection={sortDirection}
					onSort={handleSort}
					onPrint={printSelectedReceipt}
					printingReceiptId={printingReceiptId}
					onDownload={downloadReceipt}
					onCancel={cancelReceiptRecord}
					onCorrect={correctReceiptRecord}
					canCancel={canCancel}
					cancelUnavailableReason={cancelUnavailableReason}
					isLoading={isLoading}
				/>
				<DataTablePagination page={currentPage} pageSize={PAGE_SIZE} total={sortedRecords.length} onPageChange={setPage} className="mt-3" />
			</section>

		</section>
	);
}
