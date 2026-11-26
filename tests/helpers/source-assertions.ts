import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export function readWorkspaceFile(...segments: string[]): string {
  return readFileSync(join(process.cwd(), ...segments), 'utf8');
}

export function readPackageJson(): {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
} {
  return JSON.parse(readWorkspaceFile('package.json')) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    scripts?: Record<string, string>;
  };
}

export function assertNoForbiddenPatterns(
  content: string,
  forbidden: readonly string[],
  context: string,
): void {
  for (const pattern of forbidden) {
    assert.ok(
      !content.includes(pattern),
      `${context} must not contain forbidden pattern "${pattern}"`,
    );
  }
}
