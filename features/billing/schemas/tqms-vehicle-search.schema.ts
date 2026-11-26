import { z } from 'zod';
import type { BillingVehicle } from '../model/types';
import { resolveTqmsVehicleOwners } from '../utils/resolve-tqms-vehicle-owners';

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

export type TqmsVehicleSearchMatch = {
	tqmsVehicle: BillingVehicle;
	cacheVehicle: BillingVehicle | null;
	cacheRecord: JsonRecord | null;
	cacheId: string | null;
};

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

function extractSearchCollections(payload: unknown): {
	cacheRows: unknown[];
	tqmsRows: unknown[];
} | null {
	let current = payload;
	for (let depth = 0; depth < 6; depth += 1) {
		const record = asRecord(current);
		if (!record) return null;
		const cacheRows = record.cache_results ?? record.cacheResults;
		const tqmsRows = record.tqms_results ?? record.tqmsResults;
		if (Array.isArray(cacheRows) || Array.isArray(tqmsRows)) {
			return {
				cacheRows: Array.isArray(cacheRows) ? cacheRows : [],
				tqmsRows: Array.isArray(tqmsRows) ? tqmsRows : [],
			};
		}
		const next = record.Data ?? record.data ?? record.result ?? record.Result;
		if (next === undefined) return null;
		current = next;
	}
	return null;
}

function text(value: unknown): string {
	return typeof value === 'string' || typeof value === 'number'
		? String(value).trim()
		: '';
}

function normalizedIdentity(value: unknown): string {
	return text(value).toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

function getVehicleResourceContent(value: JsonRecord): JsonRecord {
	const content = { ...value };
	delete content.cache_id;
	delete content.source;
	delete content.is_in_billing;
	delete content.is_in_tqms;
	return content;
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

	const resolvedOwners = resolveTqmsVehicleOwners(vehicle.Owners);

	return {
		id: text(vehicle.VehicleId) || vehicleNumber,
		tqmsVehicleId: text(vehicle.VehicleId),
		tqmsVehicleTypeId,
		vehicleNumber,
		vehicleType: vehicleType || 'सवारी प्रकार उपलब्ध छैन',
		ownerName: resolvedOwners.ownerName,
		operatorName: resolvedOwners.operatorName || undefined,
		phone: resolvedOwners.phone,
		smsPhone: resolvedOwners.phone,
		ownerAddress: resolvedOwners.ownerAddress,
		branch: resolvedOwners.branch,
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
		resourceContent: {
			...getVehicleResourceContent(rawVehicle),
			Owners: resolvedOwners.owners,
		},
	};
}

function parseVehicleRows(rows: unknown[], vehicleNumber: string): BillingVehicle[] {
	const query = vehicleNumber.trim().toLocaleLowerCase();
	return rows
		.map(toBillingVehicle)
		.filter((vehicle): vehicle is BillingVehicle => vehicle !== null)
		.filter((vehicle) => vehicle.vehicleNumber.toLocaleLowerCase().includes(query));
}

function getCacheTimestamp(record: JsonRecord): number | null {
	const raw = record.updatedAt ?? record.updated_at ?? record.createdTime ?? record.createdAt ?? record.created_at;
	if (typeof raw !== 'string' && typeof raw !== 'number') return null;
	const parsed = Date.parse(String(raw));
	return Number.isNaN(parsed) ? null : parsed;
}

function getNumericCacheId(cacheId: string | null): number | null {
	return cacheId && /^\d+$/u.test(cacheId) ? Number(cacheId) : null;
}

type CacheMatchEntry = {
	record: JsonRecord;
	vehicle: BillingVehicle;
	cacheId: string | null;
};

function selectLatestCacheEntry(entries: CacheMatchEntry[]): CacheMatchEntry | null {
	if (entries.length === 0) return null;
	if (entries.length === 1) return entries[0];

	const ranked = entries.map((entry, index) => ({
		entry,
		index,
		timestamp: getCacheTimestamp(entry.record),
		numericId: getNumericCacheId(entry.cacheId),
	}));

	ranked.sort((left, right) => {
		if (left.timestamp !== null || right.timestamp !== null) {
			if (left.timestamp === null) return 1;
			if (right.timestamp === null) return -1;
			if (left.timestamp !== right.timestamp) return right.timestamp - left.timestamp;
		}
		if (left.numericId !== null && right.numericId !== null && left.numericId !== right.numericId) {
			return right.numericId - left.numericId;
		}
		return right.index - left.index;
	});

	return ranked[0]?.entry ?? null;
}

export function parseTqmsVehicleSearchMatches(
	payload: unknown,
	vehicleNumber: string,
): TqmsVehicleSearchMatch[] {
	const query = vehicleNumber.trim().toLocaleLowerCase();
	if (!query) return [];

	const collections = extractSearchCollections(payload);
	if (!collections) {
		const rows = extractVehicleRows(payload);
		const tqmsVehicles = parseVehicleRows(rows, vehicleNumber);
		if (rows.length > 0 && tqmsVehicles.length === 0) {
			throw new Error('TQMS vehicle search returned results in an unsupported format.');
		}
		return tqmsVehicles.map((tqmsVehicle) => ({
			tqmsVehicle,
			cacheVehicle: null,
			cacheRecord: null,
			cacheId: null,
		}));
	}

	const tqmsVehicles = parseVehicleRows(collections.tqmsRows, vehicleNumber);
	if (collections.tqmsRows.length > 0 && tqmsVehicles.length === 0) {
		throw new Error('TQMS vehicle search returned results in an unsupported format.');
	}

	const caches = collections.cacheRows.flatMap((row) => {
		const record = asRecord(row);
		const vehicle = toBillingVehicle(row);
		return record && vehicle
			? [{
				record: getVehicleResourceContent(record),
				vehicle,
				cacheId: text(record.cache_id ?? record.id) || null,
			}]
			: [];
	});
	if (caches.length !== collections.cacheRows.length) {
		throw new Error('TQMS vehicle search returned an unsupported cache record.');
	}

	return tqmsVehicles.map((tqmsVehicle) => {
		const tqmsId = normalizedIdentity(tqmsVehicle.tqmsVehicleId);
		const tqmsNumber = normalizedIdentity(tqmsVehicle.vehicleNumber);
		const idMatches = tqmsId
			? caches.filter(({ vehicle }) => normalizedIdentity(vehicle.tqmsVehicleId) === tqmsId)
			: [];
		const numberMatches = idMatches.length > 0
			? idMatches
			: caches.filter(({ vehicle }) => normalizedIdentity(vehicle.vehicleNumber) === tqmsNumber);
		const cache = selectLatestCacheEntry(numberMatches);
		return {
			tqmsVehicle,
			cacheVehicle: cache?.vehicle ?? null,
			cacheRecord: cache?.record ?? null,
			cacheId: cache?.cacheId ?? null,
		};
	});
}

export function parseTqmsVehicleSearchResponse(payload: unknown, vehicleNumber: string): BillingVehicle[] {
	return parseTqmsVehicleSearchMatches(payload, vehicleNumber)
		.map((match) => match.tqmsVehicle);
}
