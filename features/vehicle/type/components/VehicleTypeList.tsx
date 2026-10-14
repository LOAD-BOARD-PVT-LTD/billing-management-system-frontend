'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, CarFront, Plus, Search, RefreshCw } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { VehicleTypeDialog } from '@/features/vehicle/type/components/VehicleTypeDialog';
import { VehicleTypeAssignmentDialog } from '@/features/vehicle/type/components/VehicleTypeAssignmentDialog';
import { VehicleTypeTable } from '@/features/vehicle/type/components/VehicleTypeTable';
import { useVehicleTypes } from '@/features/vehicle/type/hooks/useVehicleTypes';
import type {
  VehicleTypeFormSubmission,
  VehicleTypeRecord,
} from '@/features/vehicle/type/types/vehicle-type.types';

function normalizeTypeId(value: string) {
  return value.trim().toLocaleLowerCase();
}

export function VehicleTypeList() {
  const { records, isLoading, isSaving, error, loadError, summary, create, update, reload } = useVehicleTypes();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<VehicleTypeRecord | null>(null);
  const [assignment, setAssignment] = useState<{ source: VehicleTypeRecord; vehicleType: string } | null>(null);
  const { toast } = useToast();

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return records;

    return records.filter((record) => {
      const haystack = [record.category, ...record.vehicleTypes].join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [records, search]);

  const assignedTypeCategories = useMemo(() => {
    const assignments: Record<string, string> = {};
    records.forEach((record) => {
      if (record.id === editingRecord?.id) return;
      record.vehicleTypes.forEach((typeId) => {
        assignments[normalizeTypeId(typeId)] = record.category;
      });
    });
    return assignments;
  }, [editingRecord?.id, records]);

  const handleAdd = () => {
    setEditingRecord(null);
    setDialogOpen(true);
  };

  const handleEdit = (record: VehicleTypeRecord) => {
    setEditingRecord(record);
    setDialogOpen(true);
  };

  const handleMoveVehicleType = async (targetId: string) => {
    if (!assignment) return;

    const target = records.find((record) => record.id === targetId);
    const { source, vehicleType } = assignment;
    const normalizedTypeId = normalizeTypeId(vehicleType);
    const existingAssignment = records.find((record) =>
      record.id !== source.id
      && record.vehicleTypes.some((typeId) => normalizeTypeId(typeId) === normalizedTypeId),
    );
    if (!target || target.id === source.id || existingAssignment) {
      if (existingAssignment) {
        toast({
          title: 'सवारी प्रकार पहिले नै म्याप गरिएको छ',
          description: `यो TQMS प्रकार ${existingAssignment.category} श्रेणीमा म्याप गरिएको छ।`,
          variant: 'destructive',
        });
      }
      return;
    }

    try {
      await update(source.id, {
        categoryName: source.category,
        vehicleTypes: source.vehicleTypes.filter((type) => normalizeTypeId(type) !== normalizedTypeId),
      });
      try {
        await update(target.id, {
          categoryName: target.category,
          vehicleTypes: [...target.vehicleTypes, vehicleType],
        });
      } catch (error) {
        let rollbackError: unknown = null;
        try {
          await update(source.id, {
            categoryName: source.category,
            vehicleTypes: source.vehicleTypes,
          });
        } catch (caughtRollbackError) {
          rollbackError = caughtRollbackError;
        }
        await reload();
        toast({
          title: rollbackError
            ? 'सवारी प्रकारको assignment पूरा भएन'
            : 'नयाँ श्रेणीमा सार्न सकिएन; पुरानो श्रेणीको assignment पुनःस्थापित गरियो',
          description: error instanceof Error ? error.message : 'कृपया फेरि प्रयास गर्नुहोस्।',
          variant: 'destructive',
        });
        return;
      }

      toast({ title: 'सवारी प्रकार सारियो', description: `${vehicleType} अब ${target.category} मा छ।` });
      setAssignment(null);
    } catch (error) {
      toast({
        title: 'सवारी प्रकार सार्न सकिएन',
        description: error instanceof Error ? error.message : 'कृपया फेरि प्रयास गर्नुहोस्।',
        variant: 'destructive',
      });
    }
  };

  const handleSave = async (payload: VehicleTypeFormSubmission) => {
    if (isLoading || loadError) {
      throw new Error(loadError ?? 'सवारी श्रेणीको हालको mapping लोड हुँदैछ। फेरि प्रयास गर्नुहोस्।');
    }

    if (!payload.selectedTypeIds.length) {
      throw new Error('कम्तिमा एउटा TQMS प्रकार चयन गर्नुहोस्।');
    }

    const normalizedTypeIds = payload.selectedTypeIds.map(normalizeTypeId);
    if (new Set(normalizedTypeIds).size !== normalizedTypeIds.length) {
      throw new Error('एउटै TQMS प्रकारलाई एकभन्दा बढी पटक चयन गर्न मिल्दैन।');
    }

    const conflicts = payload.selectedTypeIds.flatMap((typeId) => {
      const category = assignedTypeCategories[normalizeTypeId(typeId)];
      return category ? [`${typeId} (${category})`] : [];
    });
    if (conflicts.length) {
      throw new Error(`यी TQMS प्रकार अन्य Billing Vehicle Category मा म्याप छन्: ${conflicts.join(', ')}।`);
    }

    if (editingRecord) {
      await update(editingRecord.id, {
        categoryName: payload.category,
        vehicleTypes: payload.selectedTypeIds,
      });
      toast({ title: 'Vehicle Category अपडेट भयो', description: `${payload.category} सफलतापूर्वक अपडेट भयो।` });
    } else {
      await create({ category: payload.category, selectedTypeIds: payload.selectedTypeIds });
      toast({ title: 'Vehicle Category थपियो', description: `${payload.category} सफलतापूर्वक थपियो।` });
    }

    setDialogOpen(false);
    setEditingRecord(null);
  };

  return (
    <section className="space-y-5 pb-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CarFront className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">सवारी प्रकार</h1>
            <p className="text-sm text-muted-foreground">सवारी श्रेणी र TQMS mapping व्यवस्थित गर्नुहोस्</p>
          </div>
        </div>

        <Button onClick={handleAdd} className="gap-2" leftIcon={<Plus className="h-4 w-4" />}>
          Vehicle Type थप्नुहोस्
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">कुल सवारी श्रेणी</p>
            <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-[11px]">
              {summary.total}
            </Badge>
          </div>
          <div className="mt-3 text-3xl font-bold text-foreground">{summary.total}</div>
        </Card>

        <Card className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">सम्बन्धित TQMS प्रकार</p>
            <Badge variant="success" className="rounded-full px-2.5 py-1 text-[11px]">
              {summary.mappedVehicleTypes}
            </Badge>
          </div>
          <div className="mt-3 text-3xl font-bold text-foreground">{summary.mappedVehicleTypes}</div>
        </Card>
      </div>

      <Card className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="सवारी प्रकार खोज्नुहोस्"
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" className="gap-2" onClick={() => void reload()}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <div className="mt-4">
          {isLoading ? (
            <div className="flex min-h-[220px] items-center justify-center text-sm text-muted-foreground">
              प्रकारहरू लोड हुँदैछ...
            </div>
          ) : filteredRecords.length > 0 ? (
            <VehicleTypeTable
              rows={filteredRecords}
              onEdit={handleEdit}
              onMoveVehicleType={(source, vehicleType) => setAssignment({ source, vehicleType })}
            />
          ) : (
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-4 text-center">
              <CarFront className="mb-3 h-11 w-11 text-muted-foreground/60" />
              <h3 className="text-lg font-semibold text-foreground">कुनै सवारी प्रकार भेटिएन</h3>
              <p className="mt-1 text-sm text-muted-foreground">नयाँ सवारी श्रेणी थप्नुसँगै TQMS mapping गर्नुहोस्।</p>
              <Button onClick={handleAdd} className="mt-4 gap-2" leftIcon={<Plus className="h-4 w-4" />}>
                Vehicle Type थप्नुहोस्
              </Button>
            </div>
          )}
        </div>
      </Card>

      <VehicleTypeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        record={editingRecord}
        assignedTypeCategories={assignedTypeCategories}
        isSaving={isSaving}
        onSubmit={handleSave}
      />
      <VehicleTypeAssignmentDialog
        key={`${assignment?.source.id ?? 'closed'}-${assignment?.vehicleType ?? ''}`}
        open={Boolean(assignment)}
        onOpenChange={(open) => {
          if (!open) setAssignment(null);
        }}
        source={assignment?.source ?? null}
        vehicleType={assignment?.vehicleType ?? null}
        categories={records}
        isSaving={isSaving}
        onMove={handleMoveVehicleType}
      />
    </section>
  );
}
