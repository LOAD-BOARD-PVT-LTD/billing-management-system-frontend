import { z } from 'zod';
import type { BillingVehicle } from '../model/types';

const tqmsOwnerSchema = z.object({
	Name: z.string().nullish(),
	Phone: z.union([z.string(), z.number()]).nullish(),
	Address: z.string().nullish(),
	SanghBranch: z.string().nullish(),
	Type: z.string().nullish(),
}).passthrough();

const tqmsVehicleSchema = z.object({
	VehicleId: z.union([z.string(), z.number()]).nullish(),
	VehicleTypeId: z.union([z.string(), z.number()]).nullish(),
	VehicleTypeID: z.union([z.string(), z.number()]).nullish(),
	TQMSVehicleTypeId: z.union([z.string(), z.number()]).nullish(),
	VehicleNumber: z.string().nullish(),
	NormalizedVehicleNumber: z.string().nullish(),
	VehicleType: z.string().nullish(),
	Owners: z.array(tqmsOwnerSchema).nullish(),
}).passthrough();

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
	return value && typeof value === 'object' && !Array.isArray(value)
		? value as JsonRecord
		: null;
}

function extractVehicleRows(payload: unknown): unknown[] {
	let current = payload;
	for (let depth = 0; depth < 6; depth += 1) {
		if (Array.isArray(current)) return current;
		const record = asRecord(current);
		if (!record) break;
		if ('VehicleId' in record || 'VehicleNumber' in record) return [record];
		const next = record.Data ?? record.data ?? record.items ?? record.results;
		if (next === undefined) break;
		current = next;
	}

	throw new Error('TQMS vehicle search returned an unsupported response.');
}

function text(value: unknown): string {
	return typeof value === 'string' || typeof value === 'number'
		? String(value).trim()
		: '';
}

function toBillingVehicle(value: unknown): BillingVehicle | null {
	const result = tqmsVehicleSchema.safeParse(value);
	if (!result.success) return null;

	const vehicle = result.data;
	const vehicleNumber = text(vehicle.VehicleNumber) || text(vehicle.NormalizedVehicleNumber);
	if (!vehicleNumber) return null;

	const rawVehicle = vehicle as Record<string, unknown>;
	const vehicleType = text(vehicle.VehicleType);
	const tqmsVehicleTypeId = text(vehicle.VehicleTypeId)
		|| text(vehicle.VehicleTypeID)
		|| text(vehicle.TQMSVehicleTypeId)
		|| text(asRecord(rawVehicle.VehicleType)?.VehicleTypeId)
		|| text(asRecord(rawVehicle.VehicleType)?.vehicleTypeId);
	const owners = vehicle.Owners ?? [];
	const owner = owners.find((candidate) => text(candidate.Type).toLowerCase() === 'main owner')
		?? owners[0];
	const phone = text(owner?.Phone);
	const branchNames = Array.from(new Set(owners.map((candidate) => text(candidate.SanghBranch)).filter(Boolean)));

	return {
		id: text(vehicle.VehicleId) || vehicleNumber,
		tqmsVehicleId: text(vehicle.VehicleId),
		tqmsVehicleTypeId,
		vehicleNumber,
		vehicleType: vehicleType || 'सवारी प्रकार उपलब्ध छैन',
		ownerName: text(owner?.Name) || 'मालिकको विवरण उपलब्ध छैन',
		phone,
		smsPhone: phone,
		ownerAddress: text(owner?.Address),
		branch: branchNames.join(', '),
		fiscalYear: '',
		billingDate: '',
		periodStart: '',
		periodEnd: '',
		billingMonths: 0,
		company: '',
		companyShare: '',
		rate: '',
		rateDate: '',
		previousPeriod: '',
		remainingPeriod: '',
		resourceContent: vehicle as Record<string, unknown>,
	};
}

export function parseTqmsVehicleSearchResponse(payload: unknown, vehicleNumber: string): BillingVehicle[] {
	const query = vehicleNumber.trim().toLocaleLowerCase();
	if (!query) return [];

	const rows = extractVehicleRows(payload);
	const vehicles = rows
		.map(toBillingVehicle)
		.filter((vehicle): vehicle is BillingVehicle => vehicle !== null)
		.filter((vehicle) => vehicle.vehicleNumber.toLocaleLowerCase().includes(query));

	if (rows.length > 0 && vehicles.length === 0) {
		throw new Error('TQMS vehicle search returned results in an unsupported format.');
	}

	return vehicles;
}
