'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle2, Clock3, Database, Download, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useMemberVehicles } from '@/features/members/hooks/use-member-vehicles';
import { useTqmsVehicleTypes } from '@/features/vehicle/mappings/tqms-vehicle-type/hooks/useTqmsVehicleTypes';
import { parseTqmsDataSyncResult, type TqmsDataSyncResult, type TqmsSkippedRecord } from '@/features/settings/utils/tqms-data-sync';
import { formatNumber, toNepaliDigits } from '@/utils/numbers';
import { useTranslations } from '@/utils/translations';

function documentCount(result: TqmsDataSyncResult, fallback: ReturnType<typeof useMemberVehicles>['vehicles']): number | null {
  if (result.documentRows !== null) return result.documentRows;
  if (!fallback.length) return null;
  return fallback.reduce((count, vehicle) => count + Object.values(vehicle.compliance)
    .filter((period) => Boolean(period.startBs || period.startAd || period.expiryBs || period.expiryAd)).length, 0);
}

function formatSyncDate(value: string): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('ne-NP', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function downloadSkippedRecords(records: TqmsSkippedRecord[], headings: string[]): void {
  const rows = records.map((record) => [
    record.vehicleId,
    record.owner,
    record.phone,
    record.vehicleType,
    record.branch,
    record.address,
    record.citizenshipNumber,
    record.registrationStatus,
    record.reason,
  ]);
  const content = `\uFEFF${[headings, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'tqms-skipped-records.csv';
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function TqmsDataSyncControl() {
  const { t } = useTranslations();
  const { toast } = useToast();
  const { vehicles, isLoading: isVehiclesLoading, error: vehiclesError, reload: reloadVehicles } = useMemberVehicles();
  const { isSyncing, sync } = useTqmsVehicleTypes(false);
  const [result, setResult] = useState<TqmsDataSyncResult | null>(null);
  const [lastSuccessfulAt, setLastSuccessfulAt] = useState('');
  const [syncFailed, setSyncFailed] = useState(false);

  const syncNow = async () => {
    setSyncFailed(false);
    try {
      const response = await sync();
      const nextResult = parseTqmsDataSyncResult(response);
      setResult(nextResult);
      const responseStatus = nextResult.status.toLocaleLowerCase();
      const isStillRunning = ['running', 'in_progress', 'in progress', 'processing', 'already_running', 'already running'].includes(responseStatus);
      const isFailed = ['failed', 'failure', 'error'].includes(responseStatus);
      setSyncFailed(isFailed);
      if (!isStillRunning && !isFailed) {
        setLastSuccessfulAt(nextResult.lastSuccessfulAt || new Date().toISOString());
      }
      await reloadVehicles();
    } catch {
      setSyncFailed(true);
    }
  };

  const exportSkipped = () => {
    try {
      downloadSkippedRecords(result?.skippedRecords ?? [], [
        t('billing.tqmsSnapshotSyncVehicleId'),
        t('billing.tqmsSnapshotSyncOwner'),
        t('billing.tqmsSnapshotSyncPhone'),
        t('billing.tqmsSnapshotSyncVehicleType'),
        t('billing.tqmsSnapshotSyncSanghBranch'),
        t('billing.tqmsSnapshotSyncAddress'),
        t('billing.tqmsSnapshotSyncCitizenshipNo'),
        t('billing.tqmsSnapshotSyncRegistrationStatus'),
        t('billing.tqmsSnapshotSyncSkippedReason'),
      ]);
    } catch (error) {
      toast({
        title: t('billing.tqmsSnapshotSyncExportSkippedFailed'),
        description: error instanceof Error ? error.message : t('billing.tqmsSnapshotSyncExportSkippedFailed'),
        variant: 'destructive',
      });
    }
  };

  const skippedCount = result?.skippedCount ?? (result?.skippedRecords.length ? result.skippedRecords.length : null);
  const recordCount = result?.registryRows ?? result?.syncedCount ?? (vehicles.length ? vehicles.length : null);
  const documentRows = documentCount(result ?? parseTqmsDataSyncResult(undefined), vehicles);
  const responseStatus = result?.status.toLocaleLowerCase() ?? '';
  const serverRunning = ['running', 'in_progress', 'in progress', 'processing', 'already_running', 'already running'].includes(responseStatus);
  const serverCompleted = ['success', 'successful', 'completed', 'complete', 'ok'].includes(responseStatus);

  const status = isSyncing
    ? t('billing.tqmsSnapshotSyncRunning')
    : syncFailed
      ? t('billing.tqmsSnapshotSyncFailed')
      : serverRunning
        ? t('billing.tqmsSnapshotSyncAlreadyRunning')
        : responseStatus === 'up_to_date'
          ? t('billing.tqmsSnapshotSyncUpToDate')
          : serverCompleted
            ? t('billing.tqmsSnapshotSyncCompleted')
            : result
              ? t('billing.tqmsSnapshotSyncUnknownStatus')
              : lastSuccessfulAt
                ? t('billing.tqmsSnapshotSyncSuccess')
                : t('billing.tqmsSnapshotSyncNotStarted');

  return (
    <section className="space-y-5 rounded-lg border border-border/80 bg-card p-4 shadow-sm sm:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700">
            <Database className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-sm font-semibold">{t('billing.tqmsSnapshotSyncTitle')}</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{t('billing.tqmsSnapshotSyncDescription')}</p>
          </div>
        </div>
        <Button type="button" onClick={() => void syncNow()} loading={isSyncing} disabled={isSyncing} className="shrink-0 gap-2">
          {!isSyncing ? <RefreshCw className="h-4 w-4" aria-hidden="true" /> : null}
          {isSyncing ? t('billing.tqmsSnapshotSyncRunning') : t('billing.tqmsSnapshotSyncRefresh')}
        </Button>
      </header>

      {syncFailed ? (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{t('billing.tqmsSnapshotSyncFailed')}</span>
        </div>
      ) : null}
      {vehiclesError ? (
        <div role="status" className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{t('billing.tqmsSnapshotSyncVehiclesLoadFailed')}</span>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-md border border-border/70 p-3">
          <p className="text-xs text-muted-foreground">{t('billing.tqmsSnapshotSyncStatus')}</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-medium">
            {syncFailed ? <AlertCircle className="size-4 text-destructive" aria-hidden="true" /> : lastSuccessfulAt ? <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" /> : null}
            {status}
          </p>
        </article>
        <article className="rounded-md border border-border/70 p-3">
          <p className="text-xs text-muted-foreground">{t('billing.tqmsSnapshotSyncLastSuccessful')}</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-medium">
            <Clock3 className="size-4 text-muted-foreground" aria-hidden="true" />
            {formatSyncDate(result?.lastSuccessfulAt || lastSuccessfulAt)}
          </p>
        </article>
        <article className="rounded-md border border-border/70 p-3">
          <p className="text-xs text-muted-foreground">{t('billing.tqmsSnapshotSyncRegistryRows')}</p>
          <p className="mt-1 text-sm font-medium">{isVehiclesLoading && recordCount === null ? t('billing.tqmsSnapshotSyncRunning') : recordCount === null ? '—' : toNepaliDigits(formatNumber(recordCount))}</p>
          {result?.foundCount !== null && result?.foundCount !== undefined ? <p className="mt-1 text-[11px] text-muted-foreground">{t('billing.tqmsSnapshotSyncFound', { found: formatNumber(result.foundCount), synced: formatNumber(result.syncedCount ?? 0), skipped: formatNumber(result.skippedCount ?? 0) })}</p> : null}
        </article>
        <article className="rounded-md border border-border/70 p-3">
          <p className="text-xs text-muted-foreground">{t('billing.tqmsSnapshotSyncDocumentRows')}</p>
          <p className="mt-1 text-sm font-medium">{isVehiclesLoading && documentRows === null ? t('billing.tqmsSnapshotSyncRunning') : documentRows === null ? '—' : toNepaliDigits(formatNumber(documentRows))}</p>
        </article>
      </div>

      {result?.branchFilter ? <p className="text-xs text-muted-foreground">{t('billing.tqmsSnapshotSyncBranchFilter')}: {result.branchFilter}</p> : null}
      {result?.lastError ? <p role="status" className="text-xs text-amber-700">{t('billing.tqmsSnapshotSyncLastError')}: {result.lastError}</p> : null}

      {skippedCount !== null ? (
        <section className="space-y-3 rounded-md border border-border/70 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-semibold">{t('billing.tqmsSnapshotSyncSkippedCount', { count: formatNumber(skippedCount) })}</h4>
              <p className="mt-1 text-xs text-muted-foreground">{t('billing.tqmsSnapshotSyncSkippedHelp')}</p>
            </div>
            {result?.skippedRecords.length ? (
              <Button type="button" variant="outline" size="sm" onClick={exportSkipped} className="gap-2">
                <Download className="size-4" aria-hidden="true" />{t('billing.tqmsSnapshotSyncExportSkippedExcel')}
              </Button>
            ) : null}
          </div>
          {result?.skippedRecords.length ? (
            <div className="max-h-72 overflow-auto rounded-md border border-border/70">
              <table className="w-full min-w-[900px] text-left text-xs">
                <thead className="sticky top-0 bg-muted">
                  <tr>{[
                    t('billing.tqmsSnapshotSyncVehicleId'),
                    t('billing.tqmsSnapshotSyncOwner'),
                    t('billing.tqmsSnapshotSyncPhone'),
                    t('billing.tqmsSnapshotSyncVehicleType'),
                    t('billing.tqmsSnapshotSyncSanghBranch'),
                    t('billing.tqmsSnapshotSyncAddress'),
                    t('billing.tqmsSnapshotSyncCitizenshipNo'),
                    t('billing.tqmsSnapshotSyncRegistrationStatus'),
                    t('billing.tqmsSnapshotSyncSkippedReason'),
                  ].map((heading) => <th key={heading} className="px-3 py-2 font-semibold">{heading}</th>)}</tr>
                </thead>
                <tbody>
                  {result.skippedRecords.map((record, index) => (
                    <tr key={`${record.vehicleId}-${index}`} className="border-t border-border/70">
                      {[record.vehicleId, record.owner, record.phone, record.vehicleType, record.branch, record.address, record.citizenshipNumber, record.registrationStatus, record.reason].map((value, cellIndex) => (
                        <td key={cellIndex} className="max-w-56 px-3 py-2 align-top">{value || '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}
