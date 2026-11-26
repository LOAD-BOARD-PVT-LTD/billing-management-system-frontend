import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';

import { MahasangReportSettingsControl } from '@/features/settings/components/MahasangReportSettingsControl';
import {
  DEFAULT_MAHASANG_REPORT_SETTINGS,
  fetchMahasangReportSettings,
  normalizeMahasangReportSettings,
  resolveDefaultMahasangVehicleTypes,
  saveMahasangReportSettings,
} from '@/features/settings/api/mahasang-report-settings.api';
import { createQueryClient } from '@/lib/query/query-client';
import { settingsKeys, vehicleResourceKeys, vehicleTypeKeys } from '@/lib/query/query-keys';
import { mockApiClient } from '@/tests/helpers/api-mock';
import { assertContainsText, renderComponentHtml } from '@/tests/helpers/ui-test-utils';

describe('Mahasang Report Settings (Admin Default Vehicle Type Groups)', () => {
  let restoreApi: (() => void) | null = null;

  afterEach(() => {
    restoreApi?.();
    restoreApi = null;
  });

  it('falls back safely to empty defaults when SettingResource is 404 or empty', async () => {
    const mock = mockApiClient({
      get: async () => {
        throw new Error('Request failed (404): No resources found for search query');
      },
    });
    restoreApi = mock.restore;

    const doc = await fetchMahasangReportSettings();
    assert.equal(doc.resourceId, null);
    assert.deepEqual(doc.settings, DEFAULT_MAHASANG_REPORT_SETTINGS);
    assert.deepEqual(resolveDefaultMahasangVehicleTypes(doc.settings), []);
  });

  it('saves vehicle type groups and default group inside grouped SettingResource while preserving sibling settings', async () => {
    let capturedBody: Record<string, unknown> | undefined;
    const mock = mockApiClient({
      get: async <T>(): Promise<T> => ([{
        id: 1,
        resource_name: 'SettingResource',
        inner_content: {
          schemaVersion: 1,
          integrations: { tqms: { SanghBranch: 'Narayani Sangh' } },
          billing: { vat: { enabled: true, rate: 13, billingEntityIds: ['1'] } },
          reports: {
            mahasang: {
              defaultGroupId: 'grp-heavy',
              defaultVehicleTypes: ['Bus'],
              vehicleTypeGroups: [
                { id: 'grp-heavy', name: 'भारी सवारी', vehicleTypes: ['Truck', 'Tipper', 'truck'] },
              ],
            },
          },
        },
      }] as T),
      put: async <T>(_path: string, body?: unknown): Promise<T> => {
        capturedBody = body as Record<string, unknown>;
        return undefined as T;
      },
    });
    restoreApi = mock.restore;

    const fetched = await fetchMahasangReportSettings();
    assert.equal(fetched.resourceId, '1');
    assert.equal(fetched.settings.defaultGroupId, 'grp-heavy');
    assert.deepEqual(fetched.settings.vehicleTypeGroups[0].vehicleTypes, ['Truck', 'Tipper']);
    assert.deepEqual(resolveDefaultMahasangVehicleTypes(fetched.settings), ['Truck', 'Tipper']);

    const saved = await saveMahasangReportSettings({
      defaultGroupId: 'grp-container',
      defaultVehicleTypes: ['Mini Truck'],
      vehicleTypeGroups: [
        ...fetched.settings.vehicleTypeGroups,
        { id: 'grp-container', name: 'कन्टेनर समूह', vehicleTypes: ['Container 10 Wheeler', 'Container 6 Wheeler'] },
      ],
    }, fetched);

    assert.equal(saved.settings.defaultGroupId, 'grp-container');
    assert.deepEqual(resolveDefaultMahasangVehicleTypes(saved.settings), ['Container 10 Wheeler', 'Container 6 Wheeler']);

    const inner = capturedBody?.inner_content as Record<string, unknown>;
    assert.equal(((inner.integrations as Record<string, unknown>).tqms as Record<string, unknown>).SanghBranch, 'Narayani Sangh');
    assert.equal((((inner.billing as Record<string, unknown>).vat) as Record<string, unknown>).rate, 13);
    const savedMahasang = ((inner.reports as Record<string, unknown>).mahasang) as Record<string, unknown>;
    assert.equal(savedMahasang.defaultGroupId, 'grp-container');
  });

  it('rejects empty or duplicate vehicle type group names on save', async () => {
    await assert.rejects(
      saveMahasangReportSettings({
        defaultGroupId: '',
        defaultVehicleTypes: [],
        vehicleTypeGroups: [{ id: 'g1', name: '   ', vehicleTypes: ['Truck'] }],
      }, { resourceId: '1', settings: DEFAULT_MAHASANG_REPORT_SETTINGS }),
      /अनिवार्य छ/,
    );

    await assert.rejects(
      saveMahasangReportSettings({
        defaultGroupId: '',
        defaultVehicleTypes: [],
        vehicleTypeGroups: [
          { id: 'g1', name: 'Heavy', vehicleTypes: ['Truck'] },
          { id: 'g2', name: 'heavy ', vehicleTypes: ['Tipper'] },
        ],
      }, { resourceId: '1', settings: DEFAULT_MAHASANG_REPORT_SETTINGS }),
      /पहिले नै छ/,
    );
  });

  it('resolves manual defaultVehicleTypes when defaultGroupId is blank or no longer exists', () => {
    const normalized = normalizeMahasangReportSettings({
      defaultGroupId: 'missing-id',
      defaultVehicleTypes: ['Bus', 'bus', 'Mini Bus'],
      vehicleTypeGroups: [],
    });
    assert.equal(normalized.defaultGroupId, '');
    assert.deepEqual(resolveDefaultMahasangVehicleTypes(normalized), ['Bus', 'Mini Bus']);
  });

  it('renders MahasangReportSettingsControl as a compact summary card without dumping an inline checklist', () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(settingsKeys.mahasangReport(), {
      resourceId: '1',
      settings: {
        defaultGroupId: 'grp-heavy',
        defaultVehicleTypes: [],
        vehicleTypeGroups: [
          {
            id: 'grp-heavy',
            name: 'भारी सवारी',
            vehicleTypes: ['Truck', 'Tipper', 'Container', 'Trailer', 'Tanker', 'Crane', 'Bulldozer'],
          },
        ],
      },
    });
    queryClient.setQueryData(vehicleTypeKeys.lists(), []);
    queryClient.setQueryData(vehicleResourceKeys.memberVehicleList('mahasang-settings'), []);

    const html = renderComponentHtml(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(MahasangReportSettingsControl),
      ),
    );

    assertContainsText(html, 'महासंघ रिपोर्ट सवारी प्रकार');
    assertContainsText(html, 'डिफल्ट: भारी सवारी (७)');
    assertContainsText(html, 'सवारी प्रकार सम्पादन (७)');
    assertContainsText(html, 'नयाँ समूह');
    assertContainsText(html, '+१ थप');
    assert.equal(html.includes('Bulldozer'), false);
  });
});
