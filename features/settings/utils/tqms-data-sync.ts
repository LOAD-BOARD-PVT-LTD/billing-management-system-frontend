type JsonRecord = Record<string, unknown>;

export type TqmsSkippedRecord = {
  vehicleId: string;
  owner: string;
  phone: string;
  vehicleType: string;
  branch: string;
  address: string;
  citizenshipNumber: string;
  registrationStatus: string;
  reason: string;
};

export type TqmsDataSyncResult = {
  status: string;
  lastSuccessfulAt: string;
  foundCount: number | null;
  syncedCount: number | null;
  skippedCount: number | null;
  registryRows: number | null;
  documentRows: number | null;
  branchFilter: string;
  lastError: string;
  skippedRecords: TqmsSkippedRecord[];
};

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function keyName(value: string): string {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]/gu, '');
}

function recordsInResponse(payload: unknown): JsonRecord[] {
  const queue: unknown[] = [payload];
  const records: JsonRecord[] = [];
  while (queue.length) {
    const current = queue.shift();
    const record = asRecord(current);
    if (!record) continue;
    records.push(record);
    for (const [key, value] of Object.entries(record)) {
      if (['data', 'result', 'summary', 'syncresult', 'details'].includes(keyName(key))) {
        if (Array.isArray(value)) queue.push(...value);
        else queue.push(value);
      }
    }
  }
  return records;
}

function findValue(records: JsonRecord[], names: string[]): unknown {
  const keys = new Set(names.map(keyName));
  for (const record of records) {
    const entry = Object.entries(record).find(([key, value]) => keys.has(keyName(key)) && value !== undefined && value !== null);
    if (entry) return entry[1];
  }
  return undefined;
}

function readText(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

function readCount(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function parseSkippedRecord(value: unknown): TqmsSkippedRecord | null {
  const record = asRecord(value);
  if (!record) return null;
  const skipped: TqmsSkippedRecord = {
    vehicleId: readText(findValue([record], ['vehicleId', 'vehicle_id', 'id'])),
    owner: readText(findValue([record], ['owner', 'ownerName', 'vehicleOwner', 'sawariDhaniName'])),
    phone: readText(findValue([record], ['phone', 'phoneNumber', 'contactNumber'])),
    vehicleType: readText(findValue([record], ['vehicleType', 'type'])),
    branch: readText(findValue([record], ['sanghBranch', 'branch', 'branchName'])),
    address: readText(findValue([record], ['address'])),
    citizenshipNumber: readText(findValue([record], ['citizenshipNumber', 'citizenshipNo', 'identityNumber'])),
    registrationStatus: readText(findValue([record], ['registrationStatus', 'status'])),
    reason: readText(findValue([record], ['reason', 'error', 'message'])),
  };
  return Object.values(skipped).some(Boolean) ? skipped : null;
}

export function parseTqmsDataSyncResult(payload: unknown): TqmsDataSyncResult {
  const records = recordsInResponse(payload);
  const skippedPayload = findValue(records, ['skippedRecords', 'skippedVehicles', 'skippedItems', 'skipped']);
  const skippedRecords = Array.isArray(skippedPayload)
    ? skippedPayload.map(parseSkippedRecord).filter((record): record is TqmsSkippedRecord => record !== null)
    : [];
  const parsedSkippedCount = readCount(findValue(records, ['skippedCount', 'totalSkipped', 'skipped', 'failedCount']));
  return {
    status: readText(findValue(records, ['status', 'syncStatus'])),
    lastSuccessfulAt: readText(findValue(records, ['lastSuccessfulAt', 'lastSuccessAt', 'completedAt', 'syncedAt'])),
    foundCount: readCount(findValue(records, ['foundCount', 'totalFound', 'found', 'totalRecords'])),
    syncedCount: readCount(findValue(records, ['syncedCount', 'totalSynced', 'synced', 'successCount'])),
    skippedCount: parsedSkippedCount ?? (Array.isArray(skippedPayload) ? skippedRecords.length : null),
    registryRows: readCount(findValue(records, ['registryRows', 'registryRowCount', 'vehicleRows'])),
    documentRows: readCount(findValue(records, ['documentRows', 'documentRowCount', 'complianceRows'])),
    branchFilter: readText(findValue(records, ['branchFilter', 'branchName'])),
    lastError: readText(findValue(records, ['lastError', 'errorMessage', 'syncError'])),
    skippedRecords,
  };
}
