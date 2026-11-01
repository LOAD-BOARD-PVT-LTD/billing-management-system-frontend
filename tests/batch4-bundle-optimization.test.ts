import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Batch 4: Bundle Optimization & Dependency Cleanup', () => {
	it('confirms unused heavy dependencies have been removed from package.json', () => {
		const packageJsonPath = join(process.cwd(), 'package.json');
		const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
		const deps = packageJson.dependencies ?? {};

		assert.strictEqual(deps['html-to-image'], undefined, 'html-to-image should not be in dependencies');
		assert.strictEqual(deps['next-auth'], undefined, 'next-auth should not be in dependencies');
		assert.strictEqual(deps['regenerator-runtime'], undefined, 'regenerator-runtime should not be in dependencies');
	});

	it('confirms regenerator-runtime is not imported in receipt service or member registry', () => {
		const receiptServicePath = join(process.cwd(), 'features', 'receipts', 'services', 'receipt-document.service.ts');
		const registryPagePath = join(process.cwd(), 'features', 'vehicle', 'tqms', 'components', 'TqmsMemberRegistryPage.tsx');

		const receiptServiceContent = readFileSync(receiptServicePath, 'utf8');
		const registryPageContent = readFileSync(registryPagePath, 'utf8');

		assert.ok(!receiptServiceContent.includes('regenerator-runtime'), 'receipt service should not import regenerator-runtime');
		assert.ok(!registryPageContent.includes('regenerator-runtime'), 'member registry should not import regenerator-runtime');
	});

	it('confirms pdf-lib is dynamically imported inside member registry export handler', () => {
		const registryPagePath = join(process.cwd(), 'features', 'vehicle', 'tqms', 'components', 'TqmsMemberRegistryPage.tsx');
		const registryPageContent = readFileSync(registryPagePath, 'utf8');

		// Top-level imports should only be type imports
		assert.ok(
			!registryPageContent.includes("import fontkit from '@pdf-lib/fontkit'"),
			'fontkit should not be statically imported at the top level',
		);
		assert.ok(
			!registryPageContent.includes("import { PDFDocument"),
			'PDFDocument should not be statically imported at the top level',
		);

		// Dynamic imports must be present inside the handler
		assert.ok(
			registryPageContent.includes("import('pdf-lib')"),
			'pdf-lib must be dynamically imported on demand',
		);
		assert.ok(
			registryPageContent.includes("import('@pdf-lib/fontkit')"),
			'@pdf-lib/fontkit must be dynamically imported on demand',
		);
	});
});

