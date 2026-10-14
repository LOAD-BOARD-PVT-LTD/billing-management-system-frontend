export type Scope = 'COMMON' | 'VEHICLE_TYPE';
export type Frequency = 'ONE_TIME' | 'PERIODIC';
export type Period = 'FISCAL_YEAR' | 'MONTH';
export type Validity = 'SAME_DAY' | 'END_OF_MONTH' | 'END_OF_FISCAL_YEAR';
export type RuleStatus = 'ACTIVE' | 'INACTIVE';

export interface FeeHead {
  id: string;
  code?: string;
  fiscalYearId: string | null;
  name: string;
  status: RuleStatus;
}

export interface FiscalYear {
  id: string;
  code?: string;
  isDefault?: boolean;
  name: string;
  startDate: string;
  endDate: string;
  status: RuleStatus;
}

export interface BillingRule {
  id: string;
  feeHeadId: string;
  fiscalYearId: string;
  billingEntityId: string | null;
  scope: Scope;
  vehicleCategoryId: string | null;
  frequency: Frequency;
  period: Period | null;
  validity: Validity;
  amount: number;
  status: RuleStatus;
  effectiveDate?: string;
  meetingReference?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BillingRuleConfig {
  version: number;
  feeHeads: FeeHead[];
  fiscalYears: FiscalYear[];
  rules: BillingRule[];
}

export interface BillingRuleDraft {
  feeHeadId: string;
  fiscalYearId: string;
  billingEntityId: string | null;
  scope: Scope;
  vehicleCategoryId: string | null;
  frequency: Frequency;
  period: Period | null;
  validity: Validity;
  amount: string;
  status: RuleStatus;
}
