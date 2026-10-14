'use client';

import { Eye, Pencil } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/components/data-tables/DataTable';
import { TableActionIconButton } from '@/components/ui/table-action-icon-button';
import { UserStatusBadge } from './UserStatusBadge';
import type { UserRecord } from '../types/user.types';
import { t } from '@/utils/translations';

export function UsersTable({
  users,
  isLoading,
  onView,
  onEdit,
}: {
  users: UserRecord[];
  isLoading: boolean;
  onView: (user: UserRecord) => void;
  onEdit: (user: UserRecord) => void;
}) {
  const columns: DataTableColumn<UserRecord>[] = [
    {
      id: 'name',
      header: t('users.table.name'),
      cell: (user) => <span className="font-medium">{user.name || '—'}</span>,
    },
    {
      id: 'email',
      header: t('users.table.email'),
      cell: (user) => <span className="break-all font-medium">{user.email}</span>,
    },
    {
      id: 'role',
      header: t('users.table.role'),
      cell: (user) => <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{user.role}</span>,
    },
    {
      id: 'branch',
      header: t('users.table.branch'),
      cell: (user) => (
        <div>
          <span className="font-medium">{user.branchName || (user.branchId ? `ID: ${user.branchId}` : '—')}</span>
          {user.branchName && user.branchId ? <span className="block text-xs text-muted-foreground">ID: {user.branchId}</span> : null}
        </div>
      ),
    },
    {
      id: 'status',
      header: t('users.table.status'),
      cell: (user) => <UserStatusBadge status={user.status} />,
    },
    {
      id: 'actions',
      header: <span className="sr-only">{t('users.table.actions')}</span>,
      headerClassName: 'w-20',
      cell: (user) => (
        <div className="flex justify-end">
          <TableActionIconButton
            aria-label={`${t('users.edit')}: ${user.email}`}
            title={t('users.edit')}
            onClick={() => onEdit(user)}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </TableActionIconButton>
          <TableActionIconButton
            aria-label={`${t('users.viewDetails')}: ${user.email}`}
            title={t('users.viewDetails')}
            onClick={() => onView(user)}
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
          </TableActionIconButton>
        </div>
      ),
    },
  ];

  return (
    <div className="overflow-x-auto">
      <DataTable
        columns={columns}
        data={users}
        getRowId={(user) => user.id}
        isLoading={isLoading}
        loadingLabel={t('system.loading')}
        ariaLabel={t('users.title')}
        emptyState={{
          title: t('users.none'),
          description: t('users.noResultsWithFilters'),
        }}
      />
    </div>
  );
}
