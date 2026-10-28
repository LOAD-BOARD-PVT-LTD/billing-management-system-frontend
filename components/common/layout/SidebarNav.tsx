'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/auth-context';
import { useOrganization } from '@/contexts/organization-context';
import { buildPrimaryNav, buildQuickActions, isSidebarNavItemActive } from '@/components/common/layout/navigation/sidebar-config';
import { getUserMenuLinks, type UserMenuLinkKey } from '@/components/common/layout/navigation/user-menu-links';
import { Role } from '@/types/auth';
import { useTranslations } from '@/utils/translations';
import type { LucideIcon } from 'lucide-react';
import {
  LogOut,
  Settings,
  User,
} from 'lucide-react';
import type { Route } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

type SidebarHref = `/${string}`;
type UserMenuItem = { key: UserMenuLinkKey; icon: LucideIcon; label: string; href: SidebarHref };
type UserMenuDropdownProps = {
  userName: string;
  userInitial: string;
  accountLabel: string;
  menuItems: UserMenuItem[];
  logoutLabel: string;
  onLogout: () => void;
};
type SidebarUserMenuProps = {
  userName: string;
  userInitial: string;
  roleLabel: string;
  accountLabel: string;
  menuItems: UserMenuItem[];
  logoutLabel: string;
  onLogout: () => void;
};

function getInitials(name?: string) {
  const fallback = 'MB';
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return fallback;
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : parts[0]?.[1] ?? '';
  const initials = `${first}${last}`.trim();
  return initials ? initials.toUpperCase() : fallback;
}

function buildNavLabels(t: (key: string) => string) {
  return {
    mainNav: t('navigation.main'),
    reportNav: t('navigation.reports'),
    adminNav: t('navigation.admin'),
    quickActions: t('dashboard.quickActions.description'),
    quickActionsDescription: '',
  };
}

function buildBranding(
  t: (key: string) => string,
  organizationName: string,
  logoUrl?: string,
) {
  return {
    organizationName,
    logoUrl,
    tagline: t('app.tagline'),
  };
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;

  const tagName = target.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select';
}

function buildUserMenu(
  t: (key: string) => string,
  userName: string,
  logout: () => void,
  isAdmin: boolean,
) {
  const iconByKey: Record<UserMenuLinkKey, LucideIcon> = {
    profile: User,
    systemAdmin: Settings,
  };
  const labelByKey: Record<UserMenuLinkKey, string> = {
    profile: t('auth.profile'),
    systemAdmin: t('auth.systemAdministrator'),
  };

  const menuItems = getUserMenuLinks(isAdmin).map((item) => ({
    ...item,
    icon: iconByKey[item.key],
    label: labelByKey[item.key],
  }));

  return {
    userName,
    userInitial: getInitials(userName),
    roleLabel: isAdmin ? t('roles.admin') : t('roles.operator'),
    accountLabel: t('auth.myAccount'),
    menuItems,
    logoutLabel: t('auth.logout'),
    onLogout: logout,
  };
}

function SidebarBranding({
  organizationName,
  logoUrl,
  tagline,
}: {
  organizationName: string;
  logoUrl?: string;
  tagline: string;
}) {
  const { state } = useSidebar();
  const { t } = useTranslations();
  const isCollapsed = state === 'collapsed';

                                                              
  if (isCollapsed) {
    return (
<div className="flex h-16 items-center justify-center border-b border-border">
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarTrigger className="h-8 w-8" />
          </TooltipTrigger>
          <TooltipContent side="right" align="center">
            {t('navigation.toggleSidebar')}
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="px-3 py-4">
      <div className="flex min-w-0 items-center gap-3">
        {logoUrl && (
          <Image
            src={logoUrl}
            alt=""
            width={36}
            height={36}
            unoptimized
            className="h-9 w-9 shrink-0 rounded-md object-contain"
          />
        )}
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-sm font-bold text-sidebar-foreground">{organizationName}</span>
          <span className="truncate text-xs font-medium text-sidebar-foreground/70">{tagline}</span>
        </div>
      </div>
    </div>
  );
}

function SidebarNavSection({
  label,
  items,
  currentUrl,
}: {
  label: string;
  items: Array<{ key: string; label: string; href: SidebarHref; icon: LucideIcon }>;
  currentUrl: string;
}) {
  if (!items.length) {
    return null;
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="font-medium">{label}</SidebarGroupLabel>
      <SidebarGroupContent className="group-data-[collapsible=icon]:!block">
        <SidebarMenu>
          {items.map((item) => {
                                                                   
            const [path, queryString] = item.href.split('?');
            const query = queryString ? Object.fromEntries(new URLSearchParams(queryString)) : {};
            const linkHref = (queryString ? { pathname: path, query } : path) as Parameters<typeof Link>[0]['href'];
            const isActive = isSidebarNavItemActive(item.href, currentUrl);
            const Icon = item.icon;
            return (
              <SidebarMenuItem key={item.key}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.label}
                  className="group/menu-button transition-all duration-200 hover:translate-x-1 hover:shadow-md hover:bg-sidebar-accent/80 data-[active=true]:shadow-sm data-[active=true]:border-l-2 data-[active=true]:border-sidebar-primary"
                >
                  <Link href={linkHref} className="no-underline">
                    <Icon className="h-4 w-4 transition-transform duration-200 group-hover/menu-item:scale-110" />
                    <span className="transition-all duration-200 group-data-[collapsible=icon]:hidden">{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function SidebarQuickActions({
  label,
  description,
  items,
}: {
  label: string;
  description?: string;
  items: Array<{ label: string; href: SidebarHref; icon: LucideIcon; shortcut?: string }>;
}) {
  if (!items.length) {
    return null;
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="flex flex-col items-start gap-1">
        <span className="font-medium">{label}</span>
        {description ? (
          <span className="text-[0.65rem] font-normal text-sidebar-foreground">{description}</span>
        ) : null}
      </SidebarGroupLabel>
      <SidebarGroupContent className="group-data-[collapsible=icon]:!block">
        <SidebarMenu>
          {items.map((item) => {
                                                                   
            const [path, queryString] = item.href.split('?');
            const query = queryString ? Object.fromEntries(new URLSearchParams(queryString)) : {};
            const linkHref = (queryString ? { pathname: path, query } : path) as Parameters<typeof Link>[0]['href'];
            
            const Icon = item.icon;
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  className="h-auto items-start gap-3 rounded-lg border border-transparent bg-sidebar-accent/10 px-4 py-3 text-left transition-all duration-200 hover:translate-x-1 hover:border-sidebar-primary/40 hover:bg-sidebar-accent/50 hover:shadow-md group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 group-data-[collapsible=icon]:!h-auto"
                  tooltip={item.label}
                >
                  <Link href={linkHref} className="no-underline">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-accent/10 text-sidebar-foreground transition-all duration-200 group-hover/menu-item:scale-110 group-hover/menu-item:bg-sidebar-accent/20 group-data-[collapsible=icon]:!h-8 group-data-[collapsible=icon]:!w-8">
                      <Icon className="h-4 w-4 transition-transform duration-200 group-hover/menu-item:rotate-6" />
                    </span>
                    <span className="flex flex-1 items-center justify-between gap-2 group-data-[collapsible=icon]:hidden">
                      <span className="min-w-0 truncate text-sm font-semibold text-sidebar-foreground transition-colors duration-200">
                        {item.label}
                      </span>
                      {item.shortcut ? (
                        <kbd className="inline-flex shrink-0 items-center justify-center rounded-md border border-sidebar-border bg-sidebar-accent/20 px-1.5 py-1 text-[10px] font-bold tracking-wide text-sidebar-foreground shadow-sm">
                          {item.shortcut}
                        </kbd>
                      ) : null}
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function UserMenuSummary({
  userInitial,
  userName,
  accountLabel,
}: {
  userInitial: string;
  userName: string;
  accountLabel: string;
}) {
  return (
    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
      <Avatar className="h-8 w-8 rounded-lg">
        <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-xs font-semibold uppercase text-primary-foreground">
          {userInitial}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col space-y-1">
        <p className="text-sm font-bold leading-tight text-sidebar-foreground">{userName}</p>
        <p className="text-xs font-semibold leading-tight text-sidebar-foreground">{accountLabel}</p>
      </div>
    </div>
  );
}

function UserMenuDropdownContent({
  userInitial,
  userName,
  accountLabel,
  menuItems,
  logoutLabel,
  onLogout,
}: UserMenuDropdownProps) {
  return (
    <DropdownMenuContent 
      className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg z-[100]" 
      side="top" 
      align="end" 
      sideOffset={8}
      collisionPadding={8}
    >
      <DropdownMenuLabel className="p-0 font-normal">
        <UserMenuSummary userInitial={userInitial} userName={userName} accountLabel={accountLabel} />
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      {menuItems.map(({ key, icon: Icon, label, href }) => (
        <DropdownMenuItem key={key} className="cursor-pointer" asChild>
          <Link href={href as Route}>
            <Icon className="mr-2 h-4 w-4" />
            <span>{label}</span>
          </Link>
        </DropdownMenuItem>
      ))}
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={onLogout}
        className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
      >
        <LogOut className="mr-2 h-4 w-4" />
        <span>{logoutLabel}</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}

function SidebarUserMenu(props: SidebarUserMenuProps) {
  const {
    userName,
    userInitial,
    roleLabel,
    accountLabel,
    menuItems,
    logoutLabel,
    onLogout,
  } = props;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground w-full !h-auto min-h-14 items-start"
              size="lg"
              type="button"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-xs font-semibold uppercase text-primary-foreground">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              <div className="grid min-w-0 flex-1 text-left text-sm leading-relaxed gap-0.5">
                <span className="font-bold text-sidebar-foreground whitespace-normal break-words leading-tight">{userName}</span>
                <span className="text-xs font-semibold text-sidebar-foreground whitespace-normal break-words leading-tight">{roleLabel}</span>
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <UserMenuDropdownContent
            userInitial={userInitial}
            userName={userName}
            accountLabel={accountLabel}
            menuItems={menuItems}
            logoutLabel={logoutLabel}
            onLogout={onLogout}
          />
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function useSidebarNavData() {
  const { user, logout, hasRole } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useTranslations();

  const { organization } = useOrganization();
  const organizationName = organization.nameNepali || t('system.organizationFallback');
  const isAdmin = hasRole(Role.Admin);

  const { main: mainNavItems, reports: reportNavItems, admin: adminNavItems } = buildPrimaryNav(t, isAdmin);
  const quickActions = buildQuickActions(t, isAdmin);
  const userName = user?.name || user?.email || t('auth.myAccount');

  const labels = buildNavLabels(t);
  const branding = buildBranding(t, organizationName, organization.logoUrl);
  const userMenu = buildUserMenu(t, userName, logout, isAdmin);

  return {
    currentUrl: `${pathname}${searchParams.size ? `?${searchParams.toString()}` : ''}`,
    labels,
    branding,
    mainNavItems,
    reportNavItems,
    adminNavItems,
    quickActions,
    userMenu,
  };
}

export function SidebarNav() {
  const { currentUrl, labels, branding, mainNavItems, reportNavItems, adminNavItems, quickActions, userMenu } = useSidebarNavData();
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      if (event.defaultPrevented) return;

      if (event.altKey && !event.ctrlKey && !event.metaKey && event.key.toLowerCase() === 'r') {
        event.preventDefault();
        router.push('/dashboard/billing-new');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  return (
    <Sidebar collapsible="icon">
<SidebarHeader className="border-b border-border">
        <SidebarBranding {...branding} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarQuickActions
          label={labels.quickActions}
          description={labels.quickActionsDescription}
          items={quickActions}
        />
        <SidebarNavSection label={labels.mainNav} items={mainNavItems} currentUrl={currentUrl} />
        <SidebarNavSection label={labels.reportNav} items={reportNavItems} currentUrl={currentUrl} />
        {adminNavItems.length ? (
          <SidebarNavSection label={labels.adminNav} items={adminNavItems} currentUrl={currentUrl} />
        ) : null}
      </SidebarContent>
<SidebarFooter className="border-t border-border">
        <SidebarUserMenu {...userMenu} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
