import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { MemberTransactionCandidate } from '@/features/reports/utils/member-transaction-report';
import { searchMemberTransactionCandidates } from '@/features/reports/utils/member-transaction-report';
import { toEnglishDigits } from '@/utils/numbers';

const candidates: MemberTransactionCandidate[] = [
  {
    id: 'vehicle-1',
    vehicleNumber: 'MA PRA-04-001-KHA-0263',
    memberNumber: 'ORG-BRANCH-0010',
    ownerName: 'Uttam Truck Dhuwani Sewa',
    phone: '9844111023',
    address: 'Bardibash',
    vehicleType: 'Truck',
    branchName: 'Hetauda',
    transactions: [],
  },
  {
    id: 'vehicle-2',
    vehicleNumber: 'NA-6-KHA-4808',
    memberNumber: 'ORG-BRANCH-0011',
    ownerName: 'Transport Association Nepal',
    phone: '9851101394',
    address: '',
    vehicleType: 'Truck',
    branchName: 'Hetauda',
    transactions: [],
  },
];

test('member transaction search matches vehicle, owner, phone, and member number', () => {
  assert.deepEqual(searchMemberTransactionCandidates(candidates, 'ma pra 04'), [candidates[0]]);
  assert.deepEqual(searchMemberTransactionCandidates(candidates, 'uttam truck'), [candidates[0]]);
  assert.deepEqual(searchMemberTransactionCandidates(candidates, '9844111023'), [candidates[0]]);
  assert.deepEqual(searchMemberTransactionCandidates(candidates, 'ORG-BRANCH-0011'), [candidates[1]]);
});

test('member transaction search returns no candidates for blank or unmatched queries', () => {
  assert.deepEqual(searchMemberTransactionCandidates(candidates, '  '), []);
  assert.deepEqual(searchMemberTransactionCandidates(candidates, 'not found'), []);
});

test('report vehicle and phone digits normalize to English digits', () => {
  assert.equal(toEnglishDigits('State-३-D-HN-५६६५'), 'State-3-D-HN-5665');
  assert.equal(toEnglishDigits('९८४४१११०२३'), '9844111023');
});
