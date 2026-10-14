'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UserStatusBadge } from './UserStatusBadge';
import type { UserRecord } from '../types/user.types';
import { t } from '@/utils/translations';

export function UserDetails({
  user,
  open,
  onOpenChange,
}: {
  user: UserRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('users.detailsTitle')}</DialogTitle>
          <DialogDescription>{t('users.detailsDescription')}</DialogDescription>
        </DialogHeader>
        {user && (
          <dl className="grid gap-4 rounded-lg border border-border p-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">{t('users.fields.name')}</dt>
              <dd className="mt-1 text-sm font-medium">{user.name || '—'}</dd>
            </div>
            <div className="min-w-0 sm:col-span-2">
              <dt className="text-xs text-muted-foreground">{t('users.fields.email')}</dt>
              <dd className="mt-1 break-all text-sm font-medium">{user.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t('users.fields.role')}</dt>
              <dd className="mt-1 text-sm font-medium">{user.role}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t('users.fields.branch')}</dt>
              <dd className="mt-1 text-sm font-medium">{user.branchName || (user.branchId ? `ID: ${user.branchId}` : '—')}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t('users.fields.branchId')}</dt>
              <dd className="mt-1 text-sm font-medium">{user.branchId ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t('users.id')}</dt>
              <dd className="mt-1 font-mono text-sm">{user.id}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">{t('users.table.status')}</dt>
              <dd className="mt-1"><UserStatusBadge status={user.status} /></dd>
            </div>
          </dl>
        )}
      </DialogContent>
    </Dialog>
  );
}
