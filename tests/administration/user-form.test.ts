import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';

import type { BranchRecord } from '@/features/administration/branches/types/branch.types';
import {
  buildInitialUserFormValues,
  clearUserFormFieldError,
  getUserFormErrorMessages,
  UserForm,
} from '@/features/administration/users/components/UserForm';
import { userUpdateSchema } from '@/features/administration/users/schemas/user.schema';
import type { UserRecord } from '@/features/administration/users/types/user.types';
import { Role } from '@/types/auth';
import { readWorkspaceFile } from '@/tests/helpers/source-assertions';
import {
  assertContainsText,
  assertExcludesText,
  renderComponentHtml,
} from '@/tests/helpers/ui-test-utils';

const sampleBranches: BranchRecord[] = [
  {
    id: '10',
    name: 'मुख्य कार्यालय',
    code: 'MAIN',
    address: 'Hetauda',
    phone: '057-520000',
    contactPerson: 'Admin',
    billingEntityIds: [],
    allowManualReceiptAmountOverride: false,
    status: 'ACTIVE',
  },
];

describe('User form validation, role normalization, and modal popup', () => {
  it('clears field errors by deleting keys instead of storing undefined entries that trigger an empty error banner', () => {
    const untouched = clearUserFormFieldError({}, 'name');
    assert.deepEqual(Object.keys(untouched), []);
    assert.deepEqual(getUserFormErrorMessages(untouched), []);

    const partialCleared = clearUserFormFieldError(
      { name: 'नाम आवश्यक छ।', email: 'मान्य इमेल लेख्नुहोस्।' },
      'name',
    );
    assert.deepEqual(Object.keys(partialCleared), ['email']);
    assert.deepEqual(getUserFormErrorMessages(partialCleared), ['मान्य इमेल लेख्नुहोस्।']);

    const fullyCleared = clearUserFormFieldError(partialCleared, 'email');
    assert.deepEqual(Object.keys(fullyCleared), []);
    assert.deepEqual(getUserFormErrorMessages(fullyCleared), []);
  });

  it('normalizes case-variant roles and branch IDs when initializing UserForm for editing', () => {
    const adminUser: UserRecord = {
      id: 'u-1',
      name: 'Nikesh',
      email: 'nikeshmainali@gmail.com',
      role: 'admin',
      status: 'Active',
      branchId: '10',
    };
    const adminValues = buildInitialUserFormValues(adminUser);
    assert.equal(adminValues.role, Role.Admin);
    assert.equal(adminValues.branchId, '10');
    assert.equal(adminValues.status, 'Active');
    assert.equal(
      userUpdateSchema.safeParse({
        ...adminValues,
        password: adminValues.password || undefined,
        confirmPassword: adminValues.confirmPassword || undefined,
      }).success,
      true,
    );

    const operatorValues = buildInitialUserFormValues({
      ...adminUser,
      role: 'OPERATOR',
      status: 'inactive',
    });
    assert.equal(operatorValues.role, Role.Operator);
    assert.equal(operatorValues.status, 'Inactive');
  });

  it('does not show "सेभ गर्नुअघि यी विवरण मिलाउनुहोस्।" banner on initial render in create or edit mode', () => {
    const createHtml = renderComponentHtml(
      createElement(UserForm, {
        isSaving: false,
        branches: sampleBranches,
        isLoadingBranches: false,
        branchesError: null,
        onSubmit: async () => {},
        onCancel: () => {},
      }),
    );
    assertExcludesText(createHtml, 'सेभ गर्नुअघि यी विवरण मिलाउनुहोस्।');
    assertContainsText(createHtml, 'प्रयोगकर्ता सिर्जना');

    const editHtml = renderComponentHtml(
      createElement(UserForm, {
        user: {
          id: 'u-2',
          name: 'nikesh',
          email: 'nikeshmainali@gmail.com',
          role: 'user',
          status: 'Active',
          branchId: '10',
        },
        isSaving: false,
        branches: sampleBranches,
        isLoadingBranches: false,
        branchesError: null,
        onSubmit: async () => {},
        onUpdate: async () => {},
        onCancel: () => {},
      }),
    );
    assertExcludesText(editHtml, 'सेभ गर्नुअघि यी विवरण मिलाउनुहोस्।');
    assertContainsText(editHtml, 'परिवर्तन सेभ गर्नुहोस्');
  });

  it('renders both Create User and Edit User forms inside a modal Dialog popup in UsersPage', () => {
    const source = readWorkspaceFile('features', 'administration', 'users', 'components', 'UsersPage.tsx');
    assert.ok(source.includes('<Dialog'));
    assert.ok(source.includes('open={formDialogOpen}'));
    assert.ok(source.includes('<DialogContent'));
    assert.ok(source.includes('<UserForm'));
    assert.equal(source.includes('{(createOpen || editingUser) && (\n        <Card'), false);
  });
});
