import type { LucideIcon } from 'lucide-react';
import {
  AlertCircle,
  BarChart3,
  CalendarDays,
  Car,
  FileText,
  Building2,
  LayoutDashboard,
  PlusCircle,
  Receipt,
  ShieldAlert,
  SlidersHorizontal,
  Users,
  Vote,
} from 'lucide-react';

import { MAHASANGH_REPORT_MODE, resolveIncomeReportRoute } from '@/components/common/layout/navigation/income-report-route';
import { USER_MENU_LINKS } from './user-menu-links';

type SidebarHref = `/${string}`;

export type NavItemConfig = {
  key: string;
  href: SidebarHref;
  icon: LucideIcon;
  adminOnly?: boolean;
  shortcut?: string;
};

export function isSidebarNavItemActive(itemHref: SidebarHref, currentUrl: string): boolean {
  const itemUrl = new URL(itemHref, 'https://billing.example.test');
  const current = new URL(currentUrl, 'https://billing.example.test');
  if (itemUrl.pathname !== current.pathname) return false;

  if (itemUrl.pathname === '/dashboard/income-report') {
    const itemMode = resolveIncomeReportRoute(itemHref).reportMode;
    const currentMode = resolveIncomeReportRoute(currentUrl).reportMode;
    return (itemMode === MAHASANGH_REPORT_MODE) === (currentMode === MAHASANGH_REPORT_MODE);
  }

  return Array.from(itemUrl.searchParams).every(
    ([key, value]) => current.searchParams.get(key) === value,
  );
}

export const NAV_ITEMS: NavItemConfig[] = [
  { key: 'navigation.dashboard', href: '/dashboard', icon: LayoutDashboard },
  { key: 'navigation.billingNew', href: '/dashboard/billing-new', icon: PlusCircle },
  { key: 'navigation.receipts', href: '/dashboard/receipts', icon: Receipt },
  { key: 'navigation.members', href: '/dashboard/members', icon: Users },
  { key: 'navigation.vehicleBlacklist', href: '/dashboard/vehicle-blacklist', icon: ShieldAlert },
  { key: 'navigation.unpaidExpiry', href: '/dashboard/unpaid-list', icon: AlertCircle },
  { key: 'navigation.tqmsMemberRegistry', href: '/dashboard/tqms-member-registry', icon: Car },
  { key: 'navigation.tqmsOwnerDirectory', href: '/dashboard/tqms-owner-directory', icon: Users },
  { key: 'navigation.billingEntities', href: '/dashboard/billing-entities', icon: SlidersHorizontal, adminOnly: true },
  { key: 'navigation.billingRules', href: '/dashboard/billing-rules', icon: FileText, adminOnly: true },
  { key: 'navigation.branches', href: '/dashboard/branches', icon: Building2, adminOnly: true },
  { key: 'navigation.vehicleTypes', href: '/dashboard/vehicle-types', icon: Car, adminOnly: true },
  { key: 'navigation.elections', href: '/dashboard/elections', icon: CalendarDays, adminOnly: true },
  { key: 'navigation.voterList', href: '/dashboard/voters', icon: Vote, adminOnly: true },
  { key: 'navigation.users', href: '/dashboard/users', icon: Users, adminOnly: true },
];

export const REPORT_NAV_ITEMS: NavItemConfig[] = [
  { key: 'navigation.incomeReport', href: '/dashboard/income-report', icon: BarChart3 },
  { key: 'navigation.mahasanghReport', href: '/dashboard/income-report?reportMode=mahasangh', icon: BarChart3 },
  { key: 'navigation.memberTransactionReport', href: '/dashboard/member-transaction-report', icon: Receipt },
  { key: 'navigation.titleWiseIncomeReport', href: '/dashboard/income-report/title-wise', icon: BarChart3 },
  { key: 'navigation.vehicleSpecificReport', href: '/dashboard/income-report/vehicle-specific', icon: BarChart3 },
];

export const QUICK_ACTIONS: NavItemConfig[] = [];

export function buildPrimaryNav(t: (key: string) => string, isAdmin: boolean) {
  const mapItem = (item: NavItemConfig) => ({
    key: item.key,
    href: item.href,
    icon: item.icon,
    label: t(item.key),
  });

  return {
    main: NAV_ITEMS.filter((item) => !item.adminOnly).map(mapItem),
    reports: REPORT_NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map(mapItem),
    admin: isAdmin ? NAV_ITEMS.filter((item) => item.adminOnly).map(mapItem) : [],
  };
}

export function buildQuickActions(t: (key: string) => string, isAdmin: boolean) {
  return QUICK_ACTIONS.filter((item) => !item.adminOnly || isAdmin).map((item) => ({
    href: item.href,
    icon: item.icon,
    label: t(item.key),
    shortcut: item.shortcut ? t(item.shortcut) : undefined,
  }));
}

export function canAccessDashboardPath(pathname: string, isAdmin: boolean): boolean {
  if (isAdmin) return true;

  const adminOnlyPaths = [...NAV_ITEMS, ...REPORT_NAV_ITEMS]
    .filter((item) => item.adminOnly)
    .map((item) => item.href.split('?')[0])
    .concat(USER_MENU_LINKS.filter((item) => item.adminOnly).map((item) => item.href));

  return !adminOnlyPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}
