'use client';

import { MoreHorizontal, PencilLine, Eye, Users, Power } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { BranchRecord } from '../types/branch.types';

export function BranchesTable({
  rows,
  isSaving,
  onView,
  onEdit,
  onToggleStatus,
}: {
  rows: BranchRecord[];
  isSaving: boolean;
  onView: (record: BranchRecord) => void;
  onEdit: (record: BranchRecord) => void;
  onToggleStatus: (record: BranchRecord) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>शाखाको नाम</TableHead>
            <TableHead>शाखा कोड</TableHead>
            <TableHead>ठेगाना</TableHead>
            <TableHead>सम्पर्क</TableHead>
            <TableHead>सम्पर्क व्यक्ति</TableHead>
            <TableHead className="min-w-36">Manual Amount Override</TableHead>
            <TableHead>अवस्था</TableHead>
            <TableHead className="w-14 text-right">कार्य</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((branch) => (
            <TableRow key={branch.id} zebra>
              <TableCell className="font-medium">{branch.name}</TableCell>
              <TableCell><span className="rounded-md bg-muted px-2 py-1 font-mono text-xs">{branch.code}</span></TableCell>
              <TableCell className="max-w-48 whitespace-normal">{branch.address || '—'}</TableCell>
              <TableCell>{branch.phone || '—'}</TableCell>
              <TableCell>{branch.contactPerson || '—'}</TableCell>
              <TableCell>
                <Badge variant={branch.allowManualReceiptAmountOverride ? 'success' : 'secondary'}>
                  {branch.allowManualReceiptAmountOverride ? 'हो' : 'होइन'}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={branch.status === 'ACTIVE' ? 'success' : 'secondary'}>
                  {branch.status === 'ACTIVE' ? 'सञ्चालित' : 'निष्क्रिय'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label={`${branch.name} का लागि कार्यहरू`} disabled={isSaving}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => onView(branch)}><Eye className="mr-2 h-4 w-4" />विवरण हेर्नुहोस्</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => onEdit(branch)}><PencilLine className="mr-2 h-4 w-4" />शाखा सम्पादन</DropdownMenuItem>
                      <DropdownMenuItem disabled title="प्रयोगकर्ता व्यवस्थापन सुविधा उपलब्ध छैन">
                        <Users className="mr-2 h-4 w-4" />प्रयोगकर्ता व्यवस्थापन (छिट्टै)
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => onToggleStatus(branch)}>
                        <Power className="mr-2 h-4 w-4" />
                        {branch.status === 'ACTIVE' ? 'शाखा निष्क्रिय गर्नुहोस्' : 'शाखा सक्रिय गर्नुहोस्'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
