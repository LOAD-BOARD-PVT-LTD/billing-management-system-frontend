export type BranchStatus = 'ACTIVE' | 'INACTIVE';
export type BranchType = 'UNASSIGNED' | 'SINGLE_ENTITY' | 'MULTIPLE_ENTITIES';

export type BranchFields = {
  name: string;
  code: string;
  address: string;
  phone: string;
  contactPerson: string;
  billingEntityIds: string[];
  allowManualReceiptAmountOverride: boolean;
  status: BranchStatus;
};

export type BranchRecord = BranchFields & {
  id: string;
};
