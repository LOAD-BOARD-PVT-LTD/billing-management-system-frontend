'use client';

import { useMemo, useState } from 'react';
import { DataTablePagination } from '@/components/data-tables/DataTablePagination';
import { useToast } from '@/components/ui/use-toast';
import type { VehicleBlacklistCreateInput } from '@/features/vehicle/blacklist/components/VehicleBlacklistCreateForm';
import type { VehicleBlacklistRecord, VehicleStatusMetadata } from '@/features/vehicle/blacklist';
import { useVehicleBlacklist } from '@/features/vehicle/blacklist/hooks/useVehicleBlacklist';
import { exportVehicleBlacklist } from '@/features/vehicle/blacklist/utils/vehicle-blacklist-export';
import { useTranslations } from '@/utils/translations';
import { toNepaliDigits } from '@/utils/numbers';
import { VehicleBlacklistCreateForm } from './VehicleBlacklistCreateForm';
import { VehicleBlacklistDialogs } from './VehicleBlacklistDialogs';
import { VehicleBlacklistHeader } from './VehicleBlacklistHeader';
import { VehicleBlacklistSummary } from './VehicleBlacklistSummary';
import { VehicleBlacklistTable } from './VehicleBlacklistTable';
import { VehicleBlacklistToolbar } from './VehicleBlacklistToolbar';

const PAGE_SIZE = 15;

export function VehicleBlacklistPage() {
  const { t } = useTranslations();
  const { toast } = useToast();
  const { records, isLoading, isRefreshing, error, reload, createRecord, updateRecord, isSaving } = useVehicleBlacklist();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<VehicleBlacklistRecord | null>(null);
  const [editing, setEditing] = useState<VehicleBlacklistRecord | null>(null);
  const [removing, setRemoving] = useState<VehicleBlacklistRecord | null>(null);

  const filteredRecords = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    return records
      .filter((record) => record.isBlacklisted)
      .filter((record) => !normalizedSearch || [
        record.vehicleNumber,
        record.ownerName,
        record.phone,
        record.branch,
        record.blacklistedReason ?? '',
        ...record.tags,
      ].join(' ').toLocaleLowerCase().includes(normalizedSearch))
      .sort((left, right) => (right.blacklistedAt ?? '').localeCompare(left.blacklistedAt ?? ''));
  }, [records, search]);

  const pageCount = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRecords = filteredRecords.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleCreate = async ({
    vehicle,
    blacklistedReason,
    tags,
  }: VehicleBlacklistCreateInput) => {
    await createRecord({
      vehicle,
      blacklistedReason,
      tags,
      at: new Date().toISOString(),
    });
    toast({ title: t('vehicleBlacklist.added') });
  };

  const handleEdit = async (record: VehicleBlacklistRecord, metadata: VehicleStatusMetadata) => {
    await updateRecord({ vehicleId: record.vehicleId, vehicleNumber: record.vehicleNumber, metadata });
    toast({ title: t('vehicleBlacklist.updated') });
    setEditing(null);
  };

  const handleRemove = async (record: VehicleBlacklistRecord) => {
    await updateRecord({
      vehicleId: record.vehicleId,
      vehicleNumber: record.vehicleNumber,
      metadata: {
        isBlacklisted: false,
        blacklistedReason: null,
        blacklistedAt: null,
        tags: record.tags,
      },
    });
    toast({ title: t('vehicleBlacklist.removed') });
    setRemoving(null);
  };

  return (
    <section className="space-y-5">
      <VehicleBlacklistHeader
        onAddClick={() => document.getElementById('vehicle-blacklist-create')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
      />

      <VehicleBlacklistCreateForm
        isSaving={isSaving}
        isBlacklistUnavailable={isLoading || Boolean(error)}
        errorMessage={error}
        onSubmit={handleCreate}
      />

      <VehicleBlacklistSummary records={records} />

      <VehicleBlacklistToolbar
        search={search}
        canExport={filteredRecords.length > 0 && !isLoading}
        isRefreshing={isRefreshing}
        onRefresh={() => void reload()}
        onSearchChange={(value) => { setSearch(value); setPage(1); }}
        onExport={() => exportVehicleBlacklist(filteredRecords)}
      />

      {error ? (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <VehicleBlacklistTable
        records={pageRecords}
        isLoading={isLoading}
        onView={setDetail}
        onEdit={(record) => setEditing(record)}
        onRemove={(record) => setRemoving(record)}
      />

      <DataTablePagination
        page={currentPage}
        pageSize={PAGE_SIZE}
        total={filteredRecords.length}
        onPageChange={setPage}
        formatNumber={toNepaliDigits}
        labels={{
          ariaLabel: t('vehicleBlacklist.paginationLabel'),
          showing: t('vehicleBlacklist.showingLabel'),
          of: t('vehicleBlacklist.ofLabel'),
          page: t('vehicleBlacklist.pageLabel'),
          previousPage: t('vehicleBlacklist.previousPage'),
          nextPage: t('vehicleBlacklist.nextPage'),
        }}
      />

      <VehicleBlacklistDialogs
        detail={detail}
        editing={editing}
        removing={removing}
        isSaving={isSaving}
        onCloseDetail={() => setDetail(null)}
        onCloseEdit={() => setEditing(null)}
        onCloseRemove={() => setRemoving(null)}
        onSaveEdit={handleEdit}
        onConfirmRemove={handleRemove}
      />
    </section>
  );
}
