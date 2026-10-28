'use client';

import { useEffect, useState } from 'react';
import {
  DEFAULT_MEMBER_COLUMNS,
  MEMBER_COLUMN_OPTIONS,
  REQUIRED_MEMBER_COLUMNS,
  type MemberColumnId,
} from '@/features/members/utils/member-table-columns';

const PREFERENCE_KEY = 'billing.members.visible-columns.v1';

function validColumns(value: unknown): MemberColumnId[] | null {
  if (!Array.isArray(value)) return null;
  const validIds = new Set<string>(MEMBER_COLUMN_OPTIONS.map((column) => column.id));
  const selected = value.filter((item): item is MemberColumnId => typeof item === 'string' && validIds.has(item));
  if (!REQUIRED_MEMBER_COLUMNS.every((id) => selected.includes(id))) return null;
  return Array.from(new Set(selected));
}

export function useMemberColumns() {
  const [visibleColumns, setVisibleColumns] = useState<MemberColumnId[]>(DEFAULT_MEMBER_COLUMNS);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(PREFERENCE_KEY);
        if (stored) {
          const parsed = validColumns(JSON.parse(stored) as unknown);
          if (parsed) setVisibleColumns(parsed);
        }
      } catch {
        window.localStorage.removeItem(PREFERENCE_KEY);
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const applyColumns = (columns: MemberColumnId[]) => {
    const valid = validColumns(columns);
    if (!valid) return;
    setVisibleColumns(valid);
    try {
      window.localStorage.setItem(PREFERENCE_KEY, JSON.stringify(valid));
    } catch {
      // Keep the applied columns for this session if storage is unavailable.
    }
  };

  return { visibleColumns, applyColumns };
}
