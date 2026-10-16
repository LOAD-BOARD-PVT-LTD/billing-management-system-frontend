import { apiClient } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { receiptsKeys } from '@/lib/query/query-keys';
import { formatBranchReceiptNumber } from '@/lib/receipts/receipt-number-display';
import type { BillResourceContent, SavedBill } from '@/features/billing/model/bill.types';
import { fetchFiscalYearManagement } from '@/features/settings/api/fiscal-year-management.api';
import type { ReceiptRecord, ReceiptStatus } from '../model/receipt';

type JsonRecord = Record<string, unknown>;

function parseJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function asRecord(value: unknown): JsonRecord | null {
  const parsed = parseJson(value);
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? parsed as JsonRecord
    : null;
}

function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

function number(value: unknown, fallback?: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  if (fallback !== undefined) return fallback;
  throw new Error('BillResource contains an invalid amount.');
}

function requiredText(record: JsonRecord, key: string, context: string): string {
  const value = text(record[key]);
  if (!value) throw new Error(`BillResource is missing ${context}.${key}.`);
  return value;
}

function resourceId(record: JsonRecord): string {
  for (const key of ['id', 'resourceId', 'resource_id']) {
    const value = text(record[key]);
    if (value) return value;
  }
  throw new Error('BillResource response is missing its resource ID.');
}

function status(value: unknown): ReceiptStatus {
  const normalized = text(value).toUpperCase();
  if (normalized === 'CANCELLED' || normalized === 'CANCELED') return 'CANCELLED';
  if (normalized === 'PENDING' || normalized === 'UNPAID') return 'PENDING';
  return 'PAID';
}

function extractRows(value: unknown): unknown[] {
  const parsed = parseJson(value);
  if (Array.isArray(parsed)) return parsed;
  const record = asRecord(parsed);
  if (!record) throw new Error('Could not read receipts: expected a BillResource list.');
  if ('inner_content' in record) return [record];

  for (const key of ['data', 'items', 'results']) {
    if (record[key] !== undefined) return extractRows(record[key]);
  }
  throw new Error('Could not read receipts: expected a BillResource list.');
}

export function parseBillResource(value: unknown): ReceiptRecord {
  const resource = asRecord(value);
  if (!resource) throw new Error('Could not read receipt: expected a BillResource object.');
  if (resource.resource_name !== undefined && resource.resource_name !== 'BillResource') {
    throw new Error(`Could not read receipt: expected BillResource, received ${text(resource.resource_name)}.`);
  }

  const id = resourceId(resource);
  const content = asRecord(resource.inner_content);
  if (!content) throw new Error('Could not read receipt: BillResource.inner_content is missing.');
  const vehicle = asRecord(content.vehicle);
  const branch = asRecord(content.branch);
  const fiscalYear = asRecord(content.fiscalYear);
  const fiscalYearId = text(content.fiscalYearId ?? fiscalYear?.id);
  if (!vehicle || !branch || !fiscalYearId) {
    throw new Error(`Could not read receipt ${id}: vehicle, branch, or fiscal year ID is missing.`);
  }
  const rawItems = parseJson(content.items);
  if (!Array.isArray(rawItems)) throw new Error(`Could not read receipt ${id}: items must be a list.`);
  const items = rawItems.map((item, index) => {
    const row = asRecord(item);
    if (!row) throw new Error(`Could not read receipt ${id}: item ${index + 1} is invalid.`);
    return {
      feeHeadId: text(row.feeHeadId),
      title: text(row.title),
      billingEntityId: text(row.billingEntityId),
      billingEntity: text(row.billingEntity),
      ruleId: text(row.ruleId) || null,
      amount: number(row.amount),
    };
  });

  const subtotal = number(content.subtotal, items.reduce((sum, item) => sum + item.amount, 0));
  const discount = number(content.discount, 0);
  const normalizedContent: BillResourceContent = {
    vehicle: {
      id: text(vehicle.id),
      vehicleNumber: requiredText(vehicle, 'vehicleNumber', 'vehicle'),
      vehicleType: text(vehicle.vehicleType),
      ownerName: text(vehicle.ownerName),
      phone: text(vehicle.phone),
      address: text(vehicle.address),
    },
    branch: {
      id: text(branch.id),
      name: requiredText(branch, 'name', 'branch'),
      BranchCode: text(branch.BranchCode ?? branch.branchCode ?? branch.code),
      address: text(branch.address),
      phone: text(branch.phone),
      contactPerson: text(branch.contactPerson),
    },
    fiscalYearId,
    fiscalYearName: text(fiscalYear?.name) || fiscalYearId,
    billingDate: requiredText(content, 'billingDate', 'inner_content'),
    paidAt: text(content.paidAt) || undefined,
    periodStart: text(content.periodStart),
    periodEnd: text(content.periodEnd),
    billingMonths: number(content.billingMonths, 0),
    items,
    subtotal,
    discount,
    total: number(content.total, Math.max(0, subtotal - discount)),
    paymentMethod: text(content.paymentMethod),
    note: text(content.note),
  };
  const receiptNumber = formatBranchReceiptNumber(normalizedContent.branch.BranchCode, id);
  const createdAt = text(resource.createdAt ?? resource.created_at)
    || text(content.paidAt)
    || `${normalizedContent.billingDate}T00:00:00`;
  const bill: SavedBill = { id, receiptNumber, createdAt, content: normalizedContent };
  const finalDigits = normalizedContent.vehicle.vehicleNumber.match(/[0-9०-९]+$/u)?.[0] ?? '';
  const firstItemEntity = normalizedContent.items.find((item) => item.billingEntity)?.billingEntity ?? '';
  const lastCorrection = auditHistory(content).filter((entry) => entry.action === 'CORRECTED').at(-1);

  return {
    id,
    receiptNumber,
    fiscalYear: normalizedContent.fiscalYearName,
    vehicleNumber: normalizedContent.vehicle.vehicleNumber,
    finalDigits,
    customerName: normalizedContent.vehicle.ownerName,
    organizationName: text(vehicle.organizationName ?? vehicle.companyName) || firstItemEntity,
    billingDate: normalizedContent.billingDate,
    paymentDate: normalizedContent.billingDate,
    validUntil: normalizedContent.periodEnd,
    paymentMethod: normalizedContent.paymentMethod,
    status: status(resource.status ?? content.status),
    totalAmount: normalizedContent.total,
    branchName: normalizedContent.branch.name,
    userName: text(resource.userName ?? resource.createdByName ?? content.userName) || '—',
    bill,
    resourceContent: content,
    externalContent: resource.external_content ?? resource.externalContent ?? null,
    lastCorrection: lastCorrection
      ? { reason: text(lastCorrection.reason), at: text(lastCorrection.at) }
      : undefined,
  };
}

export interface ReceiptCorrection {
  vehicleNumber: string;
  ownerName: string;
  validUntil: string;
}

function auditHistory(content: JsonRecord): JsonRecord[] {
  const value = content.auditHistory;
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is JsonRecord => Boolean(entry && typeof entry === 'object' && !Array.isArray(entry)));
}

function resourceIdValue(id: string): string | number {
  return /^\d+$/u.test(id) ? Number(id) : id;
}

async function updateReceiptResource(
  receipt: ReceiptRecord,
  content: JsonRecord,
  externalContent: unknown = receipt.externalContent ?? null,
): Promise<void> {
  await apiClient.put<void>(endpoints.resources.bill.update(receipt.id), {
    id: resourceIdValue(receipt.id),
    resource_name: 'BillResource',
    inner_content: content,
    external_content: externalContent,
  });
}

export async function cancelReceipt(receipt: ReceiptRecord, reason: string): Promise<void> {
  const normalizedReason = reason.trim();
  if (!normalizedReason) throw new Error('रसिद रद्द गर्ने कारण लेख्नुहोस्।');
  const content = receipt.resourceContent ?? asRecord(receipt.bill.content);
  if (!content) throw new Error('BillResource content is unavailable.');
  const cancelledAt = new Date().toISOString();
  await updateReceiptResource(receipt, {
    ...content,
    status: 'CANCELLED',
    auditHistory: [
      ...auditHistory(content),
      { action: 'CANCELLED', reason: normalizedReason, at: cancelledAt },
    ],
  });
}

export async function correctReceipt(
  receipt: ReceiptRecord,
  correction: ReceiptCorrection,
  reason: string,
): Promise<void> {
  const normalizedReason = reason.trim();
  if (!normalizedReason) throw new Error('रसिद सुधार गर्ने कारण लेख्नुहोस्।');
  const vehicleNumber = correction.vehicleNumber.trim();
  const ownerName = correction.ownerName.trim();
  const validUntil = correction.validUntil.trim();
  if (!vehicleNumber || !ownerName || !validUntil) {
    throw new Error('सवारी नम्बर, नाम र भुक्तानी मिति सम्म आवश्यक छन्।');
  }
  if (Number.isNaN(Date.parse(`${validUntil}T00:00:00`))) {
    throw new Error('भुक्तानी मिति सम्म मान्य मिति हुनुपर्छ।');
  }

  const content = receipt.resourceContent ?? asRecord(receipt.bill.content);
  if (!content) throw new Error('BillResource content is unavailable.');
  const vehicle = asRecord(content.vehicle);
  if (!vehicle) throw new Error('BillResource मा सवारी विवरण उपलब्ध छैन।');
  const correctedAt = new Date().toISOString();
  await updateReceiptResource(receipt, {
    ...content,
    vehicle: { ...vehicle, vehicleNumber, ownerName },
    periodEnd: validUntil,
    auditHistory: [
      ...auditHistory(content),
      { action: 'CORRECTED', reason: normalizedReason, at: correctedAt },
    ],
  });
}

export async function fetchReceipts(signal?: AbortSignal): Promise<ReceiptRecord[]> {
  let payload: unknown;
  try {
    payload = await apiClient.get<unknown>(endpoints.resources.bill.list(), { signal });
  } catch (error) {
    if (
      error instanceof Error
      && /^Request failed \(404\):\s*No resources found for resource name\s*:?\s*BillResource\b/iu.test(error.message)
    ) {
      return [];
    }
    throw error;
  }

  const [receipts, fiscalYearSettings] = await Promise.all([
    Promise.resolve(extractRows(payload).map(parseBillResource)),
    fetchFiscalYearManagement(),
  ]);
  const fiscalYearNames = new Map(fiscalYearSettings.fiscalYears.map((year) => [year.id, year.name]));
  return receipts.map((receipt) => {
    const fiscalYearName = fiscalYearNames.get(receipt.bill.content.fiscalYearId) ?? receipt.bill.content.fiscalYearName;
    return {
      ...receipt,
      fiscalYear: fiscalYearName,
      bill: {
        ...receipt.bill,
        content: { ...receipt.bill.content, fiscalYearName },
      },
    };
  });
}

export { receiptsKeys };
