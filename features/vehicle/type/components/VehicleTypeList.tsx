'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, CarFront, Layers, Link2, Plus, RefreshCw, Search, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { VehicleTypeAssignmentDialog } from '@/features/vehicle/type/components/VehicleTypeAssignmentDialog';
import { VehicleTypeDialog } from '@/features/vehicle/type/components/VehicleTypeDialog';
import { VehicleTypeTable } from '@/features/vehicle/type/components/VehicleTypeTable';
import { useVehicleTypes } from '@/features/vehicle/type/hooks/useVehicleTypes';
import type {
  VehicleTypeFormSubmission,
  VehicleTypeRecord,
} from '@/features/vehicle/type/types/vehicle-type.types';
import { toNepaliDigits } from '@/utils/numbers';

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

  const unmappedCategoryCount = useMemo(
    () => records.filter((record) => record.vehicleTypes.length === 0).length,
    [records],
  );

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
      } catch (moveError) {
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
          description: moveError instanceof Error ? moveError.message : 'कृपया फेरि प्रयास गर्नुहोस्।',
          variant: 'destructive',
        });
        return;
      }

      toast({ title: 'सवारी प्रकार सारियो', description: `${vehicleType} अब ${target.category} श्रेणीमा छ।` });
      setAssignment(null);
    } catch (moveError) {
      toast({
        title: 'सवारी प्रकार सार्न सकिएन',
        description: moveError instanceof Error ? moveError.message : 'कृपया फेरि प्रयास गर्नुहोस्।',
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
      throw new Error(`यी TQMS प्रकार अन्य सवारी श्रेणीमा म्याप छन्: ${conflicts.join(', ')}।`);
    }

    if (editingRecord) {
      await update(editingRecord.id, {
        categoryName: payload.category,
        vehicleTypes: payload.selectedTypeIds,
      });
      toast({ title: 'सवारी श्रेणी अपडेट भयो', description: `${payload.category} सफलतापूर्वक अपडेट भयो।` });
    } else {
      await create({ category: payload.category, selectedTypeIds: payload.selectedTypeIds });
      toast({ title: 'सवारी श्रेणी थपियो', description: `${payload.category} सफलतापूर्वक थपियो।` });
    }

    setDialogOpen(false);
    setEditingRecord(null);
  };

  return (
    <section className="space-y-5 pb-8">
      <header className="rounded-xl border border-border/80 bg-gradient-to-br from-primary/5 via-card to-muted/30 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
              <CarFront className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <span className="inline-flex rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-[11px] font-medium text-primary">
                सवारी वर्गीकरण तथा TQMS म्यापिङ
              </span>
              <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground">सवारी प्रकार व्यवस्थापन</h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                बिलिङ नियममा प्रयोग हुने सवारी श्रेणी बनाउनुहोस् र प्रत्येक श्रेणीमा सम्बन्धित TQMS सवारी प्रकारहरू जोड्नुहोस्।
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-2 bg-card"
              onClick={() => void reload()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
              ताजा गर्नुहोस्
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleAdd}
              className="h-9 gap-2"
              leftIcon={<Plus className="h-4 w-4" />}
            >
              नयाँ सवारी श्रेणी थप्नुहोस्
            </Button>
          </div>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">कुल सवारी श्रेणी</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground tabular-nums">
                {toNepaliDigits(summary.total)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">बिलिङ नियमका लागि कन्फिगर गरिएका श्रेणी</p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Layers className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>
        </Card>

        <Card className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">जोडिएका TQMS सवारी प्रकार</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground tabular-nums">
                {toNepaliDigits(summary.mappedVehicleTypes)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">सवारी श्रेणीसँग सफलतापूर्वक म्याप भएका प्रकार</p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700">
              <Link2 className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>
        </Card>

        <Card className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">म्यापिङ अवस्था</p>
              <div className="mt-2 flex items-center gap-2">
                <p className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">
                  {unmappedCategoryCount === 0 ? 'पूर्ण' : toNepaliDigits(unmappedCategoryCount)}
                </p>
                <Badge variant={unmappedCategoryCount === 0 ? 'success' : 'secondary'} className="rounded-full text-[11px]">
                  {unmappedCategoryCount === 0 ? 'सबै श्रेणी म्याप छन्' : 'प्रकार थप्न बाँकी'}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {unmappedCategoryCount === 0
                  ? 'प्रत्येक श्रेणीमा कम्तीमा एउटा TQMS प्रकार जोडिएको छ'
                  : 'कुनै पनि TQMS प्रकार नजोडिएका श्रेणी संख्या'}
              </p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <CarFront className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>
        </Card>
      </div>

      <Card className="rounded-xl border border-border/80 bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">सवारी श्रेणी सूची</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              श्रेणी सम्पादन गर्न &ldquo;सम्पादन&rdquo; थिच्नुहोस् वा कुनै TQMS प्रकार अर्को श्रेणीमा सार्न चिपभित्रको सार्ने आइकन प्रयोग गर्नुहोस्।
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="श्रेणी वा TQMS प्रकार खोज्नुहोस्..."
              aria-label="श्रेणी वा TQMS प्रकार खोज्नुहोस्"
              className="h-9 pl-9 pr-8"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="खोजी खाली गर्नुहोस्"
                className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </div>

        {error && (
          <div role="alert" className="mt-4 flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              {error}
            </span>
            <Button type="button" variant="outline" size="xs" onClick={() => void reload()}>
              पुनः प्रयास
            </Button>
          </div>
        )}

        <div className="mt-4">
          {isLoading ? (
            <div className="flex min-h-[220px] items-center justify-center text-sm text-muted-foreground">
              सवारी श्रेणीहरू लोड हुँदैछन्...
            </div>
          ) : filteredRecords.length > 0 ? (
            <VehicleTypeTable
              rows={filteredRecords}
              canMoveBetweenCategories={records.length > 1}
              onEdit={handleEdit}
              onMoveVehicleType={(source, vehicleType) => setAssignment({ source, vehicleType })}
            />
          ) : (
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <CarFront className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="text-base font-semibold text-foreground">
                {search ? 'खोजीसँग मिल्ने सवारी श्रेणी भेटिएन' : 'कुनै सवारी श्रेणी थपिएको छैन'}
              </h3>
              <p className="mt-1 max-w-md text-xs text-muted-foreground">
                {search
                  ? `"${search}" का लागि कुनै परिणाम छैन। खोजी शब्द परिवर्तन गरेर फेरि हेर्नुहोस्।`
                  : 'बिलिङ नियम कन्फिगर गर्न पहिले सवारी श्रेणी बनाउनुहोस् र सम्बन्धित TQMS सवारी प्रकारहरू छान्नुहोस्।'}
              </p>
              {search ? (
                <Button type="button" variant="outline" size="sm" onClick={() => setSearch('')} className="mt-4">
                  खोजी खाली गर्नुहोस्
                </Button>
              ) : (
                <Button type="button" size="sm" onClick={handleAdd} className="mt-4 gap-2" leftIcon={<Plus className="h-4 w-4" />}>
                  नयाँ सवारी श्रेणी थप्नुहोस्
                </Button>
              )}
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
