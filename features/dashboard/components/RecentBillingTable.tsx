import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { BillingRecord } from '@/features/dashboard/data/dashboard-data';
import { formatCurrency } from '@/utils/numbers';

const statusLabels: Record<BillingRecord['status'], string> = {
  paid: 'भुक्तानी भयो',
  pending: 'बाँकी',
  overdue: 'म्याद नाघ्यो',
};

const statusStyles: Record<BillingRecord['status'], string> = {
  paid: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
  overdue: 'bg-rose-50 text-rose-700',
};

export function RecentBillingTable({ records }: { records: BillingRecord[] }) {
  return (
    <section className="overflow-hidden rounded-md border bg-card shadow-sm shadow-black/[0.02]" aria-labelledby="recent-billing-title">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <h2 id="recent-billing-title" className="text-sm font-semibold">हालका बिलहरू</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">पछिल्ला बिलिङ गतिविधिहरू</p>
        </div>
        <Link href="/dashboard/receipts" className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline">
          सबै हेर्नुहोस् <ArrowRight aria-hidden="true" className="size-3.5" />
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-xs">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">बिल नं.</th>
              <th className="px-4 py-2.5 font-medium">सदस्य</th>
              <th className="px-4 py-2.5 font-medium">सेवा</th>
              <th className="px-4 py-2.5 text-right font-medium">रकम</th>
              <th className="px-4 py-2.5 font-medium">स्थिति</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {records.map((record) => (
              <tr key={record.invoice} className="hover:bg-muted/20">
                <td className="whitespace-nowrap px-4 py-3 font-medium text-primary">{record.invoice}</td>
                <td className="max-w-40 truncate px-4 py-3">{record.member}</td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{record.service}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">रु {formatCurrency(record.amount)}</td>
                <td className="px-4 py-3">
                  <span className={`whitespace-nowrap rounded px-2 py-1 font-medium ${statusStyles[record.status]}`}>
                    {statusLabels[record.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}