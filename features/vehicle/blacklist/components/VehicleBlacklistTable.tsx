'use client';

import { Eye, Pencil, ShieldOff } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/components/data-tables/DataTable';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TableActionIconButton } from '@/components/ui/table-action-icon-button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { VehicleBlacklistRecord } from '@/features/vehicle/blacklist';
import { useTranslations } from '@/utils/translations';
import { toNepaliDigits } from '@/utils/numbers';

function displayDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : toNepaliDigits(date.toLocaleDateString('ne-NP'));
}

type VehicleBlacklistTableProps = {
  records: VehicleBlacklistRecord[];
  isLoading: boolean;
  onView: (record: VehicleBlacklistRecord) => void;
  onEdit: (record: VehicleBlacklistRecord) => void;
  onRemove: (record: VehicleBlacklistRecord) => void;
};

export function VehicleBlacklistTable({
  records,
  isLoading,
  onView,
  onEdit,
  onRemove,
}: VehicleBlacklistTableProps) {
  const { t } = useTranslations();

  const columns: DataTableColumn<VehicleBlacklistRecord>[] = [
    {
      id: 'vehicleNumber',
      header: 'सवारी नं.',
      cell: (record) => <span className="font-semibold">{record.vehicleNumber || '—'}</span>,
      headerClassName: 'min-w-36',
    },
    {
      id: 'owner',
      header: 'धनीको नाम',
      cell: (record) => (
        <div className="min-w-36">
          <p>{record.ownerName || '—'}</p>
          <p className="text-xs text-muted-foreground">{record.phone || '—'}</p>
        </div>
      ),
      headerClassName: 'min-w-40',
    },
    {
      id: 'vehicleType',
      header: 'सवारी प्रकार',
      cell: (record) => record.vehicleType || '—',
      headerClassName: 'min-w-40',
    },
    {
      id: 'membership',
      header: 'Billing सदस्यता सम्बन्ध',
      cell: (record) => (
        <Badge variant="secondary" className="whitespace-nowrap">
          {record.blacklistSource === 'billing-member'
            ? t('vehicleBlacklist.membershipBillingMember')
            : t('vehicleBlacklist.membershipNoBilling')}
        </Badge>
      ),
      headerClassName: 'min-w-48',
    },
    {
      id: 'status',
      header: 'स्थिति',
      cell: () => <Badge variant="destructive">{t('vehicleBlacklist.blacklistedStatus')}</Badge>,
      headerClassName: 'min-w-28',
    },
    {
      id: 'updatedAt',
      header: t('vehicleBlacklist.updatedLabel'),
      cell: (record) => displayDate(record.blacklistedAt),
      headerClassName: 'min-w-36',
    },
    {
      id: 'performedBy',
      header: t('vehicleBlacklist.performedByLabel'),
      cell: (record) => record.performedBy ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="max-w-48 truncate" tabIndex={0}>{record.performedBy}</span>
          </TooltipTrigger>
          <TooltipContent side="top">{record.performedBy}</TooltipContent>
        </Tooltip>
      ) : <span className="text-muted-foreground">—</span>,
      headerClassName: 'min-w-44',
    },
    {
      id: 'reason',
      header: t('vehicleBlacklist.reasonLabel'),
      cell: (record) => <span className="line-clamp-2 min-w-40 max-w-64">{record.blacklistedReason || '—'}</span>,
      headerClassName: 'min-w-44',
    },
    {
      id: 'actions',
      header: 'कार्य',
      cell: (record) => (
        <TooltipProvider delayDuration={200}>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <TableActionIconButton aria-label={t('vehicleBlacklist.viewAction')} onClick={() => onView(record)}>
                  <Eye className="size-4" aria-hidden="true" />
                </TableActionIconButton>
              </TooltipTrigger>
              <TooltipContent side="top">{t('vehicleBlacklist.viewAction')}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <TableActionIconButton aria-label={t('vehicleBlacklist.editAction')} onClick={() => onEdit(record)}>
                  <Pencil className="size-4" aria-hidden="true" />
                </TableActionIconButton>
              </TooltipTrigger>
              <TooltipContent side="top">{t('vehicleBlacklist.editAction')}</TooltipContent>
            </Tooltip>
            {record.isBlacklisted ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <TableActionIconButton
                    tone="destructive"
                    aria-label={t('vehicleBlacklist.removeAction')}
                    onClick={() => onRemove(record)}
                  >
                    <ShieldOff className="size-4" aria-hidden="true" />
                  </TableActionIconButton>
                </TooltipTrigger>
                <TooltipContent side="top">{t('vehicleBlacklist.removeAction')}</TooltipContent>
              </Tooltip>
            ) : null}
          </div>
        </TooltipProvider>
      ),
      headerClassName: 'min-w-28',
    },
  ];

  return (
    <Card className="overflow-hidden rounded-xl shadow-sm hover:shadow-sm">
      <CardHeader className="space-y-1 border-b bg-muted/40 px-4 py-3">
        <CardTitle className="text-base">{t('vehicleBlacklist.listTitle')}</CardTitle>
        <p className="text-xs text-muted-foreground">
          {t('vehicleBlacklist.listDescription', { count: toNepaliDigits(records.length) })}
        </p>
      </CardHeader>
      <CardContent className="p-3">
        <DataTable
          columns={columns}
          data={records}
          getRowId={(record) => record.id}
          isLoading={isLoading}
          loadingLabel={t('vehicleBlacklist.loading')}
          ariaLabel={t('vehicleBlacklist.listTitle')}
          emptyState={{ title: t('vehicleBlacklist.emptyState') }}
        />
      </CardContent>
    </Card>
  );
}
