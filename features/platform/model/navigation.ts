import {
  Activity,
  Building2,
  ChartNoAxesCombined,
  FileClock,
  Gauge,
  Layers3,
  Link2,
  Settings2,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface PlatformNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface PlatformNavGroup {
  label: string;
  items: PlatformNavItem[];
}

export const PLATFORM_NAVIGATION: PlatformNavGroup[] = [
  { label: 'Overview', items: [{ label: 'Dashboard', href: '/platform/dashboard', icon: Gauge }] },
  { label: 'Organizations', items: [{ label: 'Organizations', href: '/platform/organizations', icon: Building2 }] },
  { label: 'Product', items: [
    { label: 'Feature Management', href: '/platform/feature-management', icon: Layers3 },
    { label: 'Plans', href: '/platform/plans', icon: ChartNoAxesCombined },
  ] },
  { label: 'Access Control', items: [
    { label: 'Platform Users', href: '/platform/platform-users', icon: Users },
    { label: 'Roles', href: '/platform/roles', icon: ShieldCheck },
  ] },
  { label: 'System', items: [
    { label: 'Integrations', href: '/platform/integrations', icon: Link2 },
    { label: 'Audit Logs', href: '/platform/audit-logs', icon: FileClock },
    { label: 'System Health', href: '/platform/system/health', icon: Activity },
  ] },
  { label: 'Settings', items: [{ label: 'Platform Settings', href: '/platform/settings', icon: Settings2 }] },
];

export const PLATFORM_BREADCRUMB_LABELS: Record<string, string> = Object.fromEntries(
  PLATFORM_NAVIGATION.flatMap((group) => group.items.map((item) => [item.href, item.label])),
);