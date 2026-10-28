'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Download, Plus, Settings2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FiscalYearSelect } from '@/components/common/filters/FiscalYearSelect';
import { toNepaliDigits } from '@/utils/numbers';

interface ReceiptHeaderProps {
	fiscalYear: string;
	fiscalYears: string[];
	onFiscalYearChange: (value: string) => void;
	copyCount: number;
	onCopyCountChange: (value: number) => void;
	onExport: () => void;
	columnsMenu: ReactNode;
	resultCount: number;
}

export function ReceiptHeader({ fiscalYear, fiscalYears, onFiscalYearChange, copyCount, onCopyCountChange, onExport, columnsMenu, resultCount }: ReceiptHeaderProps) {
	const optionsOverride = fiscalYears.map((value) => ({ value, label: toNepaliDigits(value) }));

	return (
		<header className="rounded-lg border border-border/80 bg-card p-4 shadow-sm sm:p-5">
			<div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
				<div className="min-w-0">
					<h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">रसिदहरू</h1>
					<p className="mt-1 text-sm text-muted-foreground">भुक्तानी रसिदहरू सिर्जना र व्यवस्थापन</p>
				</div>
				<div className="flex min-w-0 flex-col gap-2 xl:items-end">
					<div className="flex flex-wrap items-center gap-2">
						<div className="w-36"><FiscalYearSelect value={fiscalYear} onChange={onFiscalYearChange} optionsOverride={optionsOverride} includeAllOption /></div>
						<Button asChild size="sm" className="h-9 gap-2">
							<Link href="/dashboard/billing-new"><Plus className="h-4 w-4" aria-hidden="true" />रसिद सिर्जना गर्नुहोस्</Link>
						</Button>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						{columnsMenu}
						<div className="flex h-9 items-center gap-2 rounded-md border border-input bg-background px-2">
							<label htmlFor="receipt-copy-count" className="text-[11px] text-muted-foreground">प्रतिलिपि संख्या</label>
							<Select value={String(copyCount)} onValueChange={(value) => onCopyCountChange(Number(value))}>
								<SelectTrigger id="receipt-copy-count" className="h-7 w-14 border-0 px-1 text-xs shadow-none"><SelectValue /></SelectTrigger>
								<SelectContent>{[1, 2, 3, 4, 5].map((count) => <SelectItem key={count} value={String(count)}>{toNepaliDigits(count)}</SelectItem>)}</SelectContent>
							</Select>
						</div>
						<Button type="button" variant="outline" size="sm" className="h-9 gap-2 text-xs" onClick={onExport} disabled={resultCount === 0}>
							<Download className="h-4 w-4" aria-hidden="true" />Excel निकाल्नुहोस्
						</Button>
						<Button asChild type="button" variant="outline" size="sm" className="h-9 gap-2 text-xs">
							<Link href="/dashboard/settings?tab=billing-receipts"><Settings2 className="h-4 w-4" aria-hidden="true" />रसिद सेटिङ</Link>
						</Button>
					</div>
				</div>
			</div>
		</header>
	);
}
