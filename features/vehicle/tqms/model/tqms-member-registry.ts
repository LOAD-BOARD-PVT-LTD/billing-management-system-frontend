export interface TqmsRegistryVehicle {
  id: string;
  vehicleId: string;
  vehicleNumber: string;
  normalizedVehicleNumber: string;
  vehicleType: string;
  vehicleOwnerName: string;
  operatorName: string | null;
  phone: string;
  branch: string;
  status: string;
  address: string;
  citizenshipNumber: string;
  isDummyPhoneUsed: boolean;
}