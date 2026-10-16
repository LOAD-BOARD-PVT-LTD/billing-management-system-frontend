export function normalizeBillingEntityKey(value: string | null | undefined): string {
  return (value ?? '').trim().replace(/\s+/gu, ' ').toLowerCase();
}
