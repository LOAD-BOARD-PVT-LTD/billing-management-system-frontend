import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import type { IncomeTrendPoint } from '@/features/dashboard/data/dashboard-data';
import { formatCurrency, formatNumber, toNepaliDigits } from '@/utils/numbers';
import { formatFiscalYearForDisplay } from '@/utils/nepali-calender-dates/nepali-fiscal-year';

const chartWidth = 640;
const chartHeight = 215;
const chartPadding = { top: 14, right: 14, bottom: 30, left: 54 };

function formatAxisTick(value: number): string {
  if (value >= 100_000) {
    return `${toNepaliDigits((value / 100_000).toFixed(1))} लाख`;
  }
  if (value >= 1_000) {
    return `${toNepaliDigits(Math.round(value / 1_000))} हजार`;
  }
  return formatNumber(Math.round(value));
}

export function IncomeTrendChart({
  data,
  fiscalYear,
  totalIncome,
  growthPct,
}: {
  data: IncomeTrendPoint[];
  fiscalYear?: string;
  totalIncome?: number;
  growthPct?: number | null;
}) {
  const hasAnyAmount = data.some((point) => point.amount > 0);
  const maxAmount = Math.max(...data.map((point) => point.amount), 1);
  const plotWidth = chartWidth - chartPadding.left - chartPadding.right;
  const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  const points = data.map((point, index) => ({
    ...point,
    x: chartPadding.left + (data.length <= 1 ? plotWidth / 2 : (index / (data.length - 1)) * plotWidth),
    y: chartPadding.top + plotHeight - (point.amount / maxAmount) * plotHeight,
  }));
  const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const areaPath = points.length > 0
    ? `${linePath} L ${chartPadding.left + plotWidth} ${chartPadding.top + plotHeight} L ${chartPadding.left} ${chartPadding.top + plotHeight} Z`
    : '';

  const displayTotal = totalIncome ?? data.reduce((sum, p) => sum + p.amount, 0);

  return (
    <section className="rounded-xl border border-border/80 bg-card p-4 shadow-sm" aria-labelledby="income-trend-title">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="income-trend-title" className="text-sm font-semibold text-foreground">मासिक आम्दानी प्रवृत्ति</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {fiscalYear ? `आर्थिक वर्ष ${formatFiscalYearForDisplay(fiscalYear)} · ` : ''}
            कुल सङ्कलन: रु {formatCurrency(displayTotal)}
          </p>
        </div>
        {growthPct !== null && growthPct !== undefined ? (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
              growthPct >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
            }`}
          >
            {growthPct >= 0 ? (
              <ArrowUpRight aria-hidden="true" className="size-3.5" />
            ) : (
              <ArrowDownRight aria-hidden="true" className="size-3.5" />
            )}
            {toNepaliDigits(Math.abs(growthPct).toFixed(1))}%
          </span>
        ) : null}
      </div>

      {!hasAnyAmount ? (
        <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 text-xs text-muted-foreground">
          छानिएको आर्थिक वर्षमा भुक्तानी आम्दानी अभिलेख उपलब्ध छैन।
        </div>
      ) : (
        <div className="w-full overflow-hidden">
          <svg className="h-auto w-full" viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="मासिक आम्दानी प्रवृत्ति रेखाचित्र">
            <defs>
              <linearGradient id="income-area-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--primary, #315D78)" stopOpacity="0.22" />
                <stop offset="100%" stopColor="var(--primary, #315D78)" stopOpacity="0.01" />
              </linearGradient>
            </defs>
            {[0, 1, 2, 3].map((tick) => {
              const y = chartPadding.top + (plotHeight / 3) * tick;
              const tickValue = (maxAmount * (3 - tick)) / 3;
              return (
                <g key={tick}>
                  <line x1={chartPadding.left} x2={chartWidth - chartPadding.right} y1={y} y2={y} stroke="currentColor" className="text-border" strokeDasharray={tick === 3 ? undefined : '3 5'} />
                  <text x={chartPadding.left - 8} y={y + 4} textAnchor="end" className="fill-muted-foreground" fontSize="9.5">
                    {formatAxisTick(tickValue)}
                  </text>
                </g>
              );
            })}
            <path d={areaPath} fill="url(#income-area-fill)" />
            <path d={linePath} fill="none" stroke="var(--primary, #315D78)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {points.map((point) => (
              <g key={point.label}>
                <circle cx={point.x} cy={point.y} r={point.amount > 0 ? 3.5 : 2} fill="white" stroke="var(--primary, #315D78)" strokeWidth="2">
                  <title>{`${point.label}: रु ${formatCurrency(point.amount)}`}</title>
                </circle>
              </g>
            ))}
            {points.map((point) => (
              <text key={`${point.label}-label`} x={point.x} y={chartHeight - 8} textAnchor="middle" className="fill-muted-foreground" fontSize="9.5">
                {point.label}
              </text>
            ))}
          </svg>
        </div>
      )}
    </section>
  );
}
