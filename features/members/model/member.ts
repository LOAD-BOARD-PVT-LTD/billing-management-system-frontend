export type MemberStatus = 'ACTIVE' | 'NEW' | 'INACTIVE' | 'DISPLACED' | 'BLACKLISTED';

export interface MemberResourceRecord {
  id: string;
  vehicleId: string;
  vehicleNumber: string;
  status: string;
  isDisplaced: boolean;
  isBlacklisted: boolean;
  reason: string;
  taggedAt: string;
  performedBy: string | null;
  createdForDisplacement: boolean;
  statusBeforeDisplaced: string;
  resource: Record<string, unknown>;
  innerContent: Record<string, unknown>;
}

export interface MemberListRecord {
  vehicleId: string;
  memberNumber: string;
  vehicleNumber: string;
  tqmsVehicleType: string;
  ownerName: string;
  sanchalakName: string;
  sawariDhaniName: string;
  ownerCount: number;
  phone: string;
  address: string;
  vehicleType: string;
  branchName: string;
  branchCode: string;
  fiscalYearId: string;
  fiscalYearName: string;
  billingDate: string;
  periodStart: string;
  expiryDate: string;
  billNumber: string;
  billIssuer: string;
  paidAt: string;
  totalAmount: number;
  isActive: boolean;
  isNew: boolean;
  isDisplaced: boolean;
  isBlacklisted: boolean;
  billingStatus: MemberStatus;
  status: MemberStatus;
}

export type MemberResourceInput = {
  vehicleId: string;
  vehicleNumber: string;
  reason: string;
  taggedAt: string;
  performedBy: string | null;
};
