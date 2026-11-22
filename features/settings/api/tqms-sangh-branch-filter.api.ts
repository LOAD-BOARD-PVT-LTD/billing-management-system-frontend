import {
	asSettingRecord,
	fetchGroupedSettingsDocument,
	findGroupedSettingRecord,
	getSettingResourceId,
	parseSettingJson,
	updateGroupedSettingsSection,
	type JsonRecord,
} from '@/features/settings/api/grouped-settings.api';

export interface TqmsSanghBranchFilterDocument {
	resourceId: string | null;
	branchName: string;
}

export const DEFAULT_TQMS_SANGH_BRANCH_FILTER: TqmsSanghBranchFilterDocument = {
	resourceId: null,
	branchName: '',
};

export function matchesTqmsSanghBranch(branch: string, branchName: string): boolean {
	const selectedBranch = branchName.trim().replace(/\s+/gu, ' ').toLocaleLowerCase();
	if (!selectedBranch) return true;
	return branch.trim().replace(/\s+/gu, ' ').toLocaleLowerCase().includes(selectedBranch);
}

function parseLegacySetting(record: JsonRecord): TqmsSanghBranchFilterDocument | null {
	const content = asSettingRecord(parseSettingJson(record.inner_content ?? record.innerContent));
	if (content?.key !== 'tqms-sangh-branch-filter') return null;
	if (content.branchName !== undefined && typeof content.branchName !== 'string') {
		throw new Error('TQMS संघ शाखा फिल्टरको सुरक्षित गरिएको नाम अमान्य छ।');
	}
	const id = getSettingResourceId(record);
	if (!id) throw new Error('TQMS संघ शाखा फिल्टरको resource ID भेटिएन।');
	return { resourceId: id, branchName: (content.branchName ?? '').trim() };
}

export async function fetchTqmsSanghBranchFilter(): Promise<TqmsSanghBranchFilterDocument> {
	const grouped = await fetchGroupedSettingsDocument();
	if (findGroupedSettingRecord(grouped.rawRecords)) {
		return {
			resourceId: grouped.resourceId,
			branchName: grouped.settings.SanghBranch,
		};
	}

	const matches = grouped.rawRecords.flatMap((record) => {
		const setting = parseLegacySetting(record);
		return setting ? [setting] : [];
	});
	if (matches.length > 1) throw new Error('TQMS संघ शाखा फिल्टरका एकभन्दा बढी सेटिङ भेटिए।');
	return matches[0] ?? DEFAULT_TQMS_SANGH_BRANCH_FILTER;
}

export async function saveTqmsSanghBranchFilter(
	branchName: string,
	current: TqmsSanghBranchFilterDocument,
): Promise<TqmsSanghBranchFilterDocument> {
	const normalizedBranchName = branchName.trim();
	if (normalizedBranchName.length > 150) throw new Error('संघ शाखाको नाम १५० अक्षरभन्दा लामो हुन मिल्दैन।');
	if (!current.resourceId && !normalizedBranchName) return DEFAULT_TQMS_SANGH_BRANCH_FILTER;

	const saved = await updateGroupedSettingsSection(
		(grouped) => ({ ...grouped, SanghBranch: normalizedBranchName }),
		{ sanghBranch: normalizedBranchName, resourceIdHint: current.resourceId },
	);
	return { resourceId: saved.resourceId, branchName: normalizedBranchName };
}
