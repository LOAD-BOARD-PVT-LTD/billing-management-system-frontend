import { DataTable, type DataTableColumn } from '@/components/data-tables/DataTable';
import { DataTableColumnHeader, type SortDirection } from '@/components/data-tables/DataTableColumnHeader';
import { ReceiptActions } from '@/features/receipts/components/ReceiptActions';
import type { ReceiptRecord } from '@/features/receipts/model/receipt';
import { getMemberOwnerDisplayLines } from '@/features/receipts/utils/receipt-owners';
import { formatReceiptDate } from '@/features/receipts/utils/receipt-date';
import type { ReceiptColumnId } from '@/features/receipts/utils/receipt-table-columns';
import { formatCurrency, toNepaliDigits } from '@/utils/numbers';

interface ReceiptTableProps {
	rows: ReceiptRecord[];
	visibleColumns: ReceiptColumnId[];
	sortColumn: string;
	sortDirection: SortDirection;
	onSort: (column: string, direction: SortDirection) => void;
	onPrint: (receipt: ReceiptRecord) => Promise<void>;
	printingReceiptId: string | null;
	onDownload: (receipt: ReceiptRecord) => Promise<void>;
	onCancel: (receipt: ReceiptRecord, reason: string) => Promise<void>;
	onCorrect: (receipt: ReceiptRecord, correction: import('@/features/receipts/api/bill-resource.api').ReceiptCorrection, reason: string) => Promise<void>;
	canCancel: (receipt: ReceiptRecord) => boolean;
	cancelUnavailableReason: (receipt: ReceiptRecord) => string | undefined;
	isLoading?: boolean;
}

function heading(label: string, id: string, sortColumn: string, sortDirection: SortDirection, onSort: ReceiptTableProps['onSort']) {
	return <DataTableColumnHeader label={label} sortDirection={sortColumn === id ? sortDirection : null} onSortChange={(direction) => onSort(id, direction)} />;
}

export function ReceiptTable({ rows, visibleColumns, sortColumn, sortDirection, onSort, onPrint, printingReceiptId, onDownload, onCancel, onCorrect, canCancel, cancelUnavailableReason, isLoading = false }: ReceiptTableProps) {
	const allColumns: Record<ReceiptColumnId, DataTableColumn<ReceiptRecord>> = {
		receiptNumber: {
			id: 'receiptNumber',
			header: heading('रसिद नम्बर', 'receiptNumber', sortColumn, sortDirection, onSort),
			cell: (receipt) => <span className={`whitespace-nowrap font-medium ${receipt.status === 'CANCELLED' ? 'text-red-600 line-through decoration-red-600 decoration-2' : ''}`}>{toNepaliDigits(receipt.receiptNumber)}</span>,
			headerClassName: 'min-w-32',
		},
		vehicleNumber: {
			id: 'vehicleNumber',
			header: heading('सवारी साधन नम्बर', 'vehicleNumber', sortColumn, sortDirection, onSort),
			cell: (receipt) => (
				<div className="max-w-44 space-y-0.5">
					<span className="block break-words font-semibold" title={receipt.vehicleNumber || 'सामान्य बिल'}>
						{receipt.billingType === 'GENERAL' ? 'सामान्य बिल' : receipt.vehicleNumber}
					</span>
					{receipt.billingType === 'MEMBERSHIP' && receipt.bill.content.vehicle.route ? (
						<span className="block break-words text-xs text-muted-foreground">
							रुट: {receipt.bill.content.vehicle.route}
						</span>
					) : null}
				</div>
			),
			headerClassName: 'min-w-40',
		},
		finalDigits: {
			id: 'finalDigits',
			header: heading('अन्तिम अङ्क', 'finalDigits', sortColumn, sortDirection, onSort),
			cell: (receipt) => <span className="whitespace-nowrap font-medium tabular-nums">{toNepaliDigits(receipt.finalDigits)}</span>,
			cellClassName: 'whitespace-nowrap',
		},
		customer: {
			id: 'customer',
			header: heading('नाम', 'customer', sortColumn, sortDirection, onSort),
			cell: (receipt) => {
				const ownerLines = getMemberOwnerDisplayLines(
					receipt.customerName || receipt.bill.content.vehicle.ownerName,
					receipt.billingType === 'MEMBERSHIP' ? receipt.bill.content.vehicle.operatorName : '',
				);
				return (
					<div className="max-w-56 space-y-0.5">
						{ownerLines.map((line) => (
							<p key={`${line.label}-${line.name}`} className="line-clamp-2 break-words">
								{line.label ? <span className="text-muted-foreground">{line.label}</span> : null}
								{line.label ? ' ' : ''}{line.name}{line.suffix}
							</p>
						))}
					</div>
				);
			},
			headerClassName: 'min-w-48',
		},
		paymentDate: {
			id: 'paymentDate',
			header: heading('भु. मिति (बाट)', 'paymentDate', sortColumn, sortDirection, onSort),
			cell: (receipt) => <span className="whitespace-nowrap">{formatReceiptDate(receipt.billingDate)}</span>,
			cellClassName: 'whitespace-nowrap',
		},
		validUntil: {
			id: 'validUntil',
			header: heading('भु. मिति सम्म', 'validUntil', sortColumn, sortDirection, onSort),
			cell: (receipt) => <div className="space-y-1"><span className="block whitespace-nowrap">{formatReceiptDate(receipt.validUntil)}</span>{receipt.lastCorrection ? <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-600" title={`सुधार मिति: ${receipt.lastCorrection.at}; कारण: ${receipt.lastCorrection.reason}`}>सुधार भयो</span> : null}</div>,
			cellClassName: 'whitespace-nowrap',
		},
		paymentMethod: {
			id: 'paymentMethod',
			header: heading('भु. विधि', 'paymentMethod', sortColumn, sortDirection, onSort),
			cell: (receipt) => receipt.paymentMethod,
		},
		status: {
			id: 'status',
			header: heading('स्थिति', 'status', sortColumn, sortDirection, onSort),
			cell: (receipt) => {
				const label = receipt.status === 'PAID' ? 'भुक्तानी' : receipt.status === 'CANCELLED' ? 'रद्द' : 'बाँकी';
				const style = receipt.status === 'PAID' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : receipt.status === 'CANCELLED' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-amber-200 bg-amber-50 text-amber-800';
				return <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-1 text-[10px] font-medium ${style}`}>{label}</span>;
			},
		},
		totalAmount: {
			id: 'totalAmount',
			header: <div className="text-right">{heading('कुल रकम', 'totalAmount', sortColumn, sortDirection, onSort)}</div>,
			cell: (receipt) => <span className="block whitespace-nowrap text-right font-medium tabular-nums">{toNepaliDigits(formatCurrency(receipt.status === 'CANCELLED' ? 0 : receipt.totalAmount))}</span>,
			headerClassName: 'text-right',
			cellClassName: 'text-right',
		},
	};

	const columns = visibleColumns.map((id) => allColumns[id]);
	columns.push({
		id: 'actions',
		header: <span className="block text-right text-[10px]">कार्यहरू</span>,
		cell: (receipt) => <ReceiptActions
			receipt={receipt}
			onPrint={onPrint}
			printing={printingReceiptId === receipt.id}
			onDownload={onDownload}
			onCancel={onCancel}
			onCorrect={onCorrect}
			canCancel={canCancel(receipt)}
			cancelUnavailableReason={cancelUnavailableReason(receipt)}
		/>,
		headerClassName: 'min-w-[220px] text-right',
		cellClassName: 'min-w-[220px] text-right',
	});

	return (
		<div className="overflow-x-auto rounded-md border border-border/80">
			<DataTable
				columns={columns}
				data={rows}
				getRowId={(receipt) => receipt.id}
				isLoading={isLoading}
				ariaLabel="रसिद सूची"
				loadingLabel="रसिदहरू लोड हुँदैछन्..."
				emptyState={{ title: 'रसिद भेटिएन', description: 'खोज वा फिल्टर परिवर्तन गरेर फेरि प्रयास गर्नुहोस्।' }}
				className="min-w-[920px]"
			/>
		</div>
	);
}
