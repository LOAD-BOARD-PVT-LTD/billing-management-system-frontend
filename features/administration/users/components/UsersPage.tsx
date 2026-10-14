'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, Plus, RefreshCw, Users, X } from 'lucide-react';
import { DataTablePagination } from '@/components/data-tables/DataTablePagination';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useUsers } from '../hooks/useUsers';
import { useBranches } from '@/features/administration/branches/hooks/useBranches';
import type { UserFields, UserRecord } from '../types/user.types';
import { UserForm } from './UserForm';
import { UserDetails } from './UserDetails';
import { UserFilters } from './UserFilters';
import { UsersTable } from './UsersTable';
import { t, useTranslations } from '@/utils/translations';

const PAGE_SIZE = 10;

export function UsersPage() {
  const { t: translate } = useTranslations();
  const { records, isLoading, isCreating, isUpdating, error, create, update, reload } = useUsers();
  const { records: branches, isLoading: isLoadingBranches, loadError: branchesError } = useBranches();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);

  const usersWithBranch = useMemo(() => records.map((user) => {
    const assignedBranch = user.branchId
      ? branches.find((branch) => String(branch.id) === String(user.branchId))
      : undefined;
    return { ...user, branchName: assignedBranch?.name ?? null };
  }), [branches, records]);

  const roles = useMemo(
    () => Array.from(new Set(usersWithBranch.map((user) => user.role))).sort((a, b) => a.localeCompare(b)),
    [usersWithBranch],
  );
  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return usersWithBranch.filter((user) => (
      (!query || `${user.name} ${user.email} ${user.role} ${user.branchName ?? ''} ${user.branchId ?? ''} ${user.id}`.toLowerCase().includes(query))
      && (role === 'all' || user.role === role)
    ));
  }, [usersWithBranch, role, search]);

  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageUsers = filteredUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };
  const handleRoleChange = (value: string) => {
    setRole(value);
    setPage(1);
  };
  const handleCreate = async (fields: UserFields) => {
    await create(fields);
    setCreateOpen(false);
    toast({ title: t('users.toast.createdTitle'), description: fields.email });
  };
  const handleUpdate = async (fields: Parameters<typeof update>[1]) => {
    if (!editingUser) throw new Error(t('users.updateFailed'));
    await update(editingUser.id, fields);
    setEditingUser(null);
    toast({ title: t('users.toast.updatedTitle'), description: fields.email });
  };
  const openCreateForm = () => {
    if (createOpen || editingUser) {
      closeForm();
      return;
    }
    setCreateOpen(true);
  };
  const openEditForm = (user: UserRecord) => {
    setCreateOpen(false);
    setEditingUser(user);
  };
  const closeForm = () => {
    setCreateOpen(false);
    setEditingUser(null);
  };

  return (
    <section className="mx-auto w-full max-w-7xl space-y-5 pb-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Users className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t('users.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('users.description')}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => void reload()} disabled={isLoading}>
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            {t('users.refresh')}
          </Button>
          <Button
            type="button"
            variant={createOpen || editingUser ? 'outline' : 'default'}
            onClick={openCreateForm}
          >
            {createOpen || editingUser
              ? <X className="mr-2 h-4 w-4" aria-hidden="true" />
              : <Plus className="mr-2 h-4 w-4" aria-hidden="true" />}
            {createOpen || editingUser ? t('actions.cancel') : t('users.new')}
          </Button>
        </div>
      </header>

      {(createOpen || editingUser) && (
        <Card className="overflow-hidden">
          <div className="border-b border-border px-5 py-4 sm:px-6">
            <h2 className="font-semibold">{t(editingUser ? 'users.updateTitle' : 'users.createTitle')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t(editingUser ? 'users.updateDescription' : 'users.createDescription')}
            </p>
          </div>
          <UserForm
            key={editingUser?.id ?? 'create-user'}
            user={editingUser ?? undefined}
            isSaving={isCreating || isUpdating}
            branches={branches}
            isLoadingBranches={isLoadingBranches}
            branchesError={branchesError}
            onSubmit={handleCreate}
            onUpdate={handleUpdate}
            onCancel={closeForm}
          />
        </Card>
      )}

      <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
        {t('users.limitedActionsNote')}
      </p>

      {error && (
        <div className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between" role="alert">
          <p className="flex items-start gap-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => void reload()}>
            {t('users.retry')}
          </Button>
        </div>
      )}

      {branchesError && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="status">
          {t('users.branchLoadFailed')} ({branchesError})
        </div>
      )}

      <Card className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold">{t('users.listTitle')}</h2>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {translate('users.resultsSummary', { shown: filteredUsers.length, total: records.length })}
          </p>
        </div>
        <UserFilters
          search={search}
          role={role}
          roles={roles}
          onSearchChange={handleSearchChange}
          onRoleChange={handleRoleChange}
        />
        <UsersTable
          users={pageUsers}
          isLoading={isLoading || isLoadingBranches}
          onView={setSelectedUser}
          onEdit={openEditForm}
        />
        <DataTablePagination
          page={currentPage}
          pageSize={PAGE_SIZE}
          total={filteredUsers.length}
          onPageChange={setPage}
        />
      </Card>

      <UserDetails
        user={selectedUser}
        open={selectedUser !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedUser(null);
        }}
      />
    </section>
  );
}
