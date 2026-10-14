function normalizeInvoiceId(value: string): string {
  return value.trim();
}

export function parsePreviewInvoiceIds(currentInvoiceId: string, rawIds: string | null | undefined): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  const source = [currentInvoiceId, ...(rawIds ? rawIds.split(',') : [])];

  for (const token of source) {
    const normalized = normalizeInvoiceId(token);
    if (!normalized) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    ids.push(normalized);
  }

  return ids;
}
