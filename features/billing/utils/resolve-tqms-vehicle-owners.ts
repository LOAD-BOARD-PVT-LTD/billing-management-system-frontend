import type { BillingVehicle } from '@/features/billing/model/types';

type JsonRecord = Record<string, unknown>;

export type ResolvedOwnerOption = {
	index: number;
	name: string;
	phone: string;
	address: string;
	branch: string;
	raw: JsonRecord;
};

export type ResolvedTqmsVehicleOwners = {
	ownerName: string;
	operatorName: string;
	phone: string;
	ownerAddress: string;
	branch: string;
	owners: JsonRecord[];
};

function asText(value: unknown): string {
	return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

function normalizeOwnerRecords(ownersInput: unknown): JsonRecord[] {
	return Array.isArray(ownersInput)
		? ownersInput.filter((owner): owner is JsonRecord => (
			owner !== null && typeof owner === 'object' && !Array.isArray(owner)
		))
		: [];
}

export function resolveTqmsDhaniOwnerIndex(owners: JsonRecord[]): number {
	return owners.length > 1 ? 1 : 0;
}

export function extractVehicleOwnersList(ownersInput: unknown): ResolvedOwnerOption[] {
	return normalizeOwnerRecords(ownersInput).map((owner, index) => ({
		index,
		name: asText(owner.Name ?? owner.name),
		phone: asText(owner.Phone ?? owner.phone),
		address: asText(owner.Address ?? owner.address),
		branch: asText(owner.SanghBranch ?? owner.sanghBranch),
		raw: owner,
	}));
}

export function requiresDhaniOwnerSelection(ownersInput: unknown): boolean {
	return extractVehicleOwnersList(ownersInput).length > 2;
}

export function resolveTqmsVehicleOwners(ownersInput: unknown): ResolvedTqmsVehicleOwners {
	const owners = normalizeOwnerRecords(ownersInput);
	if (owners.length === 0) {
		return { ownerName: 'मालिकको विवरण उपलब्ध छैन', operatorName: '', phone: '', ownerAddress: '', branch: '', owners };
	}

	const mainOwner = owners[0];
	const dhani = owners[resolveTqmsDhaniOwnerIndex(owners)];
	const sanchalak = owners.length === 1 ? owners[0] : mainOwner;

	return {
		ownerName: asText(dhani.Name ?? dhani.name)
			|| asText(mainOwner.Name ?? mainOwner.name)
			|| 'मालिकको विवरण उपलब्ध छैन',
		operatorName: asText(sanchalak.Name ?? sanchalak.name),
		phone: asText(mainOwner.Phone ?? mainOwner.phone) || asText(dhani.Phone ?? dhani.phone),
		ownerAddress: asText(mainOwner.Address ?? mainOwner.address) || asText(dhani.Address ?? dhani.address),
		branch: asText(dhani.SanghBranch ?? dhani.sanghBranch) || asText(mainOwner.SanghBranch ?? mainOwner.sanghBranch),
		owners,
	};
}

export function applySelectedDhaniOwner(vehicle: BillingVehicle, selectedIndex: number): BillingVehicle {
	const owners = extractVehicleOwnersList(
		vehicle.resourceContent?.Owners ?? vehicle.resourceContent?.owners,
	);
	if (owners.length <= 1 || selectedIndex < 0 || selectedIndex >= owners.length) {
		return vehicle;
	}

	const mainOwner = owners[0];
	const chosenDhani = owners[selectedIndex];
	const sanchalak = selectedIndex === 0 ? owners[1] : owners[0];
	const mainPhone = mainOwner.phone || chosenDhani.phone || vehicle.phone;
	const mainAddress = mainOwner.address || chosenDhani.address || vehicle.ownerAddress;

	return {
		...vehicle,
		ownerName: chosenDhani.name || vehicle.ownerName,
		operatorName: sanchalak?.name || undefined,
		phone: mainPhone,
		smsPhone: vehicle.smsPhone || mainPhone,
		ownerAddress: mainAddress,
	};
}
