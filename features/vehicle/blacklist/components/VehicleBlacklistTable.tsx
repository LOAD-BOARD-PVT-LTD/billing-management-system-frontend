'use client';

import { Eye, Pencil, ShieldOff } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/components/data-tables/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
      header: t('vehicleBlacklist.vehicleLabel'),
      cell: (record) => <span className="font-semibold">{record.vehicleNumber || '—'}</span>,
      headerClassName: 'min-w-36',
    },
    {
      id: 'owner',
      header: t('vehicleBlacklist.ownerLabel'),
      cell: (record) => (
        <div className="min-w-36">
          <p>{record.ownerName || '—'}</p>
          <p className="text-xs text-muted-foreground">{record.phone || '—'}</p>
        </div>
      ),
      headerClassName: 'min-w-40',
    },
    {
      id: 'statuses',
      header: 'स्थिति',
      cell: () => <Badge variant="destructive" className="rounded-full">कालोसूची</Badge>,
      headerClassName: 'min-w-28',
    },
    {
      id: 'reasons',
      header: 'कारण',
      cell: (record) => <span className="line-clamp-2 min-w-40 max-w-64">{record.blacklistedReason || '—'}</span>,
      headerClassName: 'min-w-44',
    },
    {
      id: 'dates',
      header: 'मिति',
      cell: (record) => displayDate(record.blacklistedAt),
      headerClassName: 'min-w-28',
    },
    {
      id: 'tags',
      header: 'Tags',
      cell: (record) => <span className="max-w-48 whitespace-normal text-xs">{record.tags.join(', ') || '—'}</span>,
      headerClassName: 'min-w-28',
    },
    {
      id: 'actions',
      header: t('vehicleBlacklist.actionsLabel'),
      cell: (record) => (
        <div className="flex items-center gap-1">
          <Button type="button" size="icon-sm" variant="ghost" aria-label={t('vehicleBlacklist.viewAction')} onClick={() => onView(record)}>
            <Eye className="size-4" aria-hidden="true" />
          </Button>
          <Button type="button" size="icon-sm" variant="ghost" aria-label={t('vehicleBlacklist.editAction')} onClick={() => onEdit(record)}>
            <Pencil className="size-4" aria-hidden="true" />
          </Button>
          {record.isBlacklisted ? (
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              aria-label={t('vehicleBlacklist.removeAction')}
              onClick={() => onRemove(record)}
            >
              <ShieldOff className="size-4" aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      ),
      headerClassName: 'min-w-28',
    },
  ];

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="bg-muted/60 px-4 py-3">
        <h2 className="font-semibold">{t('vehicleBlacklist.listTitle')}</h2>
        <p className="text-xs text-muted-foreground">
          {t('vehicleBlacklist.listDescription', { count: toNepaliDigits(records.length) })}
        </p>
      </div>
      <div className="overflow-x-auto p-3">
        <DataTable
          columns={columns}
          data={records}
          getRowId={(record) => record.id}
          isLoading={isLoading}
          loadingLabel={t('vehicleBlacklist.loading')}
          ariaLabel={t('vehicleBlacklist.listTitle')}
          emptyState={{ title: t('vehicleBlacklist.emptyState') }}
        />
      </div>
    </div>
  );
}
