'use client';

import { useEffect, useState } from 'react';

import { DEFAULT_RECEIPT_COLUMNS, RECEIPT_COLUMN_OPTIONS, REQUIRED_RECEIPT_COLUMNS, type ReceiptColumnId } from '@/features/receipts/utils/receipt-table-columns';

const PREFERENCE_KEY = 'billing.receipts.visible-columns.v1';

function validColumns(value: unknown): ReceiptColumnId[] | null {
  if (!Array.isArray(value)) return null;
  const validIds = new Set<string>(RECEIPT_COLUMN_OPTIONS.map((column) => column.id));
  const selected = value.filter((item): item is ReceiptColumnId => typeof item === 'string' && validIds.has(item));
  if (!REQUIRED_RECEIPT_COLUMNS.every((id) => selected.includes(id))) return null;
  return Array.from(new Set(selected));
}

export function useReceiptColumns() {
  const [visibleColumns, setVisibleColumns] = useState<ReceiptColumnId[]>(DEFAULT_RECEIPT_COLUMNS);

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

  const applyColumns = (columns: ReceiptColumnId[]) => {
    const valid = validColumns(columns);
    if (!valid) return;
    setVisibleColumns(valid);
    try {
      window.localStorage.setItem(PREFERENCE_KEY, JSON.stringify(valid));
    } catch {
      // Keep the applied columns for this session if storage is unavailable.
    }
  };

  const resetColumns = () => applyColumns(DEFAULT_RECEIPT_COLUMNS);

  return { visibleColumns, applyColumns, resetColumns };
}