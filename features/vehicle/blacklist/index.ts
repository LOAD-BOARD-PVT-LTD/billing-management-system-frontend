export interface VehicleStatusMetadata {
  isBlacklisted: boolean;
  blacklistedReason: string | null;
  blacklistedAt: string | null;
  tags: string[];
}

export interface VehicleBlacklistRecord extends VehicleStatusMetadata {
  id: string;
  vehicleId: string;
  vehicleNumber: string;
  vehicleType: string;
  ownerName: string;
  phone: string;
  branch: string;
}

export { VehicleBlacklistPage } from '@/features/vehicle/blacklist/components/VehicleBlacklistPage';
