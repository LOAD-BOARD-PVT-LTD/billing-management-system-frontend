'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, Building2, CheckCircle2, MapPin, Plus, RefreshCw, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useBillingEntities } from '@/features/administration/billing-entities/hooks/useBillingEntities';
import type { BranchFields, BranchRecord, BranchStatus, BranchType } from '../types/branch.types';
import { useBranches } from '../hooks/useBranches';
import { BranchDialog } from './BranchDialog';
import { BranchDetailsDialog } from './BranchDetailsDialog';
import { BranchesTable } from './BranchesTable';

function branchType(branch: BranchRecord): BranchType {
  if (!branch.billingEntityIds.length) return 'UNASSIGNED';
  return branch.billingEntityIds.length === 1 ? 'SINGLE_ENTITY' : 'MULTIPLE_ENTITIES';
}

function parseStatusFilter(value: string): 'ALL' | BranchStatus {
  if (value === 'ACTIVE' || value === 'INACTIVE') return value;
  return 'ALL';
}

function parseTypeFilter(value: string): 'ALL' | BranchType {
  if (value === 'UNASSIGNED' || value === 'SINGLE_ENTITY' || value === 'MULTIPLE_ENTITIES') return value;
  return 'ALL';
}

function KpiCard({ title, value, detail, icon: Icon, tone, progress }: {
  title: string;
  value: string | number;
  detail: string;
  icon: typeof Building2;
  tone: 'primary' | 'success' | 'muted' | 'info';
  progress?: number;
}) {
  const toneStyles = {
    primary: { icon: 'bg-primary/10 text-primary', indicator: 'bg-primary' },
    success: { icon: 'bg-emerald-500/10 text-emerald-600', indicator: 'bg-emerald-500' },
    muted: { icon: 'bg-slate-500/10 text-slate-600', indicator: 'bg-slate-400' },
    info: { icon: 'bg-sky-500/10 text-sky-600', indicator: 'bg-sky-500' },
  }[tone];

  return (
    <Card className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{value}</div>
        </div>
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneStyles.icon}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      {typeof progress === 'number' ? (
        <div className="mt-4">
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className={`h-full rounded-full ${toneStyles.indicator}`} style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
        </div>
      ) : (
        <p className="mt-4 border-t border-border/70 pt-2.5 text-xs text-muted-foreground">{detail}</p>
      )}
    </Card>
  );
}

export function BranchesPage() {
  const { records, isLoading, isSaving, error, create, update, reload } = useBranches();
  const { records: entities, error: entityError } = useBillingEntities();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | BranchStatus>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | BranchType>('ALL');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BranchRecord | null>(null);
  const [viewing, setViewing] = useState<BranchRecord | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  const filteredBranches = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter((branch) => {
      const matchesSearch = !query || [
        branch.name, branch.code, branch.address, branch.phone, branch.contactPerson,
      ].join(' ').toLowerCase().includes(query);
      return matchesSearch
        && (statusFilter === 'ALL' || branch.status === statusFilter)
        && (typeFilter === 'ALL' || branchType(branch) === typeFilter);
    });
  }, [records, search, statusFilter, typeFilter]);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (branch: BranchRecord) => {
    setEditing(branch);
    setDialogOpen(true);
  };

  const handleSave = async (fields: BranchFields) => {
    if (editing) {
      await update(editing.id, fields);
      toast({ title: 'शाखा अद्यावधिक भयो', description: `${fields.name} सफलतापूर्वक अद्यावधिक भयो।` });
    } else {
      await create(fields);
      toast({ title: 'शाखा सिर्जना भयो', description: `${fields.name} सफलतापूर्वक थपियो।` });
    }
    setDialogOpen(false);
    setEditing(null);
  };

  const handleToggleStatus = async (branch: BranchRecord) => {
    const status: BranchStatus = branch.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setStatusUpdatingId(branch.id);
    try {
      await update(branch.id, { ...branch, status });
      toast({
        title: status === 'ACTIVE' ? 'शाखा सक्रिय भयो' : 'शाखा निष्क्रिय भयो',
        description: `${branch.name} ${status === 'ACTIVE' ? 'सक्रिय' : 'निष्क्रिय'} गरिएको छ।`,
      });
    } catch (statusError) {
      toast({
        title: 'शाखाको अवस्था परिवर्तन गर्न सकिएन',
        description: statusError instanceof Error ? statusError.message : 'कृपया फेरि प्रयास गर्नुहोस्।',
        variant: 'destructive',
      });
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const activeCount = records.filter((branch) => branch.status === 'ACTIVE').length;
  const inactiveCount = records.length - activeCount;
  const hasFilters = Boolean(search.trim()) || statusFilter !== 'ALL' || typeFilter !== 'ALL';

  return (
    <section className="space-y-6 pb-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Branches</h1>
            <p className="text-sm text-muted-foreground">शाखा, बिलिङ पहुँच र सञ्चालन अवस्था व्यवस्थापन गर्नुहोस्।</p>
          </div>
        </div>
        <Button onClick={openCreate} leftIcon={<Plus className="h-4 w-4" />}>शाखा थप्नुहोस्</Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="जम्मा शाखा"
          value={records.length}
          detail={`${records.length} शाखा प्रणालीमा दर्ता छन्`}
          icon={Building2}
          tone="primary"
          progress={records.length ? 100 : 0}
        />
        <KpiCard
          title="सञ्चालित शाखा"
          value={activeCount}
          detail={records.length ? `${Math.round((activeCount / records.length) * 100)}% शाखा सञ्चालनमा` : 'अहिलेसम्म कुनै शाखा छैन'}
          icon={CheckCircle2}
          tone="success"
          progress={records.length ? (activeCount / records.length) * 100 : 0}
        />
        <KpiCard
          title="निष्क्रिय शाखा"
          value={inactiveCount}
          detail={records.length ? `${Math.round((inactiveCount / records.length) * 100)}% शाखा हाल निष्क्रिय` : 'अहिलेसम्म कुनै शाखा छैन'}
          icon={MapPin}
          tone="muted"
          progress={records.length ? (inactiveCount / records.length) * 100 : 0}
        />
        <KpiCard
          title="प्रयोगकर्ता / सञ्चालक"
          value="—"
          detail="प्रयोगकर्ता विवरण उपलब्ध भएपछि यहाँ देखिनेछ"
          icon={Users}
          tone="info"
        />
      </div>

      <Card className="rounded-2xl border border-border/80 p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full xl:max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="शाखाको नाम, कोड वा स्थान खोज्नुहोस्" className="pl-9" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:flex">
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(parseStatusFilter(value))}>
              <SelectTrigger className="w-full xl:w-44"><SelectValue placeholder="अवस्था" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">सबै अवस्था</SelectItem>
                <SelectItem value="ACTIVE">सञ्चालित</SelectItem>
                <SelectItem value="INACTIVE">निष्क्रिय</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(parseTypeFilter(value))}>
              <SelectTrigger className="w-full xl:w-52"><SelectValue placeholder="शाखा प्रकार" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">सबै प्रकार</SelectItem>
                <SelectItem value="UNASSIGNED">बिलिङ इकाइ नजोडिएको</SelectItem>
                <SelectItem value="SINGLE_ENTITY">एक बिलिङ इकाइ</SelectItem>
                <SelectItem value="MULTIPLE_ENTITIES">धेरै बिलिङ इकाइ</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" className="gap-2" onClick={() => void reload()}>
              <RefreshCw className="h-4 w-4" />पुनः लोड
            </Button>
          </div>
        </div>

        {(error || entityError) && (
          <div role="alert" className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />{error ?? `बिलिङ इकाइ लोड भएन: ${entityError}`}
          </div>
        )}

        <div className="mt-4">
          {isLoading ? (
            <div className="flex min-h-[240px] items-center justify-center text-sm text-muted-foreground">शाखाहरू लोड हुँदैछन्...</div>
          ) : error && records.length === 0 ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center text-center">
              <AlertCircle className="mb-3 h-9 w-9 text-muted-foreground" />
              <p className="font-medium">शाखाहरू लोड गर्न सकिएन</p>
              <p className="mt-1 text-sm text-muted-foreground">API जाँच गरी पुनः प्रयास गर्नुहोस्।</p>
              <Button variant="outline" className="mt-4" onClick={() => void reload()}>पुनः प्रयास</Button>
            </div>
          ) : filteredBranches.length ? (
            <BranchesTable
              rows={filteredBranches}
              isSaving={isSaving || statusUpdatingId !== null}
              onView={setViewing}
              onEdit={openEdit}
              onToggleStatus={(branch) => void handleToggleStatus(branch)}
            />
          ) : (
            <div className="flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-4 text-center">
              <Building2 className="mb-3 h-10 w-10 text-muted-foreground/60" />
              <h2 className="text-lg font-semibold">{hasFilters ? 'खोजीसँग मिल्ने शाखा भेटिएन' : 'अहिलेसम्म शाखा छैन'}</h2>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                {hasFilters ? 'खोजी वा फिल्टर परिवर्तन गरेर पुनः प्रयास गर्नुहोस्।' : 'शाखा र बिलिङ इकाइ पहुँच व्यवस्थापन गर्न पहिलो शाखा थप्नुहोस्।'}
              </p>
              {hasFilters ? (
                <Button variant="outline" className="mt-4" onClick={() => { setSearch(''); setStatusFilter('ALL'); setTypeFilter('ALL'); }}>फिल्टर हटाउनुहोस्</Button>
              ) : (
                <Button className="mt-4" onClick={openCreate} leftIcon={<Plus className="h-4 w-4" />}>शाखा थप्नुहोस्</Button>
              )}
            </div>
          )}
        </div>
      </Card>

      <BranchDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        record={editing}
        entities={entities}
        isSaving={isSaving}
        onSubmit={handleSave}
      />
      <BranchDetailsDialog
        record={viewing}
        entities={entities}
        open={viewing !== null}
        onOpenChange={(open) => { if (!open) setViewing(null); }}
      />
    </section>
  );
}
