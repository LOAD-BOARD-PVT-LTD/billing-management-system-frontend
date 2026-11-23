'use client';

import { ArrowRightLeft, CarFront, PencilLine } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { VehicleTypeRecord } from '@/features/vehicle/type/types/vehicle-type.types';
import { toNepaliDigits } from '@/utils/numbers';

export function VehicleTypeTable({
  rows,
  canMoveBetweenCategories = true,
  onEdit,
  onMoveVehicleType,
}: {
  rows: VehicleTypeRecord[];
  canMoveBetweenCategories?: boolean;
  onEdit: (record: VehicleTypeRecord) => void;
  onMoveVehicleType: (record: VehicleTypeRecord, vehicleType: string) => void;
}) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="overflow-x-auto rounded-xl border border-border/80 bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="w-14 text-center">क्र.सं.</TableHead>
              <TableHead className="min-w-48">बिलिङ सवारी श्रेणी</TableHead>
              <TableHead className="min-w-72">जोडिएका TQMS सवारी प्रकार</TableHead>
              <TableHead className="w-32 text-right">कार्य</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={row.id} zebra>
                <TableCell className="text-center font-medium text-muted-foreground tabular-nums">
                  {toNepaliDigits(index + 1)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <CarFront className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{row.category}</p>
                      <p className="text-xs text-muted-foreground">
                        {toNepaliDigits(row.vehicleTypes.length)} TQMS प्रकार जोडिएको
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {row.vehicleTypes.length === 0 ? (
                    <span className="text-xs italic text-muted-foreground">कुनै TQMS प्रकार जोडिएको छैन</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {row.vehicleTypes.map((type) => (
                        <span
                          key={`${row.id}-${type}`}
                          className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-muted/40 py-0.5 pl-2.5 pr-1 text-xs font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-primary/5"
                        >
                          <span>{type}</span>
                          {canMoveBetweenCategories ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => onMoveVehicleType(row, type)}
                                  aria-label={`${type} अर्को श्रेणीमा सार्नुहोस्`}
                                  className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-primary/15 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                  <ArrowRightLeft className="h-3 w-3" aria-hidden="true" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top">अर्को श्रेणीमा सार्नुहोस्</TooltipContent>
                            </Tooltip>
                          ) : (
                            <Badge variant="secondary" className="hidden" />
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      aria-label={`${row.category} सम्पादन गर्नुहोस्`}
                      className="h-8 gap-1.5"
                      onClick={() => onEdit(row)}
                    >
                      <PencilLine className="h-3.5 w-3.5" aria-hidden="true" />
                      सम्पादन
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
