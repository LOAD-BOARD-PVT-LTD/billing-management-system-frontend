import type { CollectionItem } from '@/features/dashboard/data/dashboard-data';
import { formatCurrency } from '@/utils/numbers';

export function CollectionSummary({ items }: { items: CollectionItem[] }) {
  return (
    <section className="rounded-md border bg-card p-4 shadow-sm shadow-black/[0.02]" aria-labelledby="collection-summary-title">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 id="collection-summary-title" className="text-sm font-semibold">शीर्षकअनुसार सङ्कलन</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">चालु आर्थिक वर्ष</p>
        </div>
        <span className="text-xs font-medium text-muted-foreground">लक्ष्य प्रगति</span>
      </div>
      <ul className="space-y-4">
        {items.map((item) => (
          <li key={item.label}>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
              <span className="truncate font-medium">{item.label}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">रु {formatCurrency(item.amount)}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={`${item.label} लक्ष्य प्रगति`} aria-valuenow={item.share} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-primary" style={{ width: `${item.share}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}