'use client';

import { DataTableToolbar } from '@/components/data-tables/DataTableToolbar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { t } from '@/utils/translations';

export function UserFilters({
  search,
  role,
  roles,
  onSearchChange,
  onRoleChange,
}: {
  search: string;
  role: string;
  roles: string[];
  onSearchChange: (value: string) => void;
  onRoleChange: (value: string) => void;
}) {
  return (
    <DataTableToolbar
      searchValue={search}
      onSearchChange={onSearchChange}
      searchPlaceholder={t('users.searchPlaceholder')}
      className="items-stretch"
    >
      <Select value={role} onValueChange={onRoleChange}>
        <SelectTrigger className="w-full sm:w-48" aria-label={t('users.fields.role')}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('users.filterAllRoles')}</SelectItem>
          {roles.map((value) => (
            <SelectItem key={value} value={value}>{value}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </DataTableToolbar>
  );
}
