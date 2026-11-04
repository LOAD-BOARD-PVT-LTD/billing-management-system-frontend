import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_NOTIFICATION_SETTINGS,
  validateNotificationSettings,
} from '@/features/notifications/api/notification-settings.api';

test('notification settings validation accepts the default template and rule configuration', () => {
  assert.deepEqual(
    validateNotificationSettings(DEFAULT_NOTIFICATION_SETTINGS),
    DEFAULT_NOTIFICATION_SETTINGS,
  );
});

test('notification settings validation rejects duplicate template identifiers', () => {
  const settings = {
    templates: [
      ...DEFAULT_NOTIFICATION_SETTINGS.templates,
      { ...DEFAULT_NOTIFICATION_SETTINGS.templates[0], name: 'अर्को टेम्प्लेट' },
    ],
    automationRules: DEFAULT_NOTIFICATION_SETTINGS.automationRules,
  };

  assert.throws(
    () => validateNotificationSettings(settings),
    /टेम्प्लेट पहिचान दोहोरिएको/u,
  );
});

test('notification settings validation rejects malformed channels and empty template lists', () => {
  const invalidChannel = {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    templates: [
      { ...DEFAULT_NOTIFICATION_SETTINGS.templates[0], channel: 'Unknown' },
    ],
  };

  assert.throws(
    () => validateNotificationSettings(invalidChannel),
    /टेम्प्लेटको सुरक्षित गरिएको विवरण अमान्य/u,
  );
  assert.throws(
    () => validateNotificationSettings({ templates: [], automationRules: [] }),
    /कम्तीमा एउटा सूचना टेम्प्लेट/u,
  );
});
