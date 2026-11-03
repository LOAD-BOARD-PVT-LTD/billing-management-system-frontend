type JsonRecord = Record<string, unknown>;

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

function hasOwnerRole(owner: JsonRecord, ...keys: string[]): boolean {
	return keys.some((key) => owner[key] === true);
}

export function resolveTqmsDhaniOwnerIndex(owners: JsonRecord[]): number {
	if (owners.length <= 1) return 0;
	const dhaniIndex = owners.findIndex((owner) => hasOwnerRole(
		owner,
		'isDhani',
		'IsDhani',
		'isSawariDhani',
		'IsSawariDhani',
	));
	return dhaniIndex >= 0 ? dhaniIndex : 1;
}

export function resolveTqmsVehicleOwners(ownersInput: unknown): ResolvedTqmsVehicleOwners {
	const owners = Array.isArray(ownersInput)
		? ownersInput.filter((owner): owner is JsonRecord => (
			owner !== null && typeof owner === 'object' && !Array.isArray(owner)
		))
		: [];
	if (owners.length === 0) {
		return { ownerName: 'मालिकको विवरण उपलब्ध छैन', operatorName: '', phone: '', ownerAddress: '', branch: '', owners };
	}

	const dhani = owners[resolveTqmsDhaniOwnerIndex(owners)];
	const sanchalak = owners.length === 1
		? owners[0]
		: owners.find((owner) => hasOwnerRole(owner, 'isSanchalk', 'IsSanchalk', 'isSanchalak', 'IsSanchalak'))
			?? owners.find((owner) => owner !== dhani)
			?? owners[0];

	return {
		ownerName: asText(dhani.Name ?? dhani.name) || 'मालिकको विवरण उपलब्ध छैन',
		operatorName: asText(sanchalak.Name ?? sanchalak.name),
		phone: asText(dhani.Phone ?? dhani.phone),
		ownerAddress: asText(dhani.Address ?? dhani.address),
		branch: asText(dhani.SanghBranch ?? dhani.sanghBranch),
		owners,
	};
}
