import type { CollectionItem } from '@/features/dashboard/data/dashboard-data';
import { formatCurrency, toNepaliDigits } from '@/utils/numbers';

export function CollectionSummary({
  items,
  title = 'शीर्षकअनुसार सङ्कलन',
  subtitle = 'छानिएको आर्थिक वर्ष',
  rightLabel = 'हिस्सा',
  emptyText = 'सङ्कलन विवरण उपलब्ध छैन।',
}: {
  items: CollectionItem[];
  title?: string;
  subtitle?: string;
  rightLabel?: string;
  emptyText?: string;
}) {
  return (
    <section className="rounded-xl border border-border/80 bg-card p-4 shadow-sm" aria-label={title}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <span className="text-xs font-medium text-muted-foreground">{rightLabel}</span>
      </div>

      {items.length === 0 ? (
        <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 text-xs text-muted-foreground">
          {emptyText}
        </div>
      ) : (
        <ul className="space-y-3.5">
          {items.map((item) => (
            <li key={item.label}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                <span className="truncate font-medium text-foreground">{item.label}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  रु {formatCurrency(item.amount)} ({toNepaliDigits(item.share)}%)
                </span>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-label={`${item.label} हिस्सा`}
                aria-valuenow={item.share}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${item.share}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
