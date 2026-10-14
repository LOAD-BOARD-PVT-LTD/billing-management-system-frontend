import { ArrowUpRight } from 'lucide-react';
import type { IncomeTrendPoint } from '@/features/dashboard/data/dashboard-data';
import { formatNumber } from '@/utils/numbers';

const chartWidth = 640;
const chartHeight = 210;
const chartPadding = { top: 14, right: 12, bottom: 30, left: 42 };

export function IncomeTrendChart({ data }: { data: IncomeTrendPoint[] }) {
  const maxAmount = Math.max(...data.map((point) => point.amount), 1);
  const plotWidth = chartWidth - chartPadding.left - chartPadding.right;
  const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  const points = data.map((point, index) => ({
    ...point,
    x: chartPadding.left + (data.length === 1 ? plotWidth / 2 : (index / (data.length - 1)) * plotWidth),
    y: chartPadding.top + plotHeight - (point.amount / maxAmount) * plotHeight,
  }));
  const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const areaPath = `${linePath} L ${chartPadding.left + plotWidth} ${chartPadding.top + plotHeight} L ${chartPadding.left} ${chartPadding.top + plotHeight} Z`;

  return (
    <section className="rounded-md border bg-card p-4 shadow-sm shadow-black/[0.02]" aria-labelledby="income-trend-title">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="income-trend-title" className="text-sm font-semibold">आम्दानी प्रवृत्ति</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">आर्थिक वर्ष २०८३/८४ · मासिक सङ्कलन</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
          <ArrowUpRight aria-hidden="true" className="size-3.5" /> १४.१%
        </span>
      </div>
      <div className="w-full overflow-hidden">
        <svg className="h-auto w-full" viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="मासिक आम्दानी बढ्दो क्रममा रहेको रेखाचित्र">
          <defs>
            <linearGradient id="income-area-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.01" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3].map((tick) => {
            const y = chartPadding.top + (plotHeight / 3) * tick;
            return (
              <g key={tick}>
                <line x1={chartPadding.left} x2={chartWidth - chartPadding.right} y1={y} y2={y} stroke="currentColor" className="text-border" strokeDasharray={tick === 3 ? undefined : '3 5'} />
                <text x={chartPadding.left - 8} y={y + 4} textAnchor="end" className="fill-muted-foreground" fontSize="10">{formatNumber(Math.round((maxAmount * (3 - tick)) / 3 / 100000) * 100000)}</text>
              </g>
            );
          })}
          <path d={areaPath} fill="url(#income-area-fill)" />
          <path d={linePath} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((point) => <circle key={point.label} cx={point.x} cy={point.y} r="3.5" fill="white" stroke="#2563eb" strokeWidth="2" />)}
          {points.map((point) => (
            <text key={`${point.label}-label`} x={point.x} y={chartHeight - 8} textAnchor="middle" className="fill-muted-foreground" fontSize="10">
              {point.label}
            </text>
          ))}
        </svg>
      </div>
    </section>
  );
}