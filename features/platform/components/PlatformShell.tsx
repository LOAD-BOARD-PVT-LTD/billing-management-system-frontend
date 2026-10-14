'use client';

import { useState, type ReactNode } from 'react';

import { PlatformHeader } from '@/features/platform/components/PlatformHeader';
import { PlatformSidebar } from '@/features/platform/components/PlatformSidebar';

export function PlatformShell({ children }: { children: ReactNode }) {
	const [collapsed, setCollapsed] = useState(false);
	const [mobileOpen, setMobileOpen] = useState(false);

	return (
		<div className="min-h-screen bg-[#f5f6fa] text-foreground">
			<div className="flex min-h-screen">
				<PlatformSidebar collapsed={collapsed} mobileOpen={mobileOpen} onToggleCollapsed={() => setCollapsed((value) => !value)} onCloseMobile={() => setMobileOpen(false)} />
				<div className="min-w-0 flex-1">
					<PlatformHeader onOpenMobileNavigation={() => setMobileOpen(true)} />
					<main className="mx-auto w-full max-w-[1600px] p-3 sm:p-5 lg:p-6">{children}</main>
				</div>
			</div>
		</div>
	);
}
