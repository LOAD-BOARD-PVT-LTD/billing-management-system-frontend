export function getReceiptBillIdSortValue(
  receiptId: string | null | undefined,
  receiptNumber: string | null | undefined,
): bigint | null {
  const candidates = [receiptId, receiptNumber];
  for (const candidate of candidates) {
    const normalized = String(candidate ?? '')
      .trim()
      .replace(/[०-९]/gu, (digit) => String('०१२३४५६७८९'.indexOf(digit)));
    const match = /(\d+)\s*$/u.exec(normalized);
    if (match) {
      try {
        return BigInt(match[1]);
      } catch {
        continue;
      }
    }
  }
  return null;
}
