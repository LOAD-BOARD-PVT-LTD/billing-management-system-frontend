export function createDocumentFilename(name: string, extension: 'pdf' | 'xlsx' | 'html' = 'pdf'): string {
  const safeName = name
    .normalize('NFKC')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/gu, '-')
    .replace(/\s+/gu, '-')
    .replace(/-+/gu, '-')
    .replace(/^-|-$/gu, '')
    .slice(0, 100);
  return `${safeName || 'document'}.${extension}`;
}
