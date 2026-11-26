import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  assertNoForbiddenPatterns,
  readPackageJson,
  readWorkspaceFile,
} from '@/tests/helpers/source-assertions';

const CENTRALIZED_EXPORT_CONSUMERS = [
  ['features', 'vehicle', 'tqms', 'components', 'TqmsMemberRegistryPage.tsx'],
  ['features', 'vehicle', 'tqms', 'components', 'TqmsOwnerDirectoryPage.tsx'],
  ['features', 'vehicle', 'compliance', 'components', 'VehicleCompliancePage.tsx'],
  ['features', 'vehicle', 'blacklist', 'utils', 'vehicle-blacklist-export.ts'],
  ['features', 'members', 'utils', 'export-members.ts'],
  ['features', 'receipts', 'components', 'ReceiptList.tsx'],
  ['features', 'reports', 'components', 'FeeHeadWiseReportPage.tsx'],
  ['features', 'reports', 'components', 'IncomeReportPage.tsx'],
  ['features', 'reports', 'components', 'MahasangReportPage.tsx'],
  ['features', 'reports', 'components', 'MemberTransactionReportPage.tsx'],
  ['features', 'reports', 'components', 'VehicleCategoryReportPage.tsx'],
] as const;

describe('Batch 4: Bundle Optimization & Dependency Cleanup', () => {
  it('confirms unused heavy dependencies have been removed from package.json', () => {
    const packageJson = readPackageJson();
    const deps = packageJson.dependencies ?? {};

    assert.strictEqual(deps['html-to-image'], undefined, 'html-to-image should not be in dependencies');
    assert.strictEqual(deps['next-auth'], undefined, 'next-auth should not be in dependencies');
    assert.strictEqual(deps['regenerator-runtime'], undefined, 'regenerator-runtime should not be in dependencies');
  });

  it('confirms regenerator-runtime is not imported in receipt service or member registry', () => {
    const receiptServiceContent = readWorkspaceFile('features', 'receipts', 'services', 'receipt-document.service.ts');
    const registryPageContent = readWorkspaceFile('features', 'vehicle', 'tqms', 'components', 'TqmsMemberRegistryPage.tsx');

    assertNoForbiddenPatterns(receiptServiceContent, ['regenerator-runtime'], 'receipt service');
    assertNoForbiddenPatterns(registryPageContent, ['regenerator-runtime'], 'member registry');
  });

  it('confirms member registry PDF and Excel export uses the shared report export engine', () => {
    const registryPageContent = readWorkspaceFile('features', 'vehicle', 'tqms', 'components', 'TqmsMemberRegistryPage.tsx');

    assert.ok(registryPageContent.includes("from '@/shared/report-export'"), 'member registry should import from shared report export');
    assert.ok(registryPageContent.includes('exportReportPdf('), 'PDF export should use the centralized exportReportPdf helper');
    assert.ok(registryPageContent.includes('exportReportExcel('), 'Excel export should use the centralized exportReportExcel helper');
    assertNoForbiddenPatterns(registryPageContent, ['window.open(', 'printWindow.print()'], 'member registry');

    const rendererContent = readWorkspaceFile('shared', 'document-generation', 'renderers', 'pdf.renderer.ts');
    assert.ok(rendererContent.includes("querySelector<HTMLElement>('[data-pdf-render-root]')"), 'shared renderer should find explicitly marked off-screen export content');
    assert.ok(rendererContent.includes("setProperty('left', '0')"), 'shared renderer should reposition off-screen export content for capture');
  });

  it('confirms all report and list exporters route through shared/report-export without window.open print hacks', () => {
    for (const segments of CENTRALIZED_EXPORT_CONSUMERS) {
      const content = readWorkspaceFile(...segments);
      const label = segments.join('/');
      assert.ok(
        content.includes("from '@/shared/report-export'"),
        `${label} should import from @/shared/report-export`,
      );
      assertNoForbiddenPatterns(content, ['window.open(', 'printWindow.print()'], label);
    }
  });
});
