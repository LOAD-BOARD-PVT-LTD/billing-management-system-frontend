import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

export function renderHtmlDocument(content: ReactNode, title: string): string {
  return `<!doctype html><html lang="ne"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title></head><body>${renderToStaticMarkup(content)}</body></html>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/gu, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character);
}
