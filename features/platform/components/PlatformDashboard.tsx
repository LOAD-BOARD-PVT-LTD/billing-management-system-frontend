'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  Building2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  Layers3,
  Search,
  Users,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PLATFORM_PREVIEW_NOTICE, PLATFORM_PREVIEW_ORGANIZATIONS, type PreviewOrganization, type PreviewOrganizationStatus } from '@/features/platform/model/preview-data';

const PAGE_SIZE = 5;

const growthMonths = [
  { label: 'Jan', count: 2 },
  { label: 'Feb', count: 3 },
  { label: 'Mar', count: 4 },
  { label: 'Apr', count: 6 },
  { label: 'May', count: 5 },
  { label: 'Jun', count: 7 },
];

const activityPreview = [
  { icon: Building2, title: 'Organization registered', detail: 'Madhesh Carriers Association', time: '2h ago', color: 'bg-violet-100 text-violet-700' },
  { icon: Layers3, title: 'Feature catalog updated', detail: 'Reporting suite · preview event', time: '3h ago', color: 'bg-emerald-100 text-emerald-700' },
  { icon: Users, title: 'Platform user invited', detail: 'support@example.test · preview', time: '5h ago', color: 'bg-sky-100 text-sky-700' },
  { icon: Activity, title: 'Configuration changed', detail: 'SMS gateway · preview event', time: '1d ago', color: 'bg-amber-100 text-amber-800' },
];

function statusStyle(status: PreviewOrganizationStatus) {
  if (status === 'ACTIVE') return 'bg-emerald-50 text-emerald-700 ring-emerald-600/15';
  if (status === 'TRIAL') return 'bg-amber-50 text-amber-800 ring-amber-600/20';
  return 'bg-rose-50 text-rose-700 ring-rose-600/15';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-NP', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T00:00:00`));
}

function PreviewStat({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof Building2; tone: string }) {
  return (
    <Card className="rounded-lg border-border/80 shadow-none hover:shadow-sm">
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
          <p className="mt-1 text-[10px] text-muted-foreground">Sample snapshot</p>
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone}`}><Icon className="h-5 w-5" aria-hidden="true" /></span>
      </CardContent>
    </Card>
  );
}

export function PlatformDashboard() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<PreviewOrganizationStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const organizations = PLATFORM_PREVIEW_ORGANIZATIONS;
  const activeOrganizations = organizations.filter((organization) => organization.status === 'ACTIVE').length;
  const totalUsers = organizations.reduce((total, organization) => total + organization.users, 0);
  const activeFeatures = new Set(organizations.flatMap((organization) => organization.features)).size;

  const filteredOrganizations = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return organizations.filter((organization) => {
      const matchesQuery = !query || `${organization.name} ${organization.identifier} ${organization.plan}`.toLocaleLowerCase().includes(query);
      return matchesQuery && (status === 'ALL' || organization.status === status);
    });
  }, [organizations, search, status]);
  const pageCount = Math.max(1, Math.ceil(filteredOrganizations.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageOrganizations = filteredOrganizations.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const statusCounts = (['ACTIVE', 'TRIAL', 'SUSPENDED'] as const).map((key) => ({
    key,
    count: organizations.filter((organization) => organization.status === key).length,
  }));
  const statusColors: Record<PreviewOrganizationStatus, string> = { ACTIVE: 'bg-emerald-500', TRIAL: 'bg-amber-400', SUSPENDED: 'bg-rose-400' };

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-700">Control plane / Preview</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Platform dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">A cross-organization view of the LODBOD platform.</p>
        </div>
        <Button asChild size="sm" leftIcon={<Building2 className="h-4 w-4" />}>
          <Link href="/platform/organizations">New Organization</Link>
        </Button>
      </div>

      <div role="status" className="flex items-start gap-2 rounded-md border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs text-amber-950">
        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{PLATFORM_PREVIEW_NOTICE} Metrics and activity below are illustrative, not live production data.</span>
      </div>

      <section aria-label="Preview platform metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PreviewStat label="Total Organizations" value={String(organizations.length)} icon={Building2} tone="bg-violet-100 text-violet-700" />
        <PreviewStat label="Active Organizations" value={String(activeOrganizations)} icon={Activity} tone="bg-emerald-100 text-emerald-700" />
        <PreviewStat label="Total Users" value={totalUsers.toLocaleString('en-US')} icon={Users} tone="bg-sky-100 text-sky-700" />
        <PreviewStat label="Active Features" value={String(activeFeatures)} icon={Layers3} tone="bg-orange-100 text-orange-700" />
      </section>

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.8fr)_minmax(18rem,0.9fr)]">
        <Card className="min-w-0 rounded-lg border-border/80 shadow-none">
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold">Organizations</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Sample Sangh directory · {filteredOrganizations.length} records</p>
            </div>
            <Link href="/platform/organizations" className="inline-flex items-center gap-1 text-xs font-medium text-violet-700 hover:text-violet-900">
              View all <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
          <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search organization or ID" aria-label="Search organizations" className="h-8 pl-8 text-xs" />
            </div>
            <Select value={status} onValueChange={(value) => { setStatus(value as PreviewOrganizationStatus | 'ALL'); setPage(1); }}>
              <SelectTrigger className="h-8 w-full text-xs sm:w-36" aria-label="Filter organizations by status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="TRIAL">Trial</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-muted-foreground">
                <tr><th className="px-4 py-2 font-medium">Organization</th><th className="px-3 py-2 font-medium">Status</th><th className="px-3 py-2 font-medium">Plan</th><th className="px-3 py-2 text-right font-medium">Users</th><th className="px-3 py-2 text-right font-medium">Branches</th><th className="px-3 py-2 font-medium">Created</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pageOrganizations.map((organization: PreviewOrganization) => (
                  <tr key={organization.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-2.5">
                      <Link href={`/platform/organizations/${organization.id}`} className="block truncate font-medium text-foreground hover:text-violet-700">{organization.name}</Link>
                      <span className="text-[10px] text-muted-foreground">{organization.identifier}</span>
                    </td>
                    <td className="px-3 py-2.5"><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${statusStyle(organization.status)}`}>{organization.status.toLowerCase()}</span></td>
                    <td className="px-3 py-2.5 text-muted-foreground">{organization.plan}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{organization.users}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{organization.branches}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{formatDate(organization.createdAt)}</td>
                  </tr>
                ))}
                {pageOrganizations.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No preview organizations match these filters.</td></tr> : null}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-border px-4 py-2">
            <span className="text-[10px] text-muted-foreground">Page {currentPage} of {pageCount}</span>
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="icon-sm" className="h-7 w-7" disabled={currentPage <= 1} aria-label="Previous page" onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft className="h-4 w-4" /></Button>
              <Button type="button" variant="ghost" size="icon-sm" className="h-7 w-7" disabled={currentPage >= pageCount} aria-label="Next page" onClick={() => setPage((value) => Math.min(pageCount, value + 1))}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </Card>

        <Card className="rounded-lg border-border/80 shadow-none">
          <div className="flex items-center justify-between border-b border-border p-4">
            <div><h2 className="text-sm font-semibold">Recent platform activity</h2><p className="mt-0.5 text-xs text-muted-foreground">Illustrative preview events</p></div>
            <Clock3 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </div>
          <ul className="divide-y divide-border px-4">
            {activityPreview.map((event) => {
              const Icon = event.icon;
              return <li key={event.title} className="flex gap-3 py-3"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${event.color}`}><Icon className="h-4 w-4" aria-hidden="true" /></span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="text-xs font-medium">{event.title}</p><span className="shrink-0 text-[10px] text-muted-foreground">{event.time}</span></div><p className="mt-0.5 truncate text-[11px] text-muted-foreground">{event.detail}</p></div></li>;
            })}
          </ul>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-lg border-border/80 p-4 shadow-none">
          <div className="flex items-start justify-between"><div><h2 className="text-sm font-semibold">Organization growth</h2><p className="mt-0.5 text-xs text-muted-foreground">Monthly sample registrations</p></div><span className="rounded bg-violet-50 px-1.5 py-0.5 text-[9px] font-medium text-violet-700">PREVIEW</span></div>
          <div className="mt-5 flex h-28 items-end gap-2 border-b border-l border-border px-2 pb-1" role="img" aria-label="Preview monthly registrations from January to June">
            {growthMonths.map((month) => <div key={month.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1"><span className="text-[9px] text-muted-foreground">{month.count}</span><div className="w-full max-w-7 rounded-t-sm bg-violet-500/80" style={{ height: `${(month.count / 7) * 72}%` }} /><span className="text-[9px] text-muted-foreground">{month.label}</span></div>)}
          </div>
        </Card>
        <Card className="rounded-lg border-border/80 p-4 shadow-none">
          <div><h2 className="text-sm font-semibold">Organization status</h2><p className="mt-0.5 text-xs text-muted-foreground">Distribution of preview records</p></div>
          <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-slate-100" aria-label="Organization status distribution">
            {statusCounts.map(({ key, count }) => <div key={key} className={statusColors[key]} style={{ width: `${organizations.length ? (count / organizations.length) * 100 : 0}%` }} title={`${key}: ${count}`} />)}
          </div>
          <div className="mt-4 space-y-2">
            {statusCounts.map(({ key, count }) => <div key={key} className="flex items-center justify-between text-xs"><span className="flex items-center gap-2 text-muted-foreground"><span className={`h-2 w-2 rounded-full ${statusColors[key]}`} />{key.toLowerCase()}</span><span className="font-medium tabular-nums">{count}</span></div>)}
          </div>
        </Card>
        <Card className="rounded-lg border-border/80 p-4 shadow-none">
          <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700"><Activity className="h-4 w-4" aria-hidden="true" /></span><div><h2 className="text-sm font-semibold">Platform health</h2><p className="mt-0.5 text-xs text-muted-foreground">Live health endpoint unavailable</p></div></div>
          <div className="mt-4 rounded-md border border-dashed border-border bg-slate-50 px-3 py-3 text-xs text-muted-foreground">Connect a platform health service to display uptime, queues, and service status.</div>
          <Link href="/platform/system/health" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-violet-700">Health integrations <ArrowRight className="h-3.5 w-3.5" /></Link>
        </Card>
      </div>

      <section className="flex flex-wrap items-center gap-2 border-t border-border pt-4" aria-label="Quick actions">
        <span className="mr-1 text-xs font-semibold">Quick actions</span>
        <Button asChild type="button" variant="outline" size="xs"><Link href="/platform/organizations">Manage organizations</Link></Button>
        <Button asChild type="button" variant="outline" size="xs"><Link href="/platform/feature-management">Feature catalog</Link></Button>
        <Button asChild type="button" variant="outline" size="xs"><Link href="/platform/audit-logs">Audit logs</Link></Button>
        <Badge variant="outline" size="sm" className="ml-auto hidden sm:inline-flex">Preview environment</Badge>
      </section>
    </div>
  );
}