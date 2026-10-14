export type BillingEntityStatus = 'ACTIVE' | 'INACTIVE';

export type BillingEntityFields = {
  entity: string;
  registrationNumber: string;
  panNumber: string;
  contactPerson: string;
  email: string;
  phoneNumber: string;
  hotlineNumber: string;
  website: string;
  address: string;
  status: BillingEntityStatus;
};

export type BillingEntityRecord = BillingEntityFields & {
  id: string;
};
