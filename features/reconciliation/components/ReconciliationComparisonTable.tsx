import { Database, Globe } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { ReconciliationFieldDiff } from '../types/reconciliation.types';

export type ReconciliationComparisonTableProps = {
	diffs: ReconciliationFieldDiff[];
	showChangedOnly?: boolean;
};

export function ReconciliationComparisonTable({ diffs, showChangedOnly = false }: ReconciliationComparisonTableProps) {
	const visibleDiffs = showChangedOnly ? diffs.filter((diff) => diff.isChanged) : diffs;

	return (
		<Card className="overflow-hidden border-border/80 shadow-none">
			<div className="border-b border-border/70 bg-muted/40 px-3 py-2">
				<p className="text-xs font-semibold text-foreground">
					{showChangedOnly ? 'फरक भएका विवरण' : 'तुलनात्मक विवरण (Field-by-Field Comparison)'}
				</p>
			</div>
			<div className="overflow-x-auto">
				<table className="w-full text-left text-xs">
					<thead>
						<tr className="border-b border-border/70 bg-muted/20 text-[11px] font-medium text-muted-foreground">
							<th className="w-1/4 px-3 py-2">विवरण शीर्षक</th>
							<th className="w-[37.5%] px-3 py-2">
								<div className="flex items-center gap-1.5">
									<Database className="size-3 text-primary" />
									<span>बिलिङ प्रणाली (पुरानो)</span>
								</div>
							</th>
							<th className="w-[37.5%] px-3 py-2">
								<div className="flex items-center gap-1.5">
									<Globe className="size-3 text-emerald-600" />
									<span>TQMS प्रणाली (नयाँ)</span>
								</div>
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-border/60">
						{visibleDiffs.length === 0 ? (
							<tr>
								<td colSpan={3} className="px-3 py-4 text-center text-muted-foreground">
									कुनै परिवर्तन भएको विवरण छैन।
								</td>
							</tr>
						) : visibleDiffs.map((diff) => (
							<tr
								key={diff.key}
								className={
									diff.isChanged
										? 'bg-amber-50/40 transition-colors hover:bg-amber-50/70 dark:bg-amber-950/10 dark:hover:bg-amber-950/20'
										: 'transition-colors hover:bg-muted/30'
								}
							>
								<td className="px-3 py-2 font-medium text-foreground">
									<div className="flex items-center gap-1.5">
										{diff.isChanged && (
											<span className="size-1.5 shrink-0 rounded-full bg-amber-500" />
										)}
										<span>{diff.label}</span>
									</div>
								</td>
								<td className="px-3 py-2 text-muted-foreground">
									<span
										className={
											diff.isChanged
												? 'rounded bg-amber-100/70 px-1.5 py-0.5 font-medium text-amber-950 line-through dark:bg-amber-900/40 dark:text-amber-200'
												: 'text-foreground'
										}
									>
										{diff.billingValue || '—'}
									</span>
								</td>
								<td className="px-3 py-2">
									<span
										className={
											diff.isChanged
												? 'rounded bg-emerald-100/80 px-1.5 py-0.5 font-semibold text-emerald-950 dark:bg-emerald-900/40 dark:text-emerald-200'
												: 'text-foreground'
										}
									>
										{diff.tqmsValue || '—'}
									</span>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</Card>
	);
}
