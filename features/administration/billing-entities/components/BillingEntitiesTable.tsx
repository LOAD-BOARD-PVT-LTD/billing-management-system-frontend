'use client';

import { PencilLine } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { BillingEntityRecord, BillingEntityStatus } from '../types/billing-entity.types';

export function BillingEntitiesTable({
  rows,
  onEdit,
  onStatusChange,
  isSaving,
}: {
  rows: BillingEntityRecord[];
  onEdit: (record: BillingEntityRecord) => void;
  onStatusChange: (record: BillingEntityRecord, status: BillingEntityStatus) => void;
  isSaving: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Entity</TableHead>
            <TableHead>Registration / PAN</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-16 text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((record) => (
            <TableRow key={record.id} zebra>
              <TableCell>
                <div className="font-medium text-foreground">{record.entity}</div>
                <div className="text-xs text-muted-foreground">{record.email}</div>
              </TableCell>
              <TableCell>
                <div>{record.registrationNumber}</div>
                <div className="text-xs text-muted-foreground">PAN: {record.panNumber}</div>
              </TableCell>
              <TableCell>
                <div>{record.contactPerson}</div>
                <div className="text-xs text-muted-foreground">{record.phoneNumber}</div>
              </TableCell>
              <TableCell className="max-w-52 whitespace-normal">{record.address}</TableCell>
              <TableCell>
                <Select
                  value={record.status}
                  disabled={isSaving}
                  onValueChange={(value) => onStatusChange(
                    record,
                    value === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
                  )}
                >
                  <SelectTrigger
                    aria-label={`Change ${record.entity} status`}
                    className="h-8 w-32 border-0 p-0 shadow-none focus:ring-0"
                  >
                    <Badge variant={record.status === 'ACTIVE' ? 'success' : 'secondary'}>
                      <SelectValue />
                    </Badge>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit ${record.entity}`}
                    onClick={() => onEdit(record)}
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
