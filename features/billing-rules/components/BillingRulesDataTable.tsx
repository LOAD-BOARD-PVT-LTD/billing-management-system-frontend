'use client';

import { CircleCheck, Eye, Pencil, Power, Trash2 } from 'lucide-react';

import { DataTable, type DataTableColumn } from '@/components/data-tables/DataTable';
import { DataTableColumnHeader, type SortDirection } from '@/components/data-tables/DataTableColumnHeader';
import { TableActionIconButton } from '@/components/ui/table-action-icon-button';
import type { BillingEntityRecord } from '@/features/administration/billing-entities/types/billing-entity.types';
import type { BillingRule, FeeHead, FiscalYear, Scope } from '@/features/billing-rules/model/types';
import { groupVehicleTypeRules, type BillingRuleSortColumn } from '@/features/billing-rules/utils/rule-grouping';
import type { VehicleTypeRecord } from '@/features/vehicle/type/types/vehicle-type.types';

export interface BillingRulesDataTableProps {
  rules: BillingRule[];
  vehicleTypeFeeHeadIds: string[];
  feeHeads: FeeHead[];
  fiscalYears: FiscalYear[];
  fiscalYearFilter: string;
  vehicleCategories: VehicleTypeRecord[];
  billingEntities: BillingEntityRecord[];
  scope: Scope;
  isLoading?: boolean;
  isSaving?: boolean;
  firstRowNumber?: number;
  sortColumn: BillingRuleSortColumn;
  sortDirection: SortDirection;
  onSortChange: (column: BillingRuleSortColumn, direction: SortDirection) => void;
  onView: (rule: BillingRule) => void;
  onEdit: (rule: BillingRule) => void;
  onBillingEntityChange: (rule: BillingRule, billingEntityId: string) => void;
  onUpdatePolicy: (rule: BillingRule) => void;
  onToggleStatus: (rule: BillingRule) => void;
  emptyState?: {
    title: string;
    description: string;
  };
}

function sortHeader(
  label: string,
  column: BillingRuleSortColumn,
  sortColumn: BillingRuleSortColumn,
  sortDirection: SortDirection,
  onSortChange: BillingRulesDataTableProps['onSortChange'],
) {
  return (
    <DataTableColumnHeader
      label={label}
      sortDirection={sortColumn === column ? sortDirection : null}
      onSortChange={(direction) => onSortChange(column, direction)}
    />
  );
}

export function BillingRulesDataTable({
  rules,
  vehicleTypeFeeHeadIds,
  feeHeads,
  fiscalYears,
  fiscalYearFilter,
  vehicleCategories,
  billingEntities,
  scope,
  isLoading = false,
  firstRowNumber = 1,
  sortColumn,
  sortDirection,
  onSortChange,
  onView,
  onEdit,
  onToggleStatus,
  emptyState,
}: BillingRulesDataTableProps) {
  const feeHeadMap = new Map(feeHeads.map((item) => [item.id, item]));
  const vehicleCategoryMap = new Map(vehicleCategories.map((category) => [category.id, category.category]));
  const billingEntityMap = new Map(billingEntities.map((entity) => [entity.id, entity.entity]));

  if (scope === 'VEHICLE_TYPE') {
    const configuredVehicleFeeHeadIds = new Set(vehicleTypeFeeHeadIds);
    const visibleFeeHeads = feeHeads.filter((feeHead) =>
      configuredVehicleFeeHeadIds.has(feeHead.id)
      && (fiscalYearFilter === 'all' || feeHead.fiscalYearId === fiscalYearFilter),
    );
    const fiscalYearMap = new Map(fiscalYears.map((year) => [year.id, year.name]));
    const groups = groupVehicleTypeRules(rules).map((groupRules) => ({
      id: JSON.stringify([groupRules[0].vehicleCategoryId, groupRules[0].fiscalYearId]),
      rules: groupRules,
      vehicleCategoryId: groupRules[0].vehicleCategoryId,
      billingEntityIds: Array.from(new Set(groupRules.map((rule) => rule.billingEntityId).filter((id): id is string => id !== null))),
      fiscalYearId: groupRules[0].fiscalYearId,
    }));
    const columns: DataTableColumn<(typeof groups)[number]>[] = [
      {
        id: 'vehicleType',
        header: 'सवारी प्रकार',
        cell: (group) => vehicleCategoryMap.get(group.vehicleCategoryId ?? '') ?? group.vehicleCategoryId ?? '—',
      },
      {
        id: 'billingEntity',
        header: 'Billing Entity',
        cell: (group) => group.billingEntityIds.map((id) => billingEntityMap.get(id) ?? id).join(' · ') || '—',
      },
      ...visibleFeeHeads.map((feeHead) => ({
        id: `fee-head-${feeHead.id}`,
        header: (
          <span className="block min-w-28 whitespace-nowrap">
            {feeHead.name}
            {fiscalYearFilter === 'all' && fiscalYearMap.get(feeHead.fiscalYearId ?? '')
              ? <span className="ml-1 font-normal text-muted-foreground">{fiscalYearMap.get(feeHead.fiscalYearId ?? '')}</span>
              : null}
          </span>
        ),
        cell: (group: (typeof groups)[number]) => {
          const matchingRules = group.rules.filter((item) => item.feeHeadId === feeHead.id);
          if (!matchingRules.length) return <span className="text-muted-foreground">—</span>;

          return (
            <div className="min-w-36 space-y-2">
              {matchingRules.map((rule) => (
                <div key={rule.id} className="space-y-0.5">
                  <p className={`whitespace-nowrap font-medium tabular-nums ${rule.status === 'INACTIVE' ? 'text-muted-foreground line-through' : ''}`}>
                    {rule.amount.toLocaleString('ne-NP')}
                  </p>
                  <p className="whitespace-nowrap text-[11px] text-muted-foreground">
                    {rule.frequency === 'PERIODIC' ? 'आवधिक' : 'एकपटक'}
                    {' · '}
                    {rule.period === 'MONTH' ? 'महिना' : rule.period === 'FISCAL_YEAR' ? 'आर्थिक वर्ष' : 'लागू हुँदैन'}
                    {rule.status === 'INACTIVE' ? ' · निष्क्रिय' : ''}
                  </p>
                </div>
              ))}
            </div>
          );
        },
      })),
      {
        id: 'status',
        header: 'स्थिति',
        cell: (group) => {
          const isActive = group.rules.every((rule) => rule.status === 'ACTIVE');
          const isInactive = group.rules.every((rule) => rule.status === 'INACTIVE');
          return (
            <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
              isActive ? 'bg-emerald-600 text-white' : isInactive ? 'bg-muted text-muted-foreground' : 'bg-amber-100 text-amber-800'
            }`}>
              {isActive ? <CircleCheck className="h-3 w-3" aria-hidden="true" /> : null}
              {isActive ? 'सक्रिय' : isInactive ? 'निष्क्रिय' : 'आंशिक'}
            </span>
          );
        },
      },
      {
        id: 'actions',
        header: <span className="block text-right">कार्यहरू</span>,
        cell: (group) => {
          return (
            <div className="flex min-w-24 flex-col items-end gap-2">
              {group.rules.map((rule) => {
                const feeHeadName = feeHeadMap.get(rule.feeHeadId)?.name ?? rule.feeHeadId;
                const ruleLabel = `${feeHeadName} · ${rule.frequency === 'PERIODIC' ? 'आवधिक' : 'एकपटक'} · ${rule.period === 'MONTH' ? 'महिना' : rule.period === 'FISCAL_YEAR' ? 'आर्थिक वर्ष' : 'लागू हुँदैन'}`;
                return (
                  <div key={rule.id} className="flex gap-1">
                    <TableActionIconButton aria-label={`${ruleLabel} — विवरण हेर्नुहोस्`} title={`${ruleLabel} — विवरण हेर्नुहोस्`} onClick={() => onView(rule)}>
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    </TableActionIconButton>
                    <TableActionIconButton aria-label={`${ruleLabel} — सम्पादन गर्नुहोस्`} title={`${ruleLabel} — सम्पादन गर्नुहोस्`} onClick={() => onEdit(rule)}>
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </TableActionIconButton>
                    <TableActionIconButton aria-label={`${ruleLabel} — स्थिति परिवर्तन गर्नुहोस्`} title={`${ruleLabel} — स्थिति परिवर्तन गर्नुहोस्`} onClick={() => onToggleStatus(rule)}>
                      <Power className="h-4 w-4" aria-hidden="true" />
                    </TableActionIconButton>
                  </div>
                );
              })}
            </div>
          );
        },
        cellClassName: 'text-right',
        headerClassName: 'text-right',
      },
    ];

    return (
      <DataTable
        columns={columns}
        data={groups}
        getRowId={(group) => group.id}
        isLoading={isLoading}
        loadingLabel="बिलिङ नियमहरू लोड हुँदैछन्..."
        ariaLabel="सवारी प्रकारका बिलिङ नियमहरू"
        emptyState={emptyState ?? {
          title: 'सवारी प्रकारका नियम भेटिएनन्',
          description: 'फिल्टर परिवर्तन गर्नुहोस् वा नयाँ बिलिङ नियम थप्नुहोस्।',
        }}
      />
    );
  }

  const columns: DataTableColumn<BillingRule>[] = [
    {
      id: 'number',
      header: 'सि.नं.',
      cell: (_rule) => <span className="tabular-nums text-muted-foreground">{firstRowNumber + rules.indexOf(_rule)}</span>,
      headerClassName: 'w-14 text-center',
      cellClassName: 'w-14 text-center',
    },
    {
      id: 'feeHead',
      header: sortHeader('नियम नाम', 'feeHead', sortColumn, sortDirection, onSortChange),
      cell: (rule) => {
        const feeHead = feeHeadMap.get(rule.feeHeadId);
        return <span className="font-medium text-foreground">{feeHead?.name ?? rule.feeHeadId}</span>;
      },
      headerClassName: 'min-w-44',
    },
    {
      id: 'amount',
      header: sortHeader('रकम', 'amount', sortColumn, sortDirection, onSortChange),
      cell: (rule) => <span className="tabular-nums">{rule.amount.toLocaleString('en-IN')}</span>,
      headerClassName: 'w-24 text-center',
      cellClassName: 'w-24 text-center',
    },
    {
      id: 'frequency',
      header: sortHeader('शुल्क प्रकार', 'frequency', sortColumn, sortDirection, onSortChange),
      cell: (rule) => rule.frequency === 'ONE_TIME' ? 'एकपटक' : 'आवधिक',
      headerClassName: 'w-32 text-center',
      cellClassName: 'w-32 text-center',
    },
    {
      id: 'validity',
      header: sortHeader('मान्य अवधि अन्त्य', 'validity', sortColumn, sortDirection, onSortChange),
      cell: (rule) => rule.validity === 'END_OF_MONTH'
        ? 'महिनाको अन्त्य'
        : rule.validity === 'END_OF_FISCAL_YEAR'
          ? 'आर्थिक वर्षको अन्त्य'
          : 'सोही दिन',
      headerClassName: 'min-w-40 text-center',
      cellClassName: 'text-center',
    },
    {
      id: 'billingEntity',
      header: 'Billing Entity',
      cell: (rule) => billingEntityMap.get(rule.billingEntityId ?? '') ?? '—',
      headerClassName: 'min-w-52',
    },
    {
      id: 'status',
      header: 'स्थिति',
      cell: (rule) => (
        <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
          rule.status === 'ACTIVE' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-muted text-muted-foreground'
        }`}>
          {rule.status === 'ACTIVE' ? <CircleCheck className="h-3 w-3" aria-hidden="true" /> : null}
          {rule.status === 'ACTIVE' ? 'सक्रिय' : 'निष्क्रिय'}
        </span>
      ),
      headerClassName: 'w-28 text-center',
      cellClassName: 'text-center',
    },
    {
      id: 'actions',
      header: <span className="block text-center">कार्यहरू</span>,
      cell: (rule) => (
        <div className="flex items-center justify-center gap-1">
          <TableActionIconButton
            aria-label={`${feeHeadMap.get(rule.feeHeadId)?.name ?? rule.feeHeadId} सम्पादन गर्नुहोस्`}
            title="सम्पादन गर्नुहोस्"
            onClick={() => onEdit(rule)}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </TableActionIconButton>
          <TableActionIconButton
            tone={rule.status === 'ACTIVE' ? 'destructive' : 'default'}
            aria-label={rule.status === 'ACTIVE' ? 'नियम निष्क्रिय गर्नुहोस्' : 'नियम सक्रिय गर्नुहोस्'}
            title={rule.status === 'ACTIVE' ? 'नियम निष्क्रिय गर्नुहोस्' : 'नियम सक्रिय गर्नुहोस्'}
            onClick={() => onToggleStatus(rule)}
          >
            {rule.status === 'ACTIVE'
              ? <Trash2 className="h-4 w-4" aria-hidden="true" />
              : <Power className="h-4 w-4" aria-hidden="true" />}
          </TableActionIconButton>
        </div>
      ),
      cellClassName: 'text-center',
      headerClassName: 'text-center',
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rules}
      getRowId={(rule) => rule.id}
      isLoading={isLoading}
      loadingLabel="बिलिङ नियमहरू लोड हुँदैछन्..."
      ariaLabel="साझा बिलिङ नियमहरू"
      emptyState={emptyState ?? {
        title: 'साझा नियम भेटिएनन्',
        description: 'फिल्टर परिवर्तन गर्नुहोस् वा नयाँ बिलिङ नियम थप्नुहोस्।',
      }}
    />
  );
}
