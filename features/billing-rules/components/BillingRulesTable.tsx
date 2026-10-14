'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { BillingEntityRecord } from '@/features/administration/billing-entities/types/billing-entity.types';
import { BillingRulesDataTable, type BillingRulesDataTableProps } from '@/features/billing-rules/components/BillingRulesDataTable';

export type { BillingRuleSortColumn } from '@/features/billing-rules/utils/rule-grouping';

export interface BillingRulesTableProps extends BillingRulesDataTableProps {
  billingEntities: BillingEntityRecord[];
  vehicleCategoryFilter: string;
  onVehicleCategoryFilterChange: (vehicleCategoryId: string) => void;
}

export function BillingRulesTable({
  vehicleCategoryFilter,
  onVehicleCategoryFilterChange,
  ...tableProps
}: BillingRulesTableProps) {
  const title = tableProps.scope === 'VEHICLE_TYPE' ? 'सवारी प्रकारका नियम' : 'साझा नियम';
  const vehicleCategories = [...tableProps.vehicleCategories]
    .sort((left, right) => left.category.localeCompare(right.category, 'ne'));

  return (
    <Card className="border border-border bg-card">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <CardTitle className="text-card-foreground">{title}</CardTitle>
        {tableProps.scope === 'VEHICLE_TYPE' ? (
          <div className="w-full max-w-xs space-y-2 ">
            <Label htmlFor="billing-rules-vehicle-type">सवारी श्रेणी छान्नुहोस्</Label>
            <Select value={vehicleCategoryFilter} onValueChange={onVehicleCategoryFilterChange}>
              <SelectTrigger id="billing-rules-vehicle-type">
                <SelectValue placeholder="सवारी श्रेणी छान्नुहोस्" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">सबै सवारी श्रेणी</SelectItem>
                {vehicleCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </CardHeader>
      <CardContent>
        <BillingRulesDataTable {...tableProps} />
      </CardContent>
    </Card>
  );
}
