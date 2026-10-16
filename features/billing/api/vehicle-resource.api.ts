import { apiClient } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { searchTqmsVehicles } from './tqms-vehicle-search.api';
import type { BillingVehicle } from '../model/types';
import type { VehiclePhoneUpdateInput } from '../schemas/vehicle-phone-update.schema';
import { vehiclePhoneUpdateSchema } from '../schemas/vehicle-phone-update.schema';

export type VehicleResourceDocument = {
	id: string;
	resource: Record<string, unknown>;
	innerContent: Record<string, unknown>;
	externalContent: Record<string, unknown>;
};

function asRecord(value: unknown): Record<string, unknown> | null {
	return value && typeof value === 'object' && !Array.isArray(value)
		? value as Record<string, unknown>
		: null;
}

function unwrapResource(value: unknown): unknown {
	let current = value;
	for (let depth = 0; depth < 6; depth += 1) {
		const record = asRecord(current);
		if (!record) return current;
		if (record.resource_name === 'VehicleResource' || record.resourceName === 'VehicleResource') return current;
		const nested = record.data ?? record.Data ?? record.result ?? record.Result
			?? record.resource ?? record.Resource ?? record.item ?? record.Item;
		if (nested === undefined) return current;
		current = nested;
	}
	return current;
}

function parseExternalContent(value: unknown): Record<string, unknown> {
	if (value === undefined || value === null) return {};
	if (typeof value === 'string') {
		try {
			const parsed = asRecord(JSON.parse(value));
			if (parsed) return parsed;
		} catch {
			// A non-JSON external_content value cannot safely be merged.
		}
		throw new Error('VehicleResource external_content is not a valid object.');
	}
	const record = asRecord(value);
	if (!record) throw new Error('VehicleResource external_content is not an object.');
	return record;
}

function extractResourceRows(payload: unknown): unknown[] {
	if (Array.isArray(payload)) return payload.flatMap(extractResourceRows);
	const record = asRecord(payload);
	if (!record) return [];
	if (record.resource_name === 'VehicleResource' || record.resourceName === 'VehicleResource') {
		return [record];
	}
	for (const key of ['items', 'Items', 'records', 'Records', 'resources', 'Resources', 'data', 'Data', 'result', 'Result']) {
		const nested = record[key];
		if (Array.isArray(nested)) return nested.flatMap(extractResourceRows);
		if (asRecord(nested)) {
			const rows = extractResourceRows(nested);
			if (rows.length) return rows;
		}
	}
	if (asRecord(record.inner_content ?? record.innerContent)) return [record];
	return [];
}

export async function readVehicleResource(
	vehicleId: string,
	vehicleNumber: string,
): Promise<VehicleResourceDocument> {
	const requestedVehicleId = vehicleId.trim();
	if (!requestedVehicleId) throw new Error('A TQMS VehicleId is required to read VehicleResource.');
	const query = vehicleNumber.trim();
	if (!query) throw new Error('A vehicle number is required to resolve the TQMS VehicleId.');

	const tqmsVehicles = await searchTqmsVehicles(query);
	const matchingVehicle = tqmsVehicles.find((vehicle) => vehicle.tqmsVehicleId === requestedVehicleId);
	if (!matchingVehicle) {
		throw new Error(`TQMS search did not return vehicle ${query} with VehicleId ${requestedVehicleId}.`);
	}
	const tqmsVehicleId = matchingVehicle.tqmsVehicleId;

	const payload = await apiClient.get<unknown>(
		endpoints.resources.vehicle.search('VehicleId', tqmsVehicleId, 1),
	);
	const matches = extractResourceRows(payload).filter((value) => {
		const candidate = asRecord(unwrapResource(value));
		const content = asRecord(candidate?.inner_content ?? candidate?.innerContent);
		return String(content?.VehicleId ?? '').trim() === tqmsVehicleId;
	});
	if (matches.length === 0) {
		throw new Error(`No VehicleResource was found for TQMS VehicleId ${tqmsVehicleId}.`);
	}
	if (matches.length > 1) {
		throw new Error(`Multiple VehicleResource records were found for TQMS VehicleId ${tqmsVehicleId}.`);
	}
	const root = asRecord(unwrapResource(matches[0]));
	const innerContent = asRecord(root?.inner_content ?? root?.innerContent);
	if (!root || !innerContent) throw new Error(`VehicleResource for TQMS VehicleId ${tqmsVehicleId} is missing inner_content.`);
	if ((root.resource_name ?? root.resourceName) !== undefined
		&& (root.resource_name ?? root.resourceName) !== 'VehicleResource') {
		throw new Error(`VehicleResource lookup for ${tqmsVehicleId} returned another resource type.`);
	}
	const resourceId = String(root.id ?? '').trim();
	if (!resourceId) {
		throw new Error(`VehicleResource for TQMS VehicleId ${tqmsVehicleId} is missing its resource id.`);
	}
	return {
		id: resourceId,
		resource: root,
		innerContent,
		externalContent: parseExternalContent(root.external_content ?? root.externalContent),
	};
}

export async function updateVehicleResource(
	resource: VehicleResourceDocument,
	innerContent: Record<string, unknown>,
	externalContent: Record<string, unknown>,
): Promise<void> {
	const id = resource.id.trim();
	if (!id) throw new Error('A VehicleResource resource id is required to update VehicleResource.');
	await apiClient.put<void>(
		endpoints.resources.vehicle.update(id),
		{
			...resource.resource,
			id: resource.resource.id,
			resource_name: 'VehicleResource',
			inner_content: innerContent,
			external_content: externalContent,
		},
	);
}

function toVehicleResourceUpdate(
	vehicle: BillingVehicle,
	input: VehiclePhoneUpdateInput,
	existingExternalContent: Record<string, unknown>,
) {
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
		inner_content: {
			...vehicle.resourceContent,
			Owners: updatedOwners,
		},
		external_content: { ...existingExternalContent, phoneChangeReason: reason },
	};
}

export async function updateBillingVehiclePhone(
	vehicle: BillingVehicle,
	input: VehiclePhoneUpdateInput,
): Promise<void> {
	if (!vehicle.tqmsVehicleId) {
		throw new Error('TQMS vehicle ID is missing. Search for the vehicle again before updating its number.');
	}
	const currentResource = await readVehicleResource(vehicle.tqmsVehicleId, vehicle.vehicleNumber);
	const update = toVehicleResourceUpdate(
		{ ...vehicle, resourceContent: currentResource.innerContent },
		input,
		currentResource.externalContent,
	);
	await updateVehicleResource(currentResource, update.inner_content, update.external_content);
}
