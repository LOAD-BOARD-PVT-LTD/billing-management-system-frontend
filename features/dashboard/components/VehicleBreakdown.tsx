'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CarFront, ChevronDown, ChevronUp } from 'lucide-react';
import type { VehicleSegment } from '@/features/dashboard/data/dashboard-data';
import { toNepaliDigits } from '@/utils/numbers';

const RING_SIZE = 152;
const STROKE_WIDTH = 16;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function VehicleBreakdown({
  vehicles,
  allVehicles,
}: {
  vehicles: VehicleSegment[];
  allVehicles?: VehicleSegment[];
}) {
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const totalCount = vehicles.reduce((sum, vehicle) => sum + vehicle.count, 0);
  const fullList = allVehicles && allVehicles.length > 0 ? allVehicles : vehicles;
  const visibleList = expanded ? fullList : vehicles;
  const canExpand = fullList.length > vehicles.length;
  const hoveredSegment = visibleList.find((item) => item.label === hoveredLabel)
    ?? vehicles.find((item) => item.label === hoveredLabel)
    ?? null;

  const arcs = vehicles.reduce<{ offset: number; items: Array<VehicleSegment & { dash: number; offset: number }> }>(
    (acc, vehicle) => {
      const fraction = totalCount > 0 ? vehicle.count / totalCount : 0;
      const rawDash = fraction * CIRCUMFERENCE;
      const gap = vehicles.length > 1 ? Math.min(3, rawDash * 0.25) : 0;
      const dash = Math.max(2, rawDash - gap);
      acc.items.push({ ...vehicle, dash, offset: acc.offset });
      acc.offset += rawDash;
      return acc;
    },
    { offset: 0, items: [] },
  ).items;

  return (
    <section
      className="flex flex-col rounded-xl border border-border/80 bg-card p-4 shadow-sm"
      aria-labelledby="vehicle-breakdown-title"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <CarFront className="size-4" aria-hidden="true" />
          </span>
          <div>
            <h2 id="vehicle-breakdown-title" className="text-sm font-semibold text-foreground">
              सवारी प्रकारअनुसार विवरण
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              सदस्य तथा दर्ता सवारीको वितरण ({toNepaliDigits(fullList.length)} प्रकार)
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/vehicle-types"
          className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          श्रेणी <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>

      {vehicles.length === 0 || totalCount === 0 ? (
        <div className="flex flex-1 min-h-[190px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 text-xs text-muted-foreground">
          सवारी प्रकार विवरण उपलब्ध छैन।
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-4">
          <div className="flex items-center justify-center py-1">
            <div className="relative grid place-items-center" style={{ width: RING_SIZE, height: RING_SIZE }}>
              <svg
                width={RING_SIZE}
                height={RING_SIZE}
                viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
                className="-rotate-90"
                role="img"
                aria-label={`कुल ${toNepaliDigits(totalCount)} सवारीको प्रकारगत वितरण`}
              >
                <circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RADIUS}
                  fill="none"
                  stroke="currentColor"
                  className="text-muted/50"
                  strokeWidth={STROKE_WIDTH}
                />
                {arcs.map((arc) => {
                  const isHovered = hoveredLabel === arc.label;
                  const isDimmed = hoveredLabel !== null && !isHovered;
                  return (
                    <circle
                      key={arc.label}
                      cx={RING_SIZE / 2}
                      cy={RING_SIZE / 2}
                      r={RADIUS}
                      fill="none"
                      stroke={arc.color}
                      strokeWidth={isHovered ? STROKE_WIDTH + 3 : STROKE_WIDTH}
                      strokeDasharray={`${arc.dash} ${CIRCUMFERENCE}`}
                      strokeDashoffset={-arc.offset}
                      strokeLinecap="butt"
                      className="cursor-pointer transition-all duration-200"
                      style={{ opacity: isDimmed ? 0.35 : 1 }}
                      onMouseEnter={() => setHoveredLabel(arc.label)}
                      onMouseLeave={() => setHoveredLabel(null)}
                    >
                      <title>{`${arc.label}: ${toNepaliDigits(arc.count)} (${toNepaliDigits(arc.share)}%)`}</title>
                    </circle>
                  );
                })}
              </svg>

              <div className="pointer-events-none absolute inset-5 flex flex-col items-center justify-center rounded-full bg-card px-2 text-center">
                {hoveredSegment ? (
                  <>
                    <p className="max-w-full truncate text-[10px] font-medium text-muted-foreground">
                      {hoveredSegment.label}
                    </p>
                    <p className="mt-0.5 text-xl font-bold leading-none tabular-nums text-foreground">
                      {toNepaliDigits(hoveredSegment.count)}
                    </p>
                    <span
                      className="mt-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums text-white"
                      style={{ backgroundColor: hoveredSegment.color }}
                    >
                      {toNepaliDigits(hoveredSegment.share)}%
                    </span>
                  </>
                ) : (
                  <>
                    <p className="text-[11px] font-medium text-muted-foreground">कुल सवारी</p>
                    <p className="mt-0.5 text-2xl font-bold leading-none tabular-nums text-foreground">
                      {toNepaliDigits(totalCount)}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {toNepaliDigits(fullList.length)} प्रकार
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          <ul className={`space-y-2 ${expanded ? 'max-h-60 overflow-y-auto pr-1' : ''}`}>
            {visibleList.map((vehicle) => {
              const isHovered = hoveredLabel === vehicle.label;
              return (
                <li
                  key={vehicle.label}
                  onMouseEnter={() => setHoveredLabel(vehicle.label)}
                  onMouseLeave={() => setHoveredLabel(null)}
                  className={`rounded-lg border px-2.5 py-2 transition-colors ${
                    isHovered
                      ? 'border-primary/30 bg-primary/[0.04]'
                      : 'border-border/60 bg-muted/20 hover:bg-muted/35'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: vehicle.color }}
                      />
                      <span className="truncate font-medium text-foreground" title={vehicle.label}>
                        {vehicle.label}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 tabular-nums">
                      <span className="rounded bg-card px-1.5 py-0.5 text-[11px] font-semibold text-foreground ring-1 ring-border/70">
                        {toNepaliDigits(vehicle.count)}
                      </span>
                      <span className="w-9 text-right text-[11px] font-medium text-muted-foreground">
                        {toNepaliDigits(vehicle.share)}%
                      </span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.max(2, Math.min(100, vehicle.share))}%`,
                        backgroundColor: vehicle.color,
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>

          {canExpand ? (
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="mt-auto inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border/80 bg-muted/30 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/60"
            >
              {expanded ? (
                <>
                  <ChevronUp className="size-3.5" aria-hidden="true" />
                  संक्षिप्त हेर्नुहोस्
                </>
              ) : (
                <>
                  <ChevronDown className="size-3.5" aria-hidden="true" />
                  सबै {toNepaliDigits(fullList.length)} प्रकार हेर्नुहोस्
                </>
              )}
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}
