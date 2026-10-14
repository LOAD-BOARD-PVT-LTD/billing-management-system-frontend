'use client';

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
import type { VehicleTypeRecord } from '@/features/vehicle/type/types/vehicle-type.types';
import { ArrowRightLeft, CarFront, PencilLine } from 'lucide-react';

export function VehicleTypeTable({
  rows,
  onEdit,
  onMoveVehicleType,
}: {
  rows: VehicleTypeRecord[];
  onEdit: (record: VehicleTypeRecord) => void;
  onMoveVehicleType: (record: VehicleTypeRecord, vehicleType: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">क्र.सं.</TableHead>
            <TableHead>सवारी श्रेणी</TableHead>
            <TableHead>सवारी प्रकार</TableHead>
            <TableHead className="w-20 text-right">कार्य</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={row.id} zebra>
              <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                    <CarFront className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">{row.category}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-2">
                  {row.vehicleTypes.map((type) => (
                    <span key={`${row.id}-${type}`} className="inline-flex items-center gap-0.5">
                      <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-[11px]">
                        {type}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                        aria-label={`Move ${type} to another category`}
                        title="Move vehicle type to another category"
                        onClick={() => onMoveVehicleType(row, type)}
                      >
                        <ArrowRightLeft className="h-3.5 w-3.5" />
                      </Button>
                    </span>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit ${row.category}`}
                    className="text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                    onClick={() => onEdit(row)}
                  >
                    <PencilLine className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
