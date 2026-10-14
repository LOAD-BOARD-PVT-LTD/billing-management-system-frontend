'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ChevronLeft, ChevronRight, CircleAlert, MoreHorizontal, Plus, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TableActionIconButton } from '@/components/ui/table-action-icon-button';
import { useToast } from '@/components/ui/use-toast';
import { PLATFORM_PREVIEW_NOTICE, PLATFORM_PREVIEW_ORGANIZATIONS, type PreviewOrganization, type PreviewOrganizationStatus } from '@/features/platform/model/preview-data';

const PAGE_SIZE = 8;
const EMPTY_DRAFT = { name: '', identifier: '', plan: 'Starter', status: 'TRIAL' as PreviewOrganizationStatus };

function statusClass(status: PreviewOrganizationStatus) {
  switch (status) {
    case 'ACTIVE': return 'bg-emerald-50 text-emerald-700';
    case 'TRIAL': return 'bg-amber-50 text-amber-800';
    case 'SUSPENDED': return 'bg-rose-50 text-rose-700';
  }
}

export function OrganizationDirectory({ initialSearch = '' }: { initialSearch?: string }) {
  const [organizations, setOrganizations] = useState(PLATFORM_PREVIEW_ORGANIZATIONS);
  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState<'ALL' | PreviewOrganizationStatus>('ALL');
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PreviewOrganization | null>(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const router = useRouter();
  const { toast } = useToast();

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return organizations.filter((organization) => {
      const matchesText = !query || `${organization.name} ${organization.identifier} ${organization.plan}`.toLocaleLowerCase().includes(query);
      return matchesText && (statusFilter === 'ALL' || organization.status === statusFilter);
    });
  }, [organizations, search, statusFilter]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const openCreate = () => {
    setEditing(null);
    setDraft(EMPTY_DRAFT);
    setDialogOpen(true);
  };

  const openEdit = (organization: PreviewOrganization) => {
    setEditing(organization);
    setDraft({ name: organization.name, identifier: organization.identifier, plan: organization.plan, status: organization.status });
    setDialogOpen(true);
  };

  const saveOrganization = () => {
    if (!draft.name.trim() || !draft.identifier.trim()) return;
    if (editing) {
      setOrganizations((current) => current.map((organization) => organization.id === editing.id
        ? { ...organization, ...draft, name: draft.name.trim(), identifier: draft.identifier.trim() }
        : organization));
    } else {
      const created: PreviewOrganization = {
        ...draft,
        id: `preview-${crypto.randomUUID()}`,
        name: draft.name.trim(),
        identifier: draft.identifier.trim(),
        users: 0,
        branches: 0,
        createdAt: new Date().toISOString().slice(0, 10),
        features: [],
      };
      setOrganizations((current) => [created, ...current]);
      setPage(1);
    }
    toast({ title: editing ? 'Preview organization updated' : 'Preview organization added', description: 'This change exists only in the current browser session.' });
    setDialogOpen(false);
    setEditing(null);
  };

  const toggleStatus = (organization: PreviewOrganization) => {
    const nextStatus = organization.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setOrganizations((current) => current.map((item) => item.id === organization.id ? { ...item, status: nextStatus } : item));
    toast({ title: 'Preview status changed', description: `${organization.name} is now ${nextStatus.toLowerCase()} in this browser preview.` });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-700">Platform directory</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Organizations</h1><p className="mt-1 text-sm text-muted-foreground">Manage Sangh accounts and their platform access.</p></div>
        <Button type="button" size="sm" onClick={openCreate} leftIcon={<Plus className="h-4 w-4" />}>New Organization</Button>
      </div>

      <div role="note" className="flex items-start gap-2 rounded-md border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs text-amber-950">
        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{PLATFORM_PREVIEW_NOTICE} Create, edit, and status actions change only this browser preview.</span>
      </div>

      <Card className="overflow-hidden rounded-lg border-border/80 shadow-none">
        <div className="flex flex-col gap-2 border-b border-border p-3 sm:flex-row sm:items-center">
          <div className="relative flex-1"><Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search name, identifier, or plan" aria-label="Search organizations" className="h-9 pl-8 text-xs" /></div>
          <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value as 'ALL' | PreviewOrganizationStatus); setPage(1); }}>
            <SelectTrigger className="h-9 w-full text-xs sm:w-40" aria-label="Filter organizations by status"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="ALL">All statuses</SelectItem><SelectItem value="ACTIVE">Active</SelectItem><SelectItem value="TRIAL">Trial</SelectItem><SelectItem value="SUSPENDED">Suspended</SelectItem></SelectContent>
          </Select>
          <span className="px-1 text-[11px] text-muted-foreground">{filtered.length} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-2.5 font-medium">Organization</th><th className="px-3 py-2.5 font-medium">Status</th><th className="px-3 py-2.5 font-medium">Plan</th><th className="px-3 py-2.5 text-right font-medium">Users</th><th className="px-3 py-2.5 text-right font-medium">Branches</th><th className="px-3 py-2.5 font-medium">Created</th><th className="px-3 py-2.5 text-right font-medium">Actions</th></tr></thead>
            <tbody className="divide-y divide-border">
              {pageRows.map((organization) => (
                <tr key={organization.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3"><button type="button" className="block max-w-[20rem] truncate text-left font-medium hover:text-violet-700" onClick={() => router.push(`/platform/organizations/${organization.id}`)}>{organization.name}</button><span className="text-[10px] text-muted-foreground">{organization.identifier}</span></td>
                  <td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-medium ${statusClass(organization.status)}`}>{organization.status.toLowerCase()}</span></td>
                  <td className="px-3 py-3 text-muted-foreground">{organization.plan}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{organization.users}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{organization.branches}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">{new Intl.DateTimeFormat('en-NP', { dateStyle: 'medium' }).format(new Date(`${organization.createdAt}T00:00:00`))}</td>
                  <td className="px-3 py-2 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><TableActionIconButton aria-label={`Actions for ${organization.name}`}><MoreHorizontal className="h-4 w-4" aria-hidden="true" /></TableActionIconButton></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => router.push(`/platform/organizations/${organization.id}`)}>View workspace</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => openEdit(organization)}>Edit preview record</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => toggleStatus(organization)}>{organization.status === 'ACTIVE' ? 'Suspend' : 'Activate'} preview record</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              {pageRows.length === 0 ? <tr><td colSpan={7} className="px-4 py-12 text-center"><Building2 className="mx-auto mb-2 h-6 w-6 text-muted-foreground/60" /><p className="text-xs text-muted-foreground">No preview organizations match your filters.</p></td></tr> : null}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-border px-4 py-2.5"><span className="text-[10px] text-muted-foreground">Page {currentPage} of {pageCount}</span><div className="flex gap-1"><Button type="button" variant="ghost" size="icon-sm" className="h-7 w-7" aria-label="Previous page" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon-sm" className="h-7 w-7" aria-label="Next page" disabled={currentPage >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}><ChevronRight className="h-4 w-4" /></Button></div></div>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit preview organization' : 'New preview organization'}</DialogTitle><DialogDescription>Preview-only form. A platform organization API is required to persist this record.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label htmlFor="platform-org-name">Organization name</Label><Input id="platform-org-name" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} /></div>
            <div className="space-y-1.5"><Label htmlFor="platform-org-id">Organization identifier</Label><Input id="platform-org-id" value={draft.identifier} onChange={(event) => setDraft((current) => ({ ...current, identifier: event.target.value }))} /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Plan</Label><Select value={draft.plan} onValueChange={(plan) => setDraft((current) => ({ ...current, plan }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Starter">Starter</SelectItem><SelectItem value="Professional">Professional</SelectItem><SelectItem value="Enterprise">Enterprise</SelectItem></SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Status</Label><Select value={draft.status} onValueChange={(value) => setDraft((current) => ({ ...current, status: value as PreviewOrganizationStatus }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ACTIVE">Active</SelectItem><SelectItem value="TRIAL">Trial</SelectItem><SelectItem value="SUSPENDED">Suspended</SelectItem></SelectContent></Select></div>
            </div>
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button type="button" disabled={!draft.name.trim() || !draft.identifier.trim()} onClick={saveOrganization}>Save preview</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}