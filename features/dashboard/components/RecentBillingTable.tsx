import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { BillingRecord } from '@/features/dashboard/data/dashboard-data';
import { formatCurrency } from '@/utils/numbers';

const statusLabels: Record<BillingRecord['status'], string> = {
  paid: 'भुक्तानी भयो',
  pending: 'बाँकी',
  overdue: 'रद्द',
};

const statusStyles: Record<BillingRecord['status'], string> = {
  paid: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  overdue: 'border-rose-200 bg-rose-50 text-rose-700',
};

export function RecentBillingTable({ records }: { records: BillingRecord[] }) {
  return (
    <section className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm" aria-labelledby="recent-billing-title">
      <div className="flex items-center justify-between gap-3 border-b border-border/80 px-4 py-3">
        <div>
          <h2 id="recent-billing-title" className="text-sm font-semibold text-foreground">हालका बिलहरू</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">पछिल्ला जारी गरिएका रसिद तथा भुक्तानी विवरण</p>
        </div>
        <Link href="/dashboard/receipts" className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline">
          सबै हेर्नुहोस् <ArrowRight aria-hidden="true" className="size-3.5" />
        </Link>
      </div>

      {records.length === 0 ? (
        <div className="flex h-36 items-center justify-center px-4 text-xs text-muted-foreground">
          छानिएको आर्थिक वर्षमा कुनै बिल अभिलेख भेटिएन।
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">रसिद नं.</th>
                <th className="px-4 py-2.5 font-medium">सदस्य / सवारी</th>
                <th className="px-4 py-2.5 font-medium">शीर्षक</th>
                <th className="px-4 py-2.5 font-medium">मिति</th>
                <th className="px-4 py-2.5 text-right font-medium">रकम</th>
                <th className="px-4 py-2.5 font-medium">स्थिति</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {records.map((record) => (
                <tr key={`${record.invoice}-${record.date}`} className="transition-colors hover:bg-muted/20">
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-primary">{record.invoice}</td>
                  <td className="max-w-40 truncate px-4 py-3 font-medium text-foreground">{record.member}</td>
                  <td className="max-w-44 truncate px-4 py-3 text-muted-foreground">{record.service}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground tabular-nums">{record.date}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums text-foreground">
                    रु {formatCurrency(record.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusStyles[record.status]}`}>
                      {statusLabels[record.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
