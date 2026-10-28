'use client';

import { useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { useMembers } from '@/features/members/hooks/use-members';
import { useMemberVehicles } from '@/features/members/hooks/use-member-vehicles';
import { useMemberColumns } from '@/features/members/hooks/use-member-columns';
import type { MemberListRecord } from '@/features/members/model/member';
import { calculateMembers } from '@/features/members/utils/member-calculations';
import { exportMembers } from '@/features/members/utils/export-members';
import { useFiscalYearManagement } from '@/features/settings/hooks/useFiscalYearManagement';
import { useReceipts } from '@/features/receipts/hooks/use-receipts';
import { useVehicleBlacklist } from '@/features/vehicle/blacklist/hooks/useVehicleBlacklist';
import { useVehicleTypes } from '@/features/vehicle/type/hooks/useVehicleTypes';
import { useTqmsVehicleTypes } from '@/features/vehicle/mappings/tqms-vehicle-type/hooks/useTqmsVehicleTypes';
import { billingVehicleTypesAtom, tqmsVehicleTypesAtom } from '@/features/vehicle/store/vehicle-type-atoms';
import { MembersDialogs } from '@/features/members/components/MembersDialogs';
import { MembersHeader } from '@/features/members/components/MembersHeader';
import { MembersTable } from '@/features/members/components/MembersTable';
import { MembersTabs, type MemberTab } from '@/features/members/components/MembersTabs';
import { MembersToolbar } from '@/features/members/components/MembersToolbar';
import { useToast } from '@/components/ui/use-toast';
import { formatFiscalYearForDisplay } from '@/utils/nepali-calender-dates/nepali-fiscal-year';
import { toNepaliDigits } from '@/utils/numbers';

const PAGE_SIZE = 10;

export function MembersPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const { visibleColumns, applyColumns } = useMemberColumns();
  const { records: receipts, isLoading: receiptsLoading, error: receiptsError, reload: reloadReceipts } = useReceipts();
  const {
    fiscalYears,
    isLoading: fiscalYearsLoading,
    error: fiscalYearsError,
    reload: reloadFiscalYears,
  } = useFiscalYearManagement();
  const {
    records: blacklistedVehicles,
    isLoading: blacklistLoading,
    error: blacklistError,
    reload: reloadBlacklist,
    createMemberRecord,
    isSaving: blacklistSaving,
  } = useVehicleBlacklist();
  const {
    memberResources,
    isLoading: memberResourcesLoading,
    error: memberResourcesError,
    reload: reloadMemberResources,
    tagDisplaced,
    removeDisplaced,
    isSaving: memberSaving,
  } = useMembers();
  const {
    vehicles: memberVehicles,
    isLoading: memberVehiclesLoading,
    error: memberVehiclesError,
    reload: reloadMemberVehicles,
  } = useMemberVehicles();
  const billingVehicleTypesQuery = useVehicleTypes();
  const tqmsVehicleTypesQuery = useTqmsVehicleTypes(true);
  const billingVehicleTypes = useAtomValue(billingVehicleTypesAtom);
  const tqmsVehicleTypes = useAtomValue(tqmsVehicleTypesAtom);

  const sortedFiscalYears = useMemo(
    () => [...fiscalYears].sort((left, right) => right.startDate.localeCompare(left.startDate)),
    [fiscalYears],
  );
  const defaultFiscalYear = sortedFiscalYears.find((year) => year.status === 'ACTIVE') ?? sortedFiscalYears[0];
  const [fiscalYearOverride, setFiscalYearOverride] = useState('');
  const fiscalYearId = fiscalYearOverride || defaultFiscalYear?.id || '';
  const selectedFiscalYear = sortedFiscalYears.find((year) => year.id === fiscalYearId);
  const [tab, setTab] = useState<MemberTab>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<MemberListRecord | null>(null);
  const [tagTarget, setTagTarget] = useState<MemberListRecord | null>(null);
  const [blacklistTarget, setBlacklistTarget] = useState<MemberListRecord | null>(null);
  const [removeTarget, setRemoveTarget] = useState<MemberListRecord | null>(null);

  const calculation = useMemo(
    () => calculateMembers(receipts, fiscalYears, fiscalYearId, memberResources, blacklistedVehicles),
    [receipts, fiscalYears, fiscalYearId, memberResources, blacklistedVehicles],
  );
  const vehicleDetailsById = useMemo(
    () => new Map(memberVehicles.map((vehicle) => [vehicle.vehicleId, vehicle])),
    [memberVehicles],
  );
  const billingTypeByTqmsId = useMemo(() => {
    const categories = new Map<string, string>();
    for (const category of billingVehicleTypes) {
      for (const typeId of category.vehicleTypes) {
        categories.set(typeId.trim().toLocaleLowerCase(), category.category);
      }
    }
    return new Map(
      tqmsVehicleTypes.map((type) => {
        const billingType = categories.get(type.id.trim().toLocaleLowerCase()) ?? '';
        return [type.id.trim().toLocaleLowerCase(), billingType] as const;
      }),
    );
  }, [billingVehicleTypes, tqmsVehicleTypes]);
  const memberRecords = useMemo(
    () => calculation.records.map((record) => {
      const vehicle = vehicleDetailsById.get(record.vehicleId);
      const tqmsType = vehicle?.tqmsVehicleTypeId
        ? tqmsVehicleTypes.find((type) => type.id.trim().toLocaleLowerCase() === vehicle.tqmsVehicleTypeId.trim().toLocaleLowerCase())
        : tqmsVehicleTypes.find((type) => [type.name, type.code].some(
          (value) => value.trim().toLocaleLowerCase() === vehicle?.tqmsVehicleType.trim().toLocaleLowerCase(),
        ));
      return {
        ...record,
        tqmsVehicleType: tqmsType?.name || vehicle?.tqmsVehicleType || record.tqmsVehicleType,
        vehicleType: tqmsType
          ? billingTypeByTqmsId.get(tqmsType.id.trim().toLocaleLowerCase()) ?? ''
          : '',
        sanchalakName: vehicle?.sanchalakName || record.ownerName,
        sawariDhaniName: vehicle?.sawariDhaniName || record.ownerName,
        ownerCount: vehicle?.ownerCount ?? 1,
        ownerName: vehicle?.sawariDhaniName || record.ownerName,
        phone: vehicle?.phone || record.phone,
        address: vehicle?.address || record.address,
      };
    }),
    [billingTypeByTqmsId, calculation.records, tqmsVehicleTypes, vehicleDetailsById],
  );
  const combinedError = receiptsError || fiscalYearsError || blacklistError || memberResourcesError
    || memberVehiclesError || billingVehicleTypesQuery.loadError || tqmsVehicleTypesQuery.loadError;
  const isLoading = receiptsLoading || fiscalYearsLoading || blacklistLoading || memberResourcesLoading
    || memberVehiclesLoading || billingVehicleTypesQuery.isLoading || tqmsVehicleTypesQuery.isLoading;
  const filteredRecords = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    return memberRecords
      .filter((record) => {
        if (tab === 'active') return record.isActive;
        if (tab === 'new') return record.isNew;
        if (tab === 'displaced') return record.isDisplaced;
        if (tab === 'blacklisted') return record.isBlacklisted;
        if (tab === 'inactive') return !record.isActive && !record.isDisplaced && !record.isBlacklisted;
        return true;
      })
      .filter((record) => !normalizedSearch || [
        record.memberNumber,
        record.vehicleId,
        record.ownerName,
        record.phone,
        record.vehicleNumber,
        record.vehicleType,
        record.tqmsVehicleType,
        record.branchName,
      ].join(' ').toLocaleLowerCase().includes(normalizedSearch))
      .sort((left, right) => left.ownerName.localeCompare(right.ownerName, 'ne'));
  }, [memberRecords, search, tab]);
  const pageCount = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRecords = filteredRecords.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const resourceByVehicleId = useMemo(
    () => new Map(memberResources.map((record) => [record.vehicleId, record])),
    [memberResources],
  );

  const reload = () => Promise.all([
    reloadReceipts(),
    reloadFiscalYears(),
    reloadBlacklist(),
    reloadMemberResources(),
    reloadMemberVehicles(),
  ]);
  const resetPage = () => setPage(1);

  const handleTagDisplaced = async (record: MemberListRecord, reason: string) => {
    try {
      await tagDisplaced({
        vehicleId: record.vehicleId,
        vehicleNumber: record.vehicleNumber,
        reason,
        taggedAt: new Date().toISOString(),
        performedBy: user?.email ?? null,
      }, resourceByVehicleId.get(record.vehicleId));
      toast({ title: 'विस्थापित ट्याग लगाइयो।' });
      setTagTarget(null);
    } catch (error) {
      toast({
        title: 'विस्थापित ट्याग लगाउन सकिएन',
        description: error instanceof Error ? error.message : 'पुनः प्रयास गर्नुहोस्।',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveDisplaced = async (record: MemberListRecord) => {
    const resource = resourceByVehicleId.get(record.vehicleId);
    if (!resource) {
      toast({ title: 'विस्थापित रेकर्ड भेटिएन।', variant: 'destructive' });
      return;
    }
    try {
      await removeDisplaced(resource);
      toast({ title: 'विस्थापित ट्याग हटाइयो।' });
      setRemoveTarget(null);
    } catch (error) {
      toast({
        title: 'विस्थापित ट्याग हटाउन सकिएन',
        description: error instanceof Error ? error.message : 'पुनः प्रयास गर्नुहोस्।',
        variant: 'destructive',
      });
    }
  };

  const handleTagBlacklist = async (record: MemberListRecord, reason: string) => {
    try {
      await createMemberRecord({
        vehicleId: record.vehicleId,
        vehicleNumber: record.vehicleNumber,
        blacklistedReason: reason,
        at: new Date().toISOString(),
        performedBy: user?.email ?? null,
      });
      toast({ title: 'सदस्य सवारी कालोसूचीमा राखियो।' });
      setBlacklistTarget(null);
    } catch (error) {
      toast({
        title: 'सवारीलाई कालोसूचीमा राख्न सकिएन',
        description: error instanceof Error ? error.message : 'पुनः प्रयास गर्नुहोस्।',
        variant: 'destructive',
      });
    }
  };

  return (
    <section className="space-y-5">
      <MembersHeader fiscalYearName={defaultFiscalYear ? formatFiscalYearForDisplay(defaultFiscalYear.code ?? defaultFiscalYear.name) : 'आर्थिक वर्ष'} />
      <MembersTabs
        counts={calculation.counts}
        selected={tab}
        onSelect={(selectedTab) => { setTab(selectedTab); resetPage(); }}
      />
      {calculation.counts.nonMemberBlacklisted > 0 ? (
        <div className="flex justify-end">
          <Button asChild type="button" variant="link" size="sm" className="h-auto px-0 text-sm">
            <Link href="/dashboard/vehicle-blacklist">
              थप {toNepaliDigits(calculation.counts.nonMemberBlacklisted)} गैर-सदस्य गाडीहरू हेर्नुहोस्
            </Link>
          </Button>
        </div>
      ) : null}
      <Card className="overflow-hidden rounded-xl shadow-sm hover:shadow-sm">
        <MembersToolbar
          fiscalYears={sortedFiscalYears}
          fiscalYearId={fiscalYearId}
          fiscalYearName={selectedFiscalYear ? formatFiscalYearForDisplay(selectedFiscalYear.code ?? selectedFiscalYear.name) : 'आर्थिक वर्ष'}
          totalCount={calculation.counts.total}
          visibleCount={filteredRecords.length}
          search={search}
          isLoading={isLoading}
          canExport={filteredRecords.length > 0}
          visibleColumns={visibleColumns}
          onSearchChange={(value) => { setSearch(value); resetPage(); }}
          onFiscalYearChange={(value) => { setFiscalYearOverride(value); resetPage(); }}
          onExport={() => exportMembers(filteredRecords)}
          onReload={() => { void reload(); }}
          onColumnsChange={applyColumns}
        />
        <MembersTable
          records={pageRecords}
          isLoading={isLoading}
          isSaving={memberSaving || blacklistSaving || memberResourcesLoading}
          error={combinedError}
          page={currentPage}
          pageSize={PAGE_SIZE}
          total={filteredRecords.length}
          visibleColumns={visibleColumns}
          onPageChange={setPage}
          onView={setDetail}
          onTagDisplaced={setTagTarget}
          onRemoveDisplaced={setRemoveTarget}
          onTagBlacklist={setBlacklistTarget}
          onOpenBlacklist={() => router.push('/dashboard/vehicle-blacklist')}
          onRetry={() => { void reload(); }}
        />
      </Card>
      <MembersDialogs
        key={`${tagTarget?.vehicleId ?? ''}:${blacklistTarget?.vehicleId ?? ''}`}
        detail={detail}
        tagTarget={tagTarget}
        blacklistTarget={blacklistTarget}
        removeTarget={removeTarget}
        isSaving={memberSaving || blacklistSaving}
        onCloseDetail={() => setDetail(null)}
        onCloseTag={() => setTagTarget(null)}
        onCloseBlacklist={() => setBlacklistTarget(null)}
        onCloseRemove={() => setRemoveTarget(null)}
        onConfirmTag={handleTagDisplaced}
        onConfirmBlacklist={handleTagBlacklist}
        onConfirmRemove={handleRemoveDisplaced}
        onOpenBlacklist={() => router.push('/dashboard/vehicle-blacklist')}
      />
    </section>
  );
}
