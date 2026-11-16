import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	getCoveredLinkedFeeHeadIds,
	resolveLinkedBillingRuleIds,
} from '@/features/billing/utils/resolve-linked-billing-rules';
import type { BillingRule } from '@/features/billing-rules/model/types';
import type { LinkedFeeRulesSettings } from '@/features/settings/api/linked-fee-rules.api';

const rules: BillingRule[] = [
	{
		id: 'rule-a',
		feeHeadId: 'fee-a',
		fiscalYearId: 'year-1',
		billingEntityId: null,
		scope: 'COMMON',
		vehicleCategoryId: null,
		frequency: 'ONE_TIME',
		period: null,
		validity: 'SAME_DAY',
		amount: 100,
		status: 'ACTIVE',
	},
	{
		id: 'rule-b',
		feeHeadId: 'fee-b',
		fiscalYearId: 'year-1',
		billingEntityId: null,
		scope: 'COMMON',
		vehicleCategoryId: null,
		frequency: 'ONE_TIME',
		period: null,
		validity: 'SAME_DAY',
		amount: 200,
		status: 'ACTIVE',
	},
	{
		id: 'rule-c',
		feeHeadId: 'fee-c',
		fiscalYearId: 'year-1',
		billingEntityId: null,
		scope: 'COMMON',
		vehicleCategoryId: null,
		frequency: 'ONE_TIME',
		period: null,
		validity: 'SAME_DAY',
		amount: 300,
		status: 'ACTIVE',
	},
];

function resolve(settings: LinkedFeeRulesSettings, coveredFeeHeadIds = new Set<string>()) {
	return resolveLinkedBillingRuleIds({
		settings,
		fiscalYearId: 'year-1',
		rules,
		selectedRuleIds: new Set(['rule-a']),
		coveredFeeHeadIds,
		suppressedRuleIds: new Set(),
	});
}

test('cascades linked fees even when downstream rules are saved first', () => {
	const result = resolve({
		enabled: true,
		rules: [
			{ id: 'link-b-c', fiscalYearId: 'year-1', sourceFeeHeadId: 'fee-b', linkedFeeHeadId: 'fee-c', active: true, oncePerFiscalYear: false },
			{ id: 'link-a-b', fiscalYearId: 'year-1', sourceFeeHeadId: 'fee-a', linkedFeeHeadId: 'fee-b', active: true, oncePerFiscalYear: false },
		],
	});

	assert.deepEqual([...result.selectedRuleIds].sort(), ['rule-a', 'rule-b', 'rule-c']);
	assert.deepEqual([...result.autoLinkedRuleIds].sort(), ['rule-b', 'rule-c']);
});

test('does not cascade past a linked fee already covered this fiscal year', () => {
	const result = resolve({
		enabled: true,
		rules: [
			{ id: 'link-a-b', fiscalYearId: 'year-1', sourceFeeHeadId: 'fee-a', linkedFeeHeadId: 'fee-b', active: true, oncePerFiscalYear: true },
			{ id: 'link-b-c', fiscalYearId: 'year-1', sourceFeeHeadId: 'fee-b', linkedFeeHeadId: 'fee-c', active: true, oncePerFiscalYear: false },
		],
	}, new Set(['fee-b']));

	assert.deepEqual([...result.selectedRuleIds], ['rule-a']);
	assert.deepEqual([...result.autoLinkedRuleIds], []);
});

test('finds covered fees by the persisted TQMS vehicle ID and the selected fiscal year', () => {
	const coveredFeeHeadIds = getCoveredLinkedFeeHeadIds([
		{
			status: 'PAID',
			bill: {
				content: {
					vehicle: { id: 'tqms-vehicle-1' },
					fiscalYearId: 'year-1',
					items: [{ feeHeadId: 'fee-b' }],
				},
			},
		},
		{
			status: 'PENDING',
			bill: {
				content: {
					vehicle: { id: 'tqms-vehicle-1' },
					fiscalYearId: 'year-1',
					items: [{ feeHeadId: 'fee-c' }],
				},
			},
		},
		{
			status: 'PAID',
			bill: {
				content: {
					vehicle: { id: 'different-vehicle' },
					fiscalYearId: 'year-1',
					items: [{ feeHeadId: 'fee-c' }],
				},
			},
		},
		{
			status: 'PAID',
			bill: {
				content: {
					vehicle: { id: 'tqms-vehicle-1' },
					fiscalYearId: 'year-2',
					items: [{ feeHeadId: 'fee-c' }],
				},
			},
		},
	], 'tqms-vehicle-1', 'year-1');

	assert.deepEqual([...coveredFeeHeadIds], ['fee-b']);
});
