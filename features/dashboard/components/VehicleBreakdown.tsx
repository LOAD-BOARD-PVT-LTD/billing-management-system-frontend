import type { CSSProperties } from 'react';
import type { VehicleSegment } from '@/features/dashboard/data/dashboard-data';
import { formatNumber } from '@/utils/numbers';

export function VehicleBreakdown({ vehicles }: { vehicles: VehicleSegment[] }) {
  const gradient = vehicles.reduce((result, vehicle) => {
    const end = result.current + vehicle.share;
    return {
      current: end,
      stops: [...result.stops, `${vehicle.color} ${result.current}% ${end}%`],
    };
  }, { current: 0, stops: [] as string[] }).stops.join(', ');

  return (
    <section className="rounded-md border bg-card p-4 shadow-sm shadow-black/[0.02]" aria-labelledby="vehicle-breakdown-title">
      <div className="mb-4">
        <h2 id="vehicle-breakdown-title" className="text-sm font-semibold">सवारी प्रकारअनुसार विवरण</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">दर्ता भएका सवारीको वितरण</p>
      </div>
      <div className="flex flex-col items-center gap-5 sm:flex-row xl:flex-col 2xl:flex-row">
        <div
          className="relative grid size-36 shrink-0 place-items-center rounded-full"
          style={{ background: `conic-gradient(${gradient})` } as CSSProperties}
          role="img"
          aria-label={`कुल ${formatNumber(vehicles.reduce((sum, vehicle) => sum + vehicle.count, 0))} सवारीको प्रकारगत वितरण`}
        >
          <div className="grid size-24 place-items-center rounded-full bg-card text-center">
            <div>
              <p className="text-[11px] text-muted-foreground">कुल सवारी</p>
              <p className="text-lg font-semibold tabular-nums">{formatNumber(vehicles.reduce((sum, vehicle) => sum + vehicle.count, 0))}</p>
            </div>
          </div>
        </div>
        <ul className="w-full space-y-2">
          {vehicles.map((vehicle) => (
            <li key={vehicle.label} className="flex items-center gap-2 text-xs">
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: vehicle.color }} />
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{vehicle.label}</span>
              <span className="tabular-nums text-foreground">{formatNumber(vehicle.share)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}