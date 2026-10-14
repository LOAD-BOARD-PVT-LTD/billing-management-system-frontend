'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Building2, CircleAlert } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { PLATFORM_PREVIEW_NOTICE, PLATFORM_PREVIEW_ORGANIZATIONS, type PreviewOrganization } from '@/features/platform/model/preview-data';
import { cn } from '@/utils/cn';

const organizationSections = [
  { label: 'Overview', segment: '' },
  { label: 'Features', segment: 'features' },
  { label: 'Configuration', segment: 'configuration' },
  { label: 'Users', segment: 'users' },
  { label: 'Roles', segment: 'roles' },
  { label: 'Branches', segment: 'branches' },
  { label: 'Integrations', segment: 'integrations' },
  { label: 'Security', segment: 'security' },
  { label: 'Audit Logs', segment: 'audit-logs' },
];

type OrganizationView = 'overview' | 'features' | 'configuration' | 'users' | 'roles' | 'branches' | 'integrations' | 'security' | 'audit-logs';

function PreviewIntegrationNotice({ title }: { title: string }) {
  return (
    <Card className="rounded-lg border-dashed border-border bg-white p-6 shadow-none">
      <div className="mx-auto flex max-w-lg flex-col items-center text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-700"><CircleAlert className="h-5 w-5" aria-hidden="true" /></span>
        <h2 className="mt-3 text-sm font-semibold">{title} is not connected</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">This project has no platform tenant API for this section. The screen is intentionally read-only until the backend contract is available.</p>
      </div>
    </Card>
  );
}

function OrganizationOverview({ organization }: { organization: PreviewOrganization }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
      <Card className="rounded-lg border-border/80 p-4 shadow-none">
        <h2 className="text-sm font-semibold">Organization identity</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div><dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Identifier</dt><dd className="mt-1 text-sm font-medium">{organization.identifier}</dd></div>
          <div><dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Subscription plan</dt><dd className="mt-1 text-sm font-medium">{organization.plan}</dd></div>
          <div><dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Created</dt><dd className="mt-1 text-sm font-medium">{organization.createdAt}</dd></div>
          <div><dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Status</dt><dd className="mt-1 text-sm font-medium">{organization.status.toLowerCase()}</dd></div>
        </dl>
      </Card>
      <Card className="rounded-lg border-border/80 p-4 shadow-none">
        <h2 className="text-sm font-semibold">Platform footprint</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-md bg-slate-50 p-3"><p className="text-[10px] text-muted-foreground">Users</p><p className="mt-1 text-xl font-semibold tabular-nums">{organization.users}</p></div>
          <div className="rounded-md bg-slate-50 p-3"><p className="text-[10px] text-muted-foreground">Branches</p><p className="mt-1 text-xl font-semibold tabular-nums">{organization.branches}</p></div>
        </div>
        <p className="mt-3 text-[10px] text-muted-foreground">Counts are illustrative preview values.</p>
      </Card>
      <Card className="rounded-lg border-border/80 p-4 shadow-none xl:col-span-2">
        <div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-semibold">Enabled feature sample</h2><p className="mt-0.5 text-xs text-muted-foreground">Illustrative entitlements for this organization</p></div><Badge variant="outline" size="sm">Preview</Badge></div>
        <div className="mt-4 flex flex-wrap gap-2">{organization.features.map((feature) => <span key={feature} className="rounded-md border border-border bg-slate-50 px-2.5 py-1 text-xs">{feature}</span>)}</div>
      </Card>
    </div>
  );
}

function OrganizationSection({ view }: { view: Exclude<OrganizationView, 'overview'> }) {
  const section = organizationSections.find((item) => item.segment === view);
  return <PreviewIntegrationNotice title={section?.label ?? 'Organization administration'} />;
}

export function OrganizationWorkspace({ view }: { view: OrganizationView }) {
  const params = useParams<{ organizationId: string }>();
  const organizationId = params.organizationId;
  const organization = PLATFORM_PREVIEW_ORGANIZATIONS.find((item) => item.id === organizationId);

  if (!organization) {
    return <PreviewIntegrationNotice title="Organization record" />;
  }

  return (
    <div className="space-y-5">
      <div>
        <Link href="/platform/organizations" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />Organizations</Link>
        <div className="mt-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700"><Building2 className="h-5 w-5" aria-hidden="true" /></span><div className="min-w-0"><h1 className="truncate text-xl font-semibold">{organization.name}</h1><p className="text-xs text-muted-foreground">{organization.identifier} · {organization.plan}</p></div></div>
          <span className="w-fit rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-medium text-amber-800">Preview record · {organization.status.toLowerCase()}</span>
        </div>
      </div>

      <nav aria-label="Organization administration" className="overflow-x-auto border-b border-border">
        <div className="flex min-w-max gap-1">
          {organizationSections.map((section) => {
            const href = `/platform/organizations/${organizationId}${section.segment ? `/${section.segment}` : ''}`;
            const active = view === (section.segment || 'overview');
            return <Link key={section.label} href={href} aria-current={active ? 'page' : undefined} className={cn('border-b-2 border-transparent px-3 py-2 text-xs text-muted-foreground hover:text-foreground', active && 'border-violet-600 font-medium text-violet-700')}>{section.label}</Link>;
          })}
        </div>
      </nav>

      <div role="note" className="flex items-start gap-2 rounded-md border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs text-amber-950"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><span>{PLATFORM_PREVIEW_NOTICE}</span></div>
      {view === 'overview' ? <OrganizationOverview organization={organization} /> : <OrganizationSection view={view} />}
    </div>
  );
}