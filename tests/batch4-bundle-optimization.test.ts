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

	it('confirms member registry PDF export uses the shared document generator', () => {
		const registryPagePath = join(process.cwd(), 'features', 'vehicle', 'tqms', 'components', 'TqmsMemberRegistryPage.tsx');
		const registryPageContent = readFileSync(registryPagePath, 'utf8');

		assert.ok(registryPageContent.includes('renderPdfPages(elements'), 'PDF export should use the shared PDF renderer page by page');
		assert.ok(registryPageContent.includes('downloadDocument(url'), 'PDF export should download through the shared document helper');
		assert.ok(registryPageContent.includes('PDF_ROWS_PER_PAGE = 30'), 'PDF export should limit each capture to a manageable page size');
		assert.ok(registryPageContent.includes('data-tqms-pdf-page'), 'PDF export should render each page as a separate document element');
		assert.ok(!registryPageContent.includes('window.open('), 'PDF export should not open a browser print window');
		assert.ok(!registryPageContent.includes('printWindow.print()'), 'PDF export should not use browser printing');

		const rendererPath = join(process.cwd(), 'shared', 'document-generation', 'renderers', 'pdf.renderer.ts');
		const rendererContent = readFileSync(rendererPath, 'utf8');
		assert.ok(rendererContent.includes("querySelector<HTMLElement>('[data-pdf-render-root]')"), 'shared renderer should find explicitly marked off-screen export content');
		assert.ok(rendererContent.includes("setProperty('left', '0')"), 'shared renderer should reposition off-screen export content for capture');
	});
});
