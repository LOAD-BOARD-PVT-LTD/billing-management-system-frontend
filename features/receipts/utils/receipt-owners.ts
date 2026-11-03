export type ReceiptVehicleOwners = {
	dhaniName: string;
	sanchalakName: string;
	hasMultipleOwners: boolean;
};

export type ReceiptOwnerDisplayLine = {
	label: string;
	name: string;
	suffix: string;
};

export function getMemberOwnerDisplayLines(
	ownerName: string | null | undefined,
	operatorName: string | null | undefined,
): ReceiptOwnerDisplayLine[] {
	const owners = getReceiptVehicleOwners(ownerName, operatorName);
	if (!owners.hasMultipleOwners) {
		return [{
			label: '',
			name: owners.dhaniName || '—',
			suffix: '',
		}];
	}

	return [
		{
			label: 'सवारी धनीको नाम:',
			name: owners.dhaniName,
			suffix: '',
		},
		{
			label: 'सञ्चालकको नाम:',
			name: owners.sanchalakName,
			suffix: '',
		},
	];
}

export function getReceiptVehicleOwners(
	ownerName: string | null | undefined,
	operatorName: string | null | undefined,
): ReceiptVehicleOwners {
	const dhaniName = ownerName?.trim() || '';
	const operator = operatorName?.trim() || '';
	const hasMultipleOwners = Boolean(
		dhaniName
		&& operator
		&& dhaniName.toLocaleLowerCase() !== operator.toLocaleLowerCase(),
	);

	return {
		dhaniName: dhaniName || operator,
		sanchalakName: hasMultipleOwners ? operator : '',
		hasMultipleOwners,
	};
}

export function getReceiptOwnerDisplayLines(
	ownerName: string | null | undefined,
	operatorName: string | null | undefined,
	phone = '',
): ReceiptOwnerDisplayLine[] {
	const owners = getReceiptVehicleOwners(ownerName, operatorName);
	if (!owners.hasMultipleOwners) {
		return [{
			label: '',
			name: owners.dhaniName || '—',
			suffix: phone.trim() ? ` (${phone.trim()})` : '',
		}];
	}

	return [
		{
			label: 'सदस्यको नाम:',
			name: owners.dhaniName,
			suffix: `${phone.trim() ? ` (${phone.trim()})` : ''} बाट संघको विधान बमोजिम`,
		},
		{
			label: 'संचालकको नाम:',
			name: owners.sanchalakName,
			suffix: '',
		},
	];
}
