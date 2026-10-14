'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Bell, ChevronRight, CircleHelp, LogOut, Menu, Search } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/auth-context';
import { PLATFORM_BREADCRUMB_LABELS } from '@/features/platform/model/navigation';

interface PlatformHeaderProps {
  onOpenMobileNavigation: () => void;
}

export function PlatformHeader({ onOpenMobileNavigation }: PlatformHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [search, setSearch] = useState('');
  const breadcrumbs = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean);
    const platformIndex = segments.indexOf('platform');
    const label = PLATFORM_BREADCRUMB_LABELS[`/${segments.slice(platformIndex).join('/')}`]
      ?? PLATFORM_BREADCRUMB_LABELS[`/${segments.slice(platformIndex, platformIndex + 2).join('/')}`]
      ?? segments.at(-1)?.replaceAll('-', ' ')
      ?? 'Dashboard';
    return ['Platform', label];
  }, [pathname]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = search.trim();
    router.push(query ? `/platform/organizations?search=${encodeURIComponent(query)}` : '/platform/organizations');
  };

  const initials = user?.name?.split(/\s+/u).map((part) => part[0]).join('').slice(0, 2).toUpperCase() ?? 'PA';

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-white/95 px-3 backdrop-blur sm:px-5">
      <Button type="button" variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Open platform navigation" onClick={onOpenMobileNavigation}><Menu className="h-4 w-4" aria-hidden="true" /></Button>
      <nav aria-label="Breadcrumb" className="hidden min-w-36 items-center gap-1 text-xs sm:flex">
        <span className="text-muted-foreground">{breadcrumbs[0]}</span><ChevronRight className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
        <span className="truncate font-medium capitalize text-foreground">{breadcrumbs[1]}</span>
      </nav>
      <form onSubmit={submitSearch} role="search" className="relative min-w-0 flex-1 sm:ml-auto sm:max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search organizations, users, settings..." aria-label="Search platform" className="h-9 rounded-full border-transparent bg-slate-100 pl-9 text-xs focus-visible:bg-white" />
      </form>
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="icon-sm" aria-label="Notifications preview" title="Notifications preview"><Bell className="h-4 w-4" aria-hidden="true" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Notifications</DropdownMenuLabel><DropdownMenuSeparator />
          <div className="px-2 py-3 text-xs text-muted-foreground">Notification service is not connected.</div>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button asChild type="button" variant="ghost" size="icon-sm" aria-label="Platform help"><a href="/platform/settings#help" title="Platform help"><CircleHelp className="h-4 w-4" aria-hidden="true" /></a></Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" className="h-9 gap-2 px-1.5">
            <Avatar className="h-7 w-7"><AvatarFallback className="bg-violet-100 text-[10px] font-semibold text-violet-800">{initials}</AvatarFallback></Avatar>
            <span className="hidden max-w-32 text-left sm:block"><span className="block truncate text-xs font-medium">{user?.name ?? 'Platform Admin'}</span><span className="block text-[10px] text-muted-foreground">{user?.role ?? 'Platform preview'}</span></span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>{user?.email ?? 'Platform session'}</DropdownMenuLabel><DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => void logout()}><LogOut className="mr-2 h-4 w-4" aria-hidden="true" />Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}