import { apiClient } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';

export interface TqmsSanghBranchFilterDocument {
	resourceId: string | null;
	branchName: string;
}

export const DEFAULT_TQMS_SANGH_BRANCH_FILTER: TqmsSanghBranchFilterDocument = {
	resourceId: null,
	branchName: '',
};

export function matchesTqmsSanghBranch(branch: string, branchName: string): boolean {
	const selectedBranch = branchName.trim().toLocaleLowerCase();
	if (!selectedBranch) return true;
	return branch
		.split(/[;,]/u)
		.map((branchEntry) => branchEntry.trim().toLocaleLowerCase())
		.some((branchEntry) => Boolean(branchEntry) && branchEntry === selectedBranch);
}

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
	return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : null;
}

function parseJson(value: unknown): unknown {
	if (typeof value !== 'string') return value;
	try {
		return JSON.parse(value) as unknown;
	} catch {
		return value;
	}
}

function rows(value: unknown): JsonRecord[] {
	const parsed = parseJson(value);
	if (Array.isArray(parsed)) {
		return parsed.flatMap((item): JsonRecord[] => {
			const record = asRecord(item);
			if (record) return [record];
			if (Array.isArray(item)) return rows(item);
			return [];
		});
	}
	const record = asRecord(parsed);
	if (!record) throw new Error('TQMS संघ शाखा फिल्टर सेटिङ पढ्न सकिएन।');
	for (const key of ['data', 'items', 'results', 'resources', 'records', 'result']) {
		if (record[key] !== undefined) return rows(record[key]);
	}
	if (record.resource_name === 'SettingResource' || record.resourceName === 'SettingResource') return [record];
	if (record.inner_content !== undefined || record.innerContent !== undefined) return [record];
	throw new Error('TQMS संघ शाखा फिल्टर सेटिङ पढ्न सकिएन।');
}

function resourceId(record: JsonRecord): string | null {
	const id = record.id ?? record.resourceId ?? record.resource_id;
	return typeof id === 'string' || typeof id === 'number' ? String(id) : null;
}

function responseResourceId(value: unknown): string | null {
	const record = asRecord(value);
	if (!record) return null;
	const directId = resourceId(record);
	if (directId) return directId;
	for (const key of ['data', 'result', 'resource']) {
		const nestedId = responseResourceId(record[key]);
		if (nestedId) return nestedId;
	}
	return null;
}

function parseSetting(record: JsonRecord): TqmsSanghBranchFilterDocument | null {
	const content = asRecord(parseJson(record.inner_content ?? record.innerContent));
	if (content?.key !== 'tqms-sangh-branch-filter') return null;
	if (content.branchName !== undefined && typeof content.branchName !== 'string') {
		throw new Error('TQMS संघ शाखा फिल्टरको सुरक्षित गरिएको नाम अमान्य छ।');
	}
	const id = resourceId(record);
	if (!id) throw new Error('TQMS संघ शाखा फिल्टरको resource ID भेटिएन।');
	return { resourceId: id, branchName: (content.branchName ?? '').trim() };
}

export async function fetchTqmsSanghBranchFilter(): Promise<TqmsSanghBranchFilterDocument> {
	let payload: unknown;
	try {
		payload = await apiClient.get<unknown>(endpoints.resources.setting.list());
	} catch (error) {
		if (
			error instanceof Error
			&& /^Request failed \(404\):\s*No resources found for resource name\s*:?\s*SettingResource\b/iu.test(error.message)
		) {
			return DEFAULT_TQMS_SANGH_BRANCH_FILTER;
		}
		throw error;
	}

	const matches = rows(payload).flatMap((record) => {
		const setting = parseSetting(record);
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

	const request = {
		resource_name: 'SettingResource',
		inner_content: {
			key: 'tqms-sangh-branch-filter',
			branchName: normalizedBranchName,
		},
		external_content: null,
	};
	if (current.resourceId) {
		const id = /^\d+$/u.test(current.resourceId) ? Number(current.resourceId) : current.resourceId;
		await apiClient.put<void>(endpoints.resources.setting.update(current.resourceId), { ...request, id });
		return { resourceId: current.resourceId, branchName: normalizedBranchName };
	}

	const created = await apiClient.post<unknown>(endpoints.resources.setting.create(), request);
	const id = responseResourceId(created);
	if (!id) throw new Error('TQMS संघ शाखा फिल्टर सुरक्षित गर्दा resource ID प्राप्त भएन।');
	return { resourceId: id, branchName: normalizedBranchName };
}
