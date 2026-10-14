'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, Building2, Plus, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { BillingEntitiesTable } from './BillingEntitiesTable';
import { BillingEntityDialog } from './BillingEntityDialog';
import { useBillingEntities } from '../hooks/useBillingEntities';
import type { BillingEntityFields, BillingEntityRecord, BillingEntityStatus } from '../types/billing-entity.types';

export function BillingEntitiesPage() {
  const { records, isLoading, isSaving, error, create, update, reload } = useBillingEntities();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<BillingEntityRecord | null>(null);
  const { toast } = useToast();

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return records;
    return records.filter((record) => [
      record.entity,
      record.registrationNumber,
      record.panNumber,
      record.contactPerson,
      record.email,
      record.phoneNumber,
      record.address,
    ].join(' ').toLowerCase().includes(query));
  }, [records, search]);

  const openCreateDialog = () => {
    setEditingRecord(null);
    setDialogOpen(true);
  };

  const openEditDialog = (record: BillingEntityRecord) => {
    setEditingRecord(record);
    setDialogOpen(true);
  };

  const handleSubmit = async (fields: BillingEntityFields) => {
    if (editingRecord) {
      await update(editingRecord.id, fields);
    } else {
      await create(fields);
    }

    toast({
      title: editingRecord ? 'Billing entity updated' : 'Billing entity created',
      description: `${fields.entity} was saved successfully.`,
    });
    setDialogOpen(false);
    setEditingRecord(null);
  };

  const handleStatusChange = async (record: BillingEntityRecord, status: BillingEntityStatus) => {
    if (record.status === status) return;

    try {
      await update(record.id, {
        entity: record.entity,
        registrationNumber: record.registrationNumber,
        panNumber: record.panNumber,
        contactPerson: record.contactPerson,
        email: record.email,
        phoneNumber: record.phoneNumber,
        hotlineNumber: record.hotlineNumber,
        website: record.website,
        address: record.address,
        status,
      });
      toast({
        title: 'Billing entity status updated',
        description: `${record.entity} is now ${status === 'ACTIVE' ? 'active' : 'inactive'}.`,
      });
    } catch (statusError) {
      toast({
        title: 'Could not update billing entity status',
        description: statusError instanceof Error ? statusError.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <section className="space-y-5 pb-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Billing Entities</h1>
            <p className="text-sm text-muted-foreground">Manage billing organization details and status.</p>
          </div>
        </div>
        <Button onClick={openCreateDialog} className="gap-2" leftIcon={<Plus className="h-4 w-4" />}>
          Add billing entity
        </Button>
      </div>

      <Card className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search billing entities"
              className="pl-9"
            />
          </div>
          <Button type="button" variant="outline" className="gap-2" onClick={() => void reload()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {error && (
          <div role="alert" className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="mt-4">
          {isLoading ? (
            <div className="flex min-h-[220px] items-center justify-center text-sm text-muted-foreground">
              Loading billing entities...
            </div>
          ) : filteredRecords.length ? (
            <BillingEntitiesTable
              rows={filteredRecords}
              onEdit={openEditDialog}
              onStatusChange={(record, status) => void handleStatusChange(record, status)}
              isSaving={isSaving}
            />
          ) : (
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-4 text-center">
              <Building2 className="mb-3 h-11 w-11 text-muted-foreground/60" />
              <h2 className="text-lg font-semibold text-foreground">No billing entities found</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {search ? 'Try a different search, or create a billing entity.' : 'Create a billing entity to get started.'}
              </p>
              {!search && (
                <Button onClick={openCreateDialog} className="mt-4 gap-2" leftIcon={<Plus className="h-4 w-4" />}>
                  Add billing entity
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>

      <BillingEntityDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        record={editingRecord}
        isSaving={isSaving}
        onSubmit={handleSubmit}
      />
    </section>
  );
}
