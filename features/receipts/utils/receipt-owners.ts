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
			label: 'सञ्चालक:',
			name: owners.sanchalakName,
			suffix: '',
		},
		{
			label: 'धनीको नाम:',
			name: owners.dhaniName,
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
			label: 'सञ्चालक:',
			name: owners.sanchalakName,
			suffix: '',
		},
		{
			label: 'धनीको नाम:',
			name: owners.dhaniName,
			suffix: `${phone.trim() ? ` (${phone.trim()})` : ''} बाट संघको विधान बमोजिम`,
		},
	];
}

export function getBillOwnerDisplayLines(
	ownerName: string | null | undefined,
	operatorName: string | null | undefined,
	phone = '',
): ReceiptOwnerDisplayLine[] {
	const lines = getReceiptOwnerDisplayLines(ownerName, operatorName, phone);
	if (lines.length === 1) {
		return [{
			...lines[0],
			label: 'सदस्यको नाम:',
			suffix: `${lines[0].suffix} बाट संघको विधान बमोजिम`,
		}];
	}

	return [
		{ ...lines[1], label: 'सदस्यको नाम:' },
		{ ...lines[0], label: 'सञ्चालकको नाम:' },
	];
}
