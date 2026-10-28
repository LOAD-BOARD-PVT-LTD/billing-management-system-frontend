export interface VehicleStatusMetadata {
  isBlacklisted: boolean;
  blacklistedReason: string | null;
  blacklistedAt: string | null;
  blacklistSource?: 'billing-member' | 'tqms';
  tags: string[];
  performedBy?: string | null;
}

export interface VehicleBlacklistRecord extends VehicleStatusMetadata {
  id: string;
  vehicleId: string;
  vehicleNumber: string;
  vehicleType: string;
  ownerName: string;
  phone: string;
  branch: string;
  performedBy: string | null;
}

export { VehicleBlacklistPage } from '@/features/vehicle/blacklist/components/VehicleBlacklistPage';
