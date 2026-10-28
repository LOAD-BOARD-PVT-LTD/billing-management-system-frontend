'use client';

import { useMemo } from 'react';
import { Eye, Flag, Shield, ShieldOff } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/components/data-tables/DataTable';
import { DataTablePagination } from '@/components/data-tables/DataTablePagination';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { TableActionIconButton } from '@/components/ui/table-action-icon-button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { MemberListRecord } from '@/features/members/model/member';
import { MemberStatusBadge } from '@/features/members/components/MemberStatusBadge';
import type { MemberColumnId } from '@/features/members/utils/member-table-columns';
import { formatDocumentNepaliDate } from '@/shared/document-generation/utils/format-date';
import { toNepaliDigits } from '@/utils/numbers';

type MembersTableProps = {
  records: MemberListRecord[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  page: number;
  pageSize: number;
  total: number;
  visibleColumns: MemberColumnId[];
  onPageChange: (page: number) => void;
  onView: (record: MemberListRecord) => void;
  onTagDisplaced: (record: MemberListRecord) => void;
  onRemoveDisplaced: (record: MemberListRecord) => void;
  onTagBlacklist: (record: MemberListRecord) => void;
  onOpenBlacklist: () => void;
  onRetry: () => void;
};

export function MembersTable({
  records,
  isLoading,
  isSaving,
  error,
  page,
  pageSize,
  total,
  visibleColumns,
  onPageChange,
  onView,
  onTagDisplaced,
  onRemoveDisplaced,
  onTagBlacklist,
  onOpenBlacklist,
  onRetry,
}: MembersTableProps) {
  const allColumns = useMemo<Record<MemberColumnId, DataTableColumn<MemberListRecord>>>(() => ({
    vehicleId: {
      id: 'vehicleId',
      header: 'सदस्य नं.',
      headerClassName: 'min-w-32',
      cell: (record) => <span className="font-semibold">{record.memberNumber}</span>,
    },
    member: {
      id: 'member',
      header: 'नाम',
      headerClassName: 'min-w-44',
      cell: (record) => (
        <div className="space-y-0.5">
          {record.ownerCount > 1 ? (
            <>
              <p className="text-xs"><span className="text-muted-foreground">संचालक:</span> <span className="font-medium">{record.sanchalakName || '—'}</span></p>
              <p className="text-xs"><span className="text-muted-foreground">धनीको नाम:</span> <span className="font-medium">{record.sawariDhaniName || '—'}</span></p>
            </>
          ) : (
            <p className="font-medium">{record.sawariDhaniName || record.ownerName || '—'}</p>
          )}
        </div>
      ),
    },
    vehicle: {
      id: 'vehicle',
      header: 'सवारी नं.',
      headerClassName: 'min-w-40',
      cell: (record) => (
        <div>
          <p className="font-semibold">{record.vehicleNumber || '—'}</p>
          <p className="text-xs text-muted-foreground">{record.tqmsVehicleType || '—'}</p>
        </div>
      ),
    },
    vehicleType: {
      id: 'vehicleType',
      header: 'सवारी प्रकार',
      headerClassName: 'min-w-32',
      cell: (record) => record.vehicleType || 'म्याप गरिएको प्रकार छैन',
    },
    status: {
      id: 'status',
      header: 'स्थिति',
      cell: (record) => (
        <MemberStatusBadge
          status={record.status}
          billingStatus={record.billingStatus}
          isDisplaced={record.isDisplaced}
          isBlacklisted={record.isBlacklisted}
        />
      ),
    },
    lastPayment: {
      id: 'lastPayment',
      header: 'समाप्ति मिति',
      headerClassName: 'min-w-32',
      cell: (record) => (
        <div>
          <p className="font-medium">{formatExpiryMonthYear(record.expiryDate)}</p>
          <p className="text-xs text-muted-foreground">
            {record.expiryDate
              ? toNepaliDigits(formatDocumentNepaliDate(record.expiryDate).replaceAll('/', '-'))
              : '—'}
          </p>
          <p className="text-xs text-muted-foreground">{record.fiscalYearName}</p>
        </div>
      ),
    },
    branch: {
      id: 'branch',
      header: 'शाखा',
      cell: (record) => record.branchName || '—',
    },
    actions: {
      id: 'actions',
      header: 'कार्य',
      headerClassName: 'min-w-28',
      cell: (record) => (
        <TooltipProvider delayDuration={200}>
          <div className="flex items-center gap-1">
            <ActionTooltipButton
              label="सदस्य विवरण हेर्नुहोस्"
              onClick={() => onView(record)}
            >
              <Eye className="size-4" aria-hidden="true" />
            </ActionTooltipButton>
            <ActionTooltipButton
              label={record.isDisplaced ? 'विस्थापित ट्याग हटाउनुहोस्' : 'विस्थापित सदस्यको रूपमा चिन्ह लगाउनुहोस्'}
              onClick={() => record.isDisplaced ? onRemoveDisplaced(record) : onTagDisplaced(record)}
              disabled={isSaving}
            >
              <Flag className={`size-4 ${record.isDisplaced ? 'fill-current' : ''}`} aria-hidden="true" />
            </ActionTooltipButton>
            <ActionTooltipButton
              label={record.isBlacklisted ? 'कालोसूची व्यवस्थापन हेर्नुहोस्' : 'सवारीलाई कालोसूचीमा राख्नुहोस्'}
              onClick={() => record.isBlacklisted ? onOpenBlacklist() : onTagBlacklist(record)}
              disabled={isSaving}
            >
              {record.isBlacklisted
                ? <Shield className="size-4 fill-current" aria-hidden="true" />
                : <ShieldOff className="size-4" aria-hidden="true" />}
            </ActionTooltipButton>
          </div>
        </TooltipProvider>
      ),
    },
  }), [isSaving, onOpenBlacklist, onRemoveDisplaced, onTagBlacklist, onTagDisplaced, onView]);
  const columns = useMemo(
    () => visibleColumns.map((id) => allColumns[id]),
    [allColumns, visibleColumns],
  );

  return (
    <CardContent className="p-3">
      {error ? (
        <div role="alert" className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <span>{error}</span>
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>फेरि प्रयास गर्नुहोस्</Button>
        </div>
      ) : null}
      <DataTable
        columns={columns}
        data={records}
        getRowId={(record) => record.vehicleId}
        isLoading={isLoading}
        loadingLabel="सदस्य सूची लोड हुँदैछ..."
        ariaLabel="सदस्य सूची"
        emptyState={{ title: 'कुनै सदस्य भेटिएन' }}
      />
      <DataTablePagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={onPageChange}
        formatNumber={toNepaliDigits}
        labels={{
          ariaLabel: 'सदस्य सूची पृष्ठ नेभिगेसन',
          showing: 'देखाइँदै',
          of: 'मध्ये',
          page: 'पृष्ठ',
          previousPage: 'अघिल्लो पृष्ठ',
          nextPage: 'अर्को पृष्ठ',
        }}
        className="mt-3"
      />
    </CardContent>
  );
}

function ActionTooltipButton({
  label,
  onClick,
  disabled = false,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <TableActionIconButton aria-label={label} title={label} onClick={onClick} disabled={disabled}>
            {children}
          </TableActionIconButton>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

function formatExpiryMonthYear(value: string): string {
  const nepaliDate = formatDocumentNepaliDate(value);
  const [year, month] = nepaliDate.split('/');
  const monthNumber = Number(month?.replace(/[०-९]/gu, (digit) => String('०१२३४५६७८९'.indexOf(digit))));
  if (!year || !month || !Number.isFinite(monthNumber)) return nepaliDate || '—';
  const monthNames = ['', 'बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज', 'कार्तिक', 'मंसिर', 'पुष', 'माघ', 'फागुन', 'चैत'];
  const monthName = monthNames[monthNumber];
  return monthName ? `${monthName} ${year}` : nepaliDate;
}
