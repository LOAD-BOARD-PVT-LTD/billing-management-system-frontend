import { apiClient } from '@/lib/api/client';
import type { BillingVehicle } from '../model/types';
import type { VehiclePhoneUpdateInput } from '../schemas/vehicle-phone-update.schema';
import { vehiclePhoneUpdateSchema } from '../schemas/vehicle-phone-update.schema';

function toVehicleResourceUpdate(vehicle: BillingVehicle, input: VehiclePhoneUpdateInput) {
	const { phone, reason } = vehiclePhoneUpdateSchema.parse(input);
	const owners = vehicle.resourceContent.Owners;
	if (!Array.isArray(owners) || owners.length === 0) {
		throw new Error('TQMS vehicle data does not include an owner to update.');
	}

	let ownerUpdated = false;
	const updatedOwners = owners.map((owner) => {
		if (!owner || typeof owner !== 'object' || Array.isArray(owner)) return owner;
		const ownerRecord = owner as Record<string, unknown>;
		const isMainOwner = typeof ownerRecord.Type === 'string'
			&& ownerRecord.Type.trim().toLowerCase() === 'main owner';
		if (!ownerUpdated && (isMainOwner || owners.length === 1)) {
			ownerUpdated = true;
			return { ...ownerRecord, Phone: phone };
		}
		return owner;
	});

	if (!ownerUpdated) {
		throw new Error('Could not identify the main owner for this vehicle.');
	}

	return {
		resource_name: 'VehicleResource' as const,
		inner_content: {
			...vehicle.resourceContent,
			Owners: updatedOwners,
		},
		external_content: { phoneChangeReason: reason },
	};
}

export async function updateBillingVehiclePhone(
	vehicle: BillingVehicle,
	input: VehiclePhoneUpdateInput,
): Promise<void> {
	if (!vehicle.tqmsVehicleId) {
		throw new Error('TQMS vehicle ID is missing. Search for the vehicle again before updating its number.');
	}

	await apiClient.put<void>(
		`update/VehicleResource/${encodeURIComponent(vehicle.tqmsVehicleId)}`,
		toVehicleResourceUpdate(vehicle, input),
	);
}
