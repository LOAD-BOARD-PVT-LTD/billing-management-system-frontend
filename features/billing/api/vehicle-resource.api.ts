import { apiClient } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { BillingVehicle } from '@/features/billing/model/types';
import type { VehiclePhoneUpdateInput } from '@/features/billing/schemas/vehicle-phone-update.schema';

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
	const query = vehicleNumber.trim();
	if (!requestedVehicleId && !query) {
		throw new Error('A TQMS VehicleId or vehicle number is required to read VehicleResource.');
	}

	const readMatches = async (field: string, value: string): Promise<unknown[]> => {
		try {
			const payload = await apiClient.get<unknown>(
				endpoints.resources.vehicle.search(field, value, 'all'),
			);
			return extractResourceRows(payload);
		} catch (error) {
			if (error instanceof Error
				&& /Request failed \(404\).*No resources found for search query/iu.test(error.message)) {
				return [];
			}
			throw error;
		}
	};
	const getInnerContent = (value: unknown) => {
		const candidate = asRecord(unwrapResource(value));
		return asRecord(candidate?.inner_content ?? candidate?.innerContent);
	};
	const getVehicleId = (value: unknown) => String(getInnerContent(value)?.VehicleId ?? '').trim();
	const normalizeVehicleNumber = (value: unknown) => String(value ?? '')
		.toLowerCase()
		.replace(/[^a-z0-9]/gu, '');
	const resolveCandidates = (idMatches: unknown[], numberMatches: unknown[]) => {
		if (idMatches.length === 1) return idMatches;
		if (numberMatches.length === 0) return idMatches;

		const matchingBoth = requestedVehicleId
			? numberMatches.filter((value) => getVehicleId(value) === requestedVehicleId)
			: [];
		if (matchingBoth.length > 0) return matchingBoth;
		if (numberMatches.length === 1) return numberMatches;
		return idMatches.length > 0 ? idMatches : numberMatches;
	};

	let idMatches: unknown[] = [];
	if (requestedVehicleId) {
		idMatches = (await readMatches('VehicleId', requestedVehicleId))
			.filter((value) => getVehicleId(value) === requestedVehicleId);
	}

	let matches = idMatches;
	if (idMatches.length !== 1 && query) {
		const normalizedQuery = normalizeVehicleNumber(query);
		const numberMatches = (await readMatches('VehicleNumber', query)).filter((value) => {
			const content = getInnerContent(value);
			return normalizeVehicleNumber(content?.VehicleNumber ?? content?.NormalizedVehicleNumber)
				=== normalizedQuery;
		});
		matches = resolveCandidates(idMatches, numberMatches);
	}

	if (matches.length === 0) {
		let resources: unknown[] = [];
		try {
			const payload = await apiClient.get<unknown>(endpoints.resources.vehicle.list());
			resources = extractResourceRows(payload);
		} catch (error) {
			if (!(error instanceof Error
				&& /Request failed \(404\).*No resources found/iu.test(error.message))) {
				throw error;
			}
		}
		idMatches = requestedVehicleId
			? resources.filter((value) => getVehicleId(value) === requestedVehicleId)
			: [];
		const normalizedQuery = normalizeVehicleNumber(query);
		const numberMatches = query
			? resources.filter((value) => {
				const content = getInnerContent(value);
				return normalizeVehicleNumber(content?.VehicleNumber ?? content?.NormalizedVehicleNumber)
					=== normalizedQuery;
			})
			: [];
		matches = resolveCandidates(idMatches, numberMatches);
	}

	if (matches.length === 0) {
		const identity = requestedVehicleId
			? `TQMS VehicleId ${requestedVehicleId}`
			: `vehicle number ${query}`;
		throw new Error(`No VehicleResource was found for ${identity}${query ? ` or vehicle number ${query}` : ''}.`);
	}
	if (matches.length > 1) {
		throw new Error(`Multiple VehicleResource records matched ${requestedVehicleId || query}; refusing to update an ambiguous vehicle.`);
	}
	const root = asRecord(unwrapResource(matches[0]));
	const innerContent = asRecord(root?.inner_content ?? root?.innerContent);
	const tqmsVehicleId = String(innerContent?.VehicleId ?? '').trim();
	if (!root || !innerContent) throw new Error(`VehicleResource for ${requestedVehicleId || query} is missing inner_content.`);
	if (!tqmsVehicleId) throw new Error(`VehicleResource for ${requestedVehicleId || query} is missing its TQMS VehicleId.`);
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

export async function findVehicleResource(
	vehicleId: string,
	vehicleNumber: string,
): Promise<VehicleResourceDocument | null> {
	try {
		return await readVehicleResource(vehicleId, vehicleNumber);
	} catch (error) {
		if (
			error instanceof Error &&
			(error.message.includes('No VehicleResource was found') ||
				/Request failed \(404\).*No resources found/iu.test(error.message))
		) {
			return null;
		}
		throw error;
	}
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

export async function updateVehicleSmsPhone(
	vehicle: BillingVehicle,
	input: VehiclePhoneUpdateInput,
): Promise<void> {
	const resource = await readVehicleResource(vehicle.tqmsVehicleId, vehicle.vehicleNumber);
	await updateVehicleResource(
		resource,
		resource.innerContent,
		{
			...resource.externalContent,
			smsPhone: input.phone.trim(),
		},
	);
}
