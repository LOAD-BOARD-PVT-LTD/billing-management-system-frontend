import type { BillingVehicle } from '@/features/billing/model/types';
import {
	findVehicleResource,
	type VehicleResourceDocument,
} from '@/features/billing/api/vehicle-resource.api';
import { searchTqmsVehicles } from '@/features/billing/api/tqms-vehicle-search.api';
import type {
	ReconciliationAuditEntry,
	ReconciliationFieldDiff,
	ReconciliationLookupResult,
	OwnerChangeType,
	ResolvedVehicleOwners,
	VehicleOwnershipHistoryEntry,
} from '../types/reconciliation.types';
import type { ReceiptRecord } from '@/features/receipts/model/receipt';
import { hasVehicleBillingHistory } from './reconciliation-history';
import { resolveTqmsVehicleOwners } from '@/features/billing/utils/resolve-tqms-vehicle-owners';

export function normalizeReconciliationText(value: unknown): string {
	if (value === null || value === undefined) return '';
	const str = String(value).trim();
	if (
		str === '—' ||
		str === '-' ||
		str.toLowerCase() === 'none' ||
		str.toLowerCase() === 'null' ||
		str === 'मालिकको विवरण उपलब्ध छैन' ||
		str === 'सवारी प्रकार उपलब्ध छैन'
	) {
		return '';
	}
	return str.replace(/\s+/gu, ' ').toLowerCase();
}

/**
 * Resolves vehicle ownership following the association's domain rule:
 * - When single owner: same is sawari dhani and sanchalak.
 * - When two owners are present: first is sanchalak and second is sawari dhani.
 */
export function resolveVehicleOwners(ownersInput: unknown): ResolvedVehicleOwners {
	const resolved = resolveTqmsVehicleOwners(ownersInput);
	return {
		sawariDhaniName: resolved.ownerName,
		sanchalakName: resolved.operatorName,
		phone: resolved.phone,
		ownerAddress: resolved.ownerAddress,
		branch: resolved.branch,
		owners: resolved.owners,
	};
}

export function areOwnersArraysEqual(billingOwnersRaw: unknown, tqmsOwnersRaw: unknown): boolean {
	const bOwners = Array.isArray(billingOwnersRaw)
		? (billingOwnersRaw as Array<Record<string, unknown>>).filter((o) => o && typeof o === 'object')
		: [];
	const tOwners = Array.isArray(tqmsOwnersRaw)
		? (tqmsOwnersRaw as Array<Record<string, unknown>>).filter((o) => o && typeof o === 'object')
		: [];

	if (bOwners.length !== tOwners.length) return false;

	for (let i = 0; i < bOwners.length; i += 1) {
		const b = bOwners[i];
		const t = tOwners[i];

		const bName = normalizeReconciliationText(b.Name ?? b.name);
		const tName = normalizeReconciliationText(t.Name ?? t.name);
		if (bName !== tName) return false;

		const bPhone = normalizeReconciliationText(b.Phone ?? b.phone);
		const tPhone = normalizeReconciliationText(t.Phone ?? t.phone);
		if (bPhone !== tPhone) return false;

		const bAddr = normalizeReconciliationText(b.Address ?? b.address);
		const tAddr = normalizeReconciliationText(t.Address ?? t.address);
		if (bAddr !== tAddr) return false;

		const bBranch = normalizeReconciliationText(b.SanghBranch ?? b.sanghBranch);
		const tBranch = normalizeReconciliationText(t.SanghBranch ?? t.sanghBranch);
		if (bBranch !== tBranch) return false;

		const bCit = normalizeReconciliationText(
			b.CitizenshipNumber ?? b.citizenshipNumber ?? b.IdentityNumber ?? b.identityNumber,
		);
		const tCit = normalizeReconciliationText(
			t.CitizenshipNumber ?? t.citizenshipNumber ?? t.IdentityNumber ?? t.identityNumber,
		);
		if (bCit !== tCit) return false;
	}

	return true;
}

export function summarizeOwnersList(ownersInput: unknown): string {
	const owners = Array.isArray(ownersInput)
		? (ownersInput as Array<Record<string, unknown>>).filter((o) => o && typeof o === 'object')
		: [];
	if (owners.length === 0) return 'कुनै विवरण छैन';

	if (owners.length === 1) {
		const o = owners[0];
		const name = String(o.Name ?? o.name ?? '').trim() || '—';
		const phone = String(o.Phone ?? o.phone ?? '').trim();
		const branch = String(o.SanghBranch ?? o.sanghBranch ?? '').trim();
		const parts = [
			`धनी/सञ्चालक: ${name}`,
			phone ? `फोन: ${phone}` : null,
			branch ? `शाखा: ${branch}` : null,
		].filter(Boolean);
		return parts.join(', ');
	}

	return owners
		.map((o, idx) => {
			const role = idx === 0 ? 'सञ्चालक' : idx === 1 ? 'सवारी धनी' : `धनी ${idx + 1}`;
			const name = String(o.Name ?? o.name ?? '').trim() || '—';
			const phone = String(o.Phone ?? o.phone ?? '').trim();
			const branch = String(o.SanghBranch ?? o.sanghBranch ?? '').trim();
			const details = [
				phone ? `फोन: ${phone}` : null,
				branch ? `शाखा: ${branch}` : null,
			].filter(Boolean);
			return `${idx + 1}. [${role}] ${name}${details.length > 0 ? ` (${details.join(', ')})` : ''}`;
		})
		.join(' | ');
}

export function compareVehiclesForReconciliation(
	billing: BillingVehicle,
	tqms: BillingVehicle,
): ReconciliationFieldDiff[] {
	const billingOwners = billing.resourceContent?.Owners ?? [];
	const tqmsOwners = tqms.resourceContent?.Owners ?? [];
	const areOwnersEqual = areOwnersArraysEqual(billingOwners, tqmsOwners);

	const fields: Array<{
		key: string;
		label: string;
		billingValue: string;
		tqmsValue: string;
		isChanged: boolean;
	}> = [
		{
			key: 'vehicleNumber',
			label: 'सवारी नम्बर',
			billingValue: billing.vehicleNumber.trim() || '—',
			tqmsValue: tqms.vehicleNumber.trim() || '—',
			isChanged:
				normalizeReconciliationText(billing.vehicleNumber) !==
				normalizeReconciliationText(tqms.vehicleNumber),
		},
		{
			key: 'tqmsVehicleId',
			label: 'सवारी ID (TQMS ID)',
			billingValue: billing.tqmsVehicleId.trim() || '—',
			tqmsValue: tqms.tqmsVehicleId.trim() || '—',
			isChanged:
				normalizeReconciliationText(billing.tqmsVehicleId) !==
				normalizeReconciliationText(tqms.tqmsVehicleId),
		},
		{
			key: 'ownerName',
			label: 'सवारी धनी (Sawari Dhani)',
			billingValue: billing.ownerName.trim() || '—',
			tqmsValue: tqms.ownerName.trim() || '—',
			isChanged:
				normalizeReconciliationText(billing.ownerName) !==
				normalizeReconciliationText(tqms.ownerName),
		},
		{
			key: 'operatorName',
			label: 'सञ्चालक (Sanchalak)',
			billingValue: (billing.operatorName || '').trim() || '—',
			tqmsValue: (tqms.operatorName || '').trim() || '—',
			isChanged:
				normalizeReconciliationText(billing.operatorName) !==
				normalizeReconciliationText(tqms.operatorName),
		},
		{
			key: 'phone',
			label: 'धनीको फोन नम्बर',
			billingValue: billing.phone.trim() || '—',
			tqmsValue: tqms.phone.trim() || '—',
			isChanged:
				normalizeReconciliationText(billing.phone) !==
				normalizeReconciliationText(tqms.phone),
		},
		{
			key: 'vehicleType',
			label: 'सवारी प्रकार',
			billingValue: billing.vehicleType.trim() || '—',
			tqmsValue: tqms.vehicleType.trim() || '—',
			isChanged:
				normalizeReconciliationText(billing.vehicleType) !==
				normalizeReconciliationText(tqms.vehicleType),
		},
		{
			key: 'branch',
			label: 'संघ शाखा (Sangh Branch)',
			billingValue: billing.branch.trim() || '—',
			tqmsValue: tqms.branch.trim() || '—',
			isChanged:
				normalizeReconciliationText(billing.branch) !==
				normalizeReconciliationText(tqms.branch),
		},
		{
			key: 'ownerAddress',
			label: 'ठेगाना',
			billingValue: billing.ownerAddress.trim() || '—',
			tqmsValue: tqms.ownerAddress.trim() || '—',
			isChanged:
				normalizeReconciliationText(billing.ownerAddress) !==
				normalizeReconciliationText(tqms.ownerAddress),
		},
		{
			key: 'owners',
			label: 'धनी तथा सञ्चालक विवरण (Owners Array)',
			billingValue: summarizeOwnersList(billingOwners),
			tqmsValue: summarizeOwnersList(tqmsOwners),
			isChanged: !areOwnersEqual,
		},
	];

	return fields;
}

export function isOwnerReconciliationDiff(diff: ReconciliationFieldDiff): boolean {
	return ['ownerName', 'operatorName', 'phone', 'ownerAddress', 'owners'].includes(diff.key);
}

export function vehicleResourceToBillingVehicle(
	resource: VehicleResourceDocument,
	fallbackSmsPhone?: string,
): BillingVehicle {
	const inner = resource.innerContent;
	const resolved = resolveVehicleOwners(inner.Owners);
	const vehicleNumber = String(inner.VehicleNumber ?? inner.vehicleNumber ?? '').trim();
	const vehicleId = String(inner.VehicleId ?? inner.vehicleId ?? resource.id).trim();
	const vehicleType = String(
		inner.VehicleType ?? inner.vehicleType ?? 'सवारी प्रकार उपलब्ध छैन',
	).trim();
	const savedSmsPhone = resource.externalContent.smsPhone;
	const smsPhone = (typeof savedSmsPhone === 'string' && savedSmsPhone.trim())
		? savedSmsPhone.trim()
		: fallbackSmsPhone || resolved.phone;

	return {
		id: resource.id,
		tqmsVehicleId: vehicleId,
		tqmsVehicleTypeId: String(
			inner.VehicleTypeId ?? inner.VehicleTypeID ?? inner.TQMSVehicleTypeId ?? '',
		).trim(),
		vehicleNumber,
		vehicleType,
		ownerName: resolved.sawariDhaniName,
		operatorName: resolved.sanchalakName || undefined,
		phone: resolved.phone,
		smsPhone,
		ownerAddress: resolved.ownerAddress,
		branch: resolved.branch,
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
		resourceContent: inner,
	};
}

/**
 * Searches existing Billing VehicleResource first, then /api/v1/tqms/search,
 * and compares all details including the full Owners array.
 */
export async function reconcileVehicleLookup(
	vehicleNumber: string,
	options?: {
		signal?: AbortSignal;
		preloadedTqms?: BillingVehicle;
		fallbackSmsPhone?: string;
		receipts?: ReceiptRecord[];
	},
): Promise<ReconciliationLookupResult> {
	const query = vehicleNumber.trim();
	if (!query) throw new Error('सवारी नम्बर आवश्यक छ।');

	// Step 1: Search from existing internal VehicleResource API endpoint first
	let billingResource = await findVehicleResource('', query);

	// Step 2: And then search /api/v1/tqms/search with vehicle_number
	let tqmsVehicle: BillingVehicle | null = null;
	const tqmsResults = await searchTqmsVehicles(query, options?.signal);
	const normalizedQ = normalizeReconciliationText(query);
	tqmsVehicle =
		tqmsResults.find((v) => normalizeReconciliationText(v.vehicleNumber) === normalizedQ) ??
		tqmsResults[0] ??
		options?.preloadedTqms ??
		null;

	if (!billingResource && tqmsVehicle?.tqmsVehicleId) {
		billingResource = await findVehicleResource(tqmsVehicle.tqmsVehicleId, query);
	}

	if (!tqmsVehicle) {
		throw new Error(`सवारी नम्बर "${query}" TQMS मा फेला परेन।`);
	}

	const hasBillingHistory = hasVehicleBillingHistory(
		options?.receipts ?? [],
		[tqmsVehicle.tqmsVehicleId, billingResource?.innerContent.VehicleId?.toString() ?? ''],
		[query, tqmsVehicle.vehicleNumber, billingResource?.innerContent.VehicleNumber?.toString() ?? ''],
	);

	if (!hasBillingHistory) {
		return {
			type: 'FIRST_TIME',
			tqmsVehicle,
			billingVehicle: null,
			billingResource: null,
			diffs: [],
		};
	}

	if (!billingResource) {
		throw new Error('Эही सवारीको पुरानो बिल भेटियो, तर VehicleResource विवरण फेला परेन। बिलिङ प्रशासकलाई सम्पर्क गर्नुहोस्।');
	}

	// Step 3: Compare all details between Billing and TQMS, including owners array
	const billingVehicle = vehicleResourceToBillingVehicle(
		billingResource,
		tqmsVehicle.smsPhone || options?.fallbackSmsPhone,
	);

	const diffs = compareVehiclesForReconciliation(billingVehicle, tqmsVehicle);
	const changedDiffs = diffs.filter((d) => d.isChanged);

	if (changedDiffs.length === 0) {
		return {
			type: 'MATCHED',
			billingVehicle,
			tqmsVehicle,
			billingResource,
			diffs,
		};
	}

	return {
		type: 'RECONCILIATION_REQUIRED',
		billingVehicle,
		tqmsVehicle,
		billingResource,
		diffs,
	};
}

export function prepareTqmsUpdatePayload(
	existingResource: VehicleResourceDocument,
	tqmsVehicle: BillingVehicle,
	diffs: ReconciliationFieldDiff[],
	performedBy: string,
	reason: string,
	ownerChangeType?: OwnerChangeType | null,
): { innerContent: Record<string, unknown>; externalContent: Record<string, unknown> } {
	const tqmsContent = { ...(tqmsVehicle.resourceContent || {}) };
	if (!ownerChangeType) {
		delete tqmsContent.Owners;
		delete tqmsContent.owners;
	}
	const innerContent: Record<string, unknown> = {
		...existingResource.innerContent,
		...tqmsContent,
		VehicleNumber: tqmsVehicle.vehicleNumber,
		VehicleId: tqmsVehicle.tqmsVehicleId || existingResource.innerContent.VehicleId,
		VehicleType: tqmsVehicle.vehicleType,
		VehicleTypeId: tqmsVehicle.tqmsVehicleTypeId || existingResource.innerContent.VehicleTypeId,
	};

	const currentAudits = Array.isArray(existingResource.externalContent?.reconciliationAudit)
		? (existingResource.externalContent.reconciliationAudit as ReconciliationAuditEntry[])
		: [];

	const auditEntry: ReconciliationAuditEntry = {
		action: 'UPDATE_TQMS',
		timestamp: new Date().toISOString(),
		performedBy,
		reason: reason.trim(),
		changedFields: diffs
			.filter((d) => d.isChanged && (ownerChangeType || !isOwnerReconciliationDiff(d)))
			.map((d) => ({
				field: d.key,
				label: d.label,
				oldValue: d.billingValue,
				newValue: d.tqmsValue,
			})),
	};

	const externalContent: Record<string, unknown> = {
		...existingResource.externalContent,
		reconciliationAudit: [...currentAudits, auditEntry],
	};
	if (ownerChangeType === 'OWNERSHIP_TRANSFER') {
		const currentOwnershipHistory = Array.isArray(existingResource.externalContent?.ownershipHistory)
			? existingResource.externalContent.ownershipHistory as VehicleOwnershipHistoryEntry[]
			: [];
		externalContent.ownershipHistory = [
			...currentOwnershipHistory,
			{
				previousOwners: existingResource.innerContent.Owners ?? existingResource.innerContent.owners ?? [],
				transferredAt: new Date().toISOString(),
				performedBy,
				reason: reason.trim(),
				transferType: 'TQMS_OWNERSHIP_TRANSFER',
			},
		];
	}

	return { innerContent, externalContent };
}

export function prepareOwnerChangePayload(
	existingResource: VehicleResourceDocument,
	tqmsVehicle: BillingVehicle,
	diffs: ReconciliationFieldDiff[],
	ownerChangeType: OwnerChangeType,
	performedBy: string,
	reason: string,
): { innerContent: Record<string, unknown>; externalContent: Record<string, unknown> } {
	const tqmsOwners = tqmsVehicle.resourceContent.Owners ?? tqmsVehicle.resourceContent.owners ?? [];
	const innerContent: Record<string, unknown> = { ...existingResource.innerContent, Owners: tqmsOwners };
	delete innerContent.owners;
	const changedFields = diffs.filter((diff) => isOwnerReconciliationDiff(diff) && diff.isChanged);
	const auditEntries = Array.isArray(existingResource.externalContent?.reconciliationAudit)
		? existingResource.externalContent.reconciliationAudit as ReconciliationAuditEntry[]
		: [];
	const auditEntry: ReconciliationAuditEntry = {
		action: 'UPDATE_TQMS',
		timestamp: new Date().toISOString(),
		performedBy,
		reason: reason.trim(),
		changedFields: changedFields.map((diff) => ({
			field: diff.key,
			label: diff.label,
			oldValue: diff.billingValue,
			newValue: diff.tqmsValue,
		})),
	};
	const externalContent: Record<string, unknown> = {
		...existingResource.externalContent,
		reconciliationAudit: [...auditEntries, auditEntry],
	};
	if (ownerChangeType === 'OWNERSHIP_TRANSFER') {
		const ownershipHistory = Array.isArray(existingResource.externalContent?.ownershipHistory)
			? existingResource.externalContent.ownershipHistory as VehicleOwnershipHistoryEntry[]
			: [];
		externalContent.ownershipHistory = [
			...ownershipHistory,
			{
				previousOwners: existingResource.innerContent.Owners ?? existingResource.innerContent.owners ?? [],
				transferredAt: new Date().toISOString(),
				performedBy,
				reason: reason.trim(),
				transferType: 'TQMS_OWNERSHIP_TRANSFER',
			},
		];
	}
	return { innerContent, externalContent };
}

export function prepareNewMemberPayload(
	existingResource: VehicleResourceDocument,
	tqmsVehicle: BillingVehicle,
	diffs: ReconciliationFieldDiff[],
	performedBy: string,
	reason: string,
): { innerContent: Record<string, unknown>; externalContent: Record<string, unknown> } {
	const innerContent: Record<string, unknown> = {
		...existingResource.innerContent,
		...(tqmsVehicle.resourceContent || {}),
		VehicleNumber: tqmsVehicle.vehicleNumber,
		VehicleId: tqmsVehicle.tqmsVehicleId || existingResource.innerContent.VehicleId,
		VehicleType: tqmsVehicle.vehicleType,
		VehicleTypeId: tqmsVehicle.tqmsVehicleTypeId || existingResource.innerContent.VehicleTypeId,
	};

	const currentOwnershipHistory = Array.isArray(existingResource.externalContent?.ownershipHistory)
		? (existingResource.externalContent.ownershipHistory as VehicleOwnershipHistoryEntry[])
		: [];

	const currentAudits = Array.isArray(existingResource.externalContent?.reconciliationAudit)
		? (existingResource.externalContent.reconciliationAudit as ReconciliationAuditEntry[])
		: [];

	const previousOwners = existingResource.innerContent.Owners ?? [];
	const ownershipEntry: VehicleOwnershipHistoryEntry = {
		previousOwners,
		transferredAt: new Date().toISOString(),
		performedBy,
		reason: reason.trim(),
		transferType: 'NEW_MEMBER_RECONCILIATION',
	};

	const auditEntry: ReconciliationAuditEntry = {
		action: 'CREATE_NEW_MEMBER',
		timestamp: new Date().toISOString(),
		performedBy,
		reason: reason.trim(),
		changedFields: diffs
			.filter((d) => d.isChanged)
			.map((d) => ({
				field: d.key,
				label: d.label,
				oldValue: d.billingValue,
				newValue: d.tqmsValue,
			})),
	};

	const externalContent: Record<string, unknown> = {
		...existingResource.externalContent,
		ownershipHistory: [...currentOwnershipHistory, ownershipEntry],
		reconciliationAudit: [...currentAudits, auditEntry],
	};

	return { innerContent, externalContent };
}
