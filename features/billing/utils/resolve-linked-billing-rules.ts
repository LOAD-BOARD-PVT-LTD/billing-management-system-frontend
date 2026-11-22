import type { BillingRule } from '@/features/billing-rules/model/types';
import type { LinkedFeeRulesSettings } from '@/features/settings/api/linked-fee-rules.api';

type LinkedFeeReceipt = {
	status: string;
	bill: {
		content: {
			vehicle: { id: string };
			fiscalYearId: string;
			fiscalYearName?: string;
			items: readonly { feeHeadId: string }[];
		};
	};
};

export function getCoveredLinkedFeeHeadIds(
	receipts: readonly LinkedFeeReceipt[],
	vehicleId: string,
	fiscalYearId: string,
): Set<string> {
	return new Set(receipts
		.filter((receipt) => (
			receipt.status === 'PAID'
			&& receipt.bill.content.vehicle.id === vehicleId
			&& (
				receipt.bill.content.fiscalYearId === fiscalYearId
				|| receipt.bill.content.fiscalYearName === fiscalYearId
			)
		))
		.flatMap((receipt) => receipt.bill.content.items.map((item) => item.feeHeadId)));
}

export function resolveLinkedBillingRuleIds(params: {
	settings: LinkedFeeRulesSettings | null;
	fiscalYearId: string;
	rules: readonly BillingRule[];
	selectedRuleIds: ReadonlySet<string>;
	coveredFeeHeadIds: ReadonlySet<string>;
	suppressedRuleIds: ReadonlySet<string>;
}): { selectedRuleIds: Set<string>; autoLinkedRuleIds: Set<string> } {
	const selectedRuleIds = new Set(params.selectedRuleIds);
	const autoLinkedRuleIds = new Set<string>();
	if (!params.settings?.enabled) return { selectedRuleIds, autoLinkedRuleIds };

	const rulesByFeeHeadId = new Map<string, BillingRule[]>();
	for (const rule of params.rules) {
		const rules = rulesByFeeHeadId.get(rule.feeHeadId) ?? [];
		rules.push(rule);
		rulesByFeeHeadId.set(rule.feeHeadId, rules);
	}

	const pendingFeeHeadIds = params.rules
		.filter((rule) => selectedRuleIds.has(rule.id))
		.map((rule) => rule.feeHeadId);
	const processedFeeHeadIds = new Set<string>();

	while (pendingFeeHeadIds.length > 0) {
		const sourceFeeHeadId = pendingFeeHeadIds.pop();
		if (!sourceFeeHeadId || processedFeeHeadIds.has(sourceFeeHeadId)) continue;
		processedFeeHeadIds.add(sourceFeeHeadId);

		for (const linkedRule of params.settings.rules) {
			if (!linkedRule.active
				|| linkedRule.fiscalYearId !== params.fiscalYearId
				|| linkedRule.sourceFeeHeadId !== sourceFeeHeadId
				|| (linkedRule.oncePerFiscalYear && params.coveredFeeHeadIds.has(linkedRule.linkedFeeHeadId))) {
				continue;
			}

			const targetRules = rulesByFeeHeadId.get(linkedRule.linkedFeeHeadId) ?? [];
			let targetAvailable = false;
			for (const targetRule of targetRules) {
				if (params.suppressedRuleIds.has(targetRule.id)) continue;
				targetAvailable = true;
				selectedRuleIds.add(targetRule.id);
				autoLinkedRuleIds.add(targetRule.id);
			}
			if (targetAvailable) pendingFeeHeadIds.push(linkedRule.linkedFeeHeadId);
		}
	}

	return { selectedRuleIds, autoLinkedRuleIds };
}
