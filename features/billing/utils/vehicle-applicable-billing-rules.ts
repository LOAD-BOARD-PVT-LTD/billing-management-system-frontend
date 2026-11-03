import type { BillingRule } from '@/features/billing-rules/model/types';

export function getVehicleApplicableBillingRules(
	rules: BillingRule[],
	vehicleCategoryId: string,
): BillingRule[] {
	return rules.filter((rule) => (
		rule.scope === 'COMMON'
		|| (rule.scope === 'VEHICLE_TYPE' && rule.vehicleCategoryId === vehicleCategoryId)
	));
}
