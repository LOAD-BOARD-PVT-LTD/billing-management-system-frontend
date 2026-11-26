import assert from 'node:assert/strict';
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

export function renderComponentHtml(element: ReactElement): string {
  return renderToStaticMarkup(element);
}

export function assertContainsText(
  html: string,
  expected: string,
  message?: string,
): void {
  assert.ok(
    html.includes(expected),
    message ?? `Expected rendered HTML to include "${expected}"`,
  );
}

export function assertExcludesText(
  html: string,
  unexpected: string,
  message?: string,
): void {
  assert.ok(
    !html.includes(unexpected),
    message ?? `Expected rendered HTML NOT to include "${unexpected}"`,
  );
}
