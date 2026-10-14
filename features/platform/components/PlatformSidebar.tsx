'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronsUpDown, Command, X } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PLATFORM_NAVIGATION } from '@/features/platform/model/navigation';
import { PLATFORM_PREVIEW_ORGANIZATIONS } from '@/features/platform/model/preview-data';
import { cn } from '@/utils/cn';

interface PlatformSidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapsed: () => void;
  onCloseMobile: () => void;
}

export function PlatformSidebar({ collapsed, mobileOpen, onToggleCollapsed, onCloseMobile }: PlatformSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [organizationLabel, setOrganizationLabel] = useState('All Organizations');

  return (
    <>
      {mobileOpen ? (
        <button type="button" className="fixed inset-0 z-40 bg-black/40 lg:hidden" aria-label="Close platform navigation" onClick={onCloseMobile} />
      ) : null}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/10 bg-[#171927] text-white transition-[width,transform] duration-200 lg:sticky lg:top-0 lg:z-20 lg:h-screen lg:translate-x-0',
          collapsed && 'lg:w-[4.5rem]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
        aria-label="Platform navigation"
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
          <Link href="/platform/dashboard" className="flex min-w-0 items-center gap-3" onClick={onCloseMobile}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500 text-white shadow-sm">
              <Command className="h-5 w-5" aria-hidden="true" />
            </span>
            {!collapsed ? <span className="min-w-0 leading-tight"><span className="block text-sm font-bold tracking-wide">LODBOD</span><span className="block text-[9px] tracking-[0.22em] text-slate-300">PLATFORM</span></span> : null}
          </Link>
          <Button type="button" variant="ghost" size="icon-sm" className="text-slate-300 hover:text-white lg:hidden" aria-label="Close navigation" onClick={onCloseMobile}>
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="border-b border-white/10 p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" className={cn('h-10 w-full justify-between gap-2 bg-white/[0.06] px-3 text-left text-xs text-slate-100 hover:bg-white/10 hover:text-white', collapsed && 'justify-center px-0')} aria-label="Organization context">
                <span className="flex min-w-0 items-center gap-2"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/10 text-violet-200">◎</span>{!collapsed ? <span className="truncate">{organizationLabel}</span> : null}</span>
                {!collapsed ? <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" /> : null}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel>Organization context · preview</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => { setOrganizationLabel('All Organizations'); router.push('/platform/organizations'); }}>All Organizations</DropdownMenuItem>
              <DropdownMenuSeparator />
              {PLATFORM_PREVIEW_ORGANIZATIONS.map((organization) => (
                <DropdownMenuItem key={organization.id} onSelect={() => { setOrganizationLabel(organization.name); router.push(`/platform/organizations/${organization.id}`); }}>
                  <span className="truncate">{organization.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {!collapsed ? <p className="mt-1 px-1 text-[9px] text-amber-200/80">Preview organization records</p> : null}
        </div>

        <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto px-2 py-4">
          {PLATFORM_NAVIGATION.map((group) => (
            <div key={group.label}>
              {!collapsed ? <h2 className="mb-1.5 px-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">{group.label}</h2> : null}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <li key={item.href}>
                      <Link href={item.href} title={collapsed ? item.label : undefined} aria-current={active ? 'page' : undefined} onClick={onCloseMobile} className={cn('flex h-9 items-center gap-3 rounded-md px-3 text-xs text-slate-300 transition-colors hover:bg-white/[0.07] hover:text-white', active && 'bg-violet-600/90 font-medium text-white shadow-sm hover:bg-violet-600', collapsed && 'justify-center px-0')}>
                        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        {!collapsed ? <span className="truncate">{item.label}</span> : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="hidden border-t border-white/10 p-2 lg:block">
          <Button type="button" variant="ghost" size="sm" className="w-full justify-center text-slate-300 hover:text-white" onClick={onToggleCollapsed} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            <ChevronsUpDown className="h-4 w-4 rotate-90" aria-hidden="true" />
            {!collapsed ? <span className="ml-2 text-xs">Collapse</span> : null}
          </Button>
        </div>
      </aside>
    </>
  );
}