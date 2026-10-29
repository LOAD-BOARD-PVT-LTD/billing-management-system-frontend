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
  const vehicle = asRecord(content.vehicle) ?? {};
  const customer = asRecord(content.customer);
  const branch = asRecord(content.branch);
  const createdBy = asRecord(content.createdBy ?? content.created_by);
  const fiscalYear = asRecord(content.fiscalYear);
  const fiscalYearId = text(content.fiscalYearId ?? fiscalYear?.id);
  if (!branch || !fiscalYearId) {
    throw new Error(`Could not read receipt ${id}: branch or fiscal year ID is missing.`);
  }
  const billingType = text(content.billingType).toUpperCase() === 'GENERAL' || (!content.vehicle && customer)
    ? 'GENERAL'
    : 'MEMBERSHIP';
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
  const customerName = text(customer?.name) || text(vehicle.ownerName);
  const customerPhone = text(customer?.phone) || text(vehicle.phone);
  const customerAddress = text(customer?.address) || text(vehicle.address);
  const normalizedContent: BillResourceContent = {
    billingType,
    vehicle: {
      id: text(vehicle.id),
      vehicleNumber: text(vehicle.vehicleNumber),
      vehicleType: text(vehicle.vehicleType),
      ownerName: customerName,
      phone: customerPhone,
      address: customerAddress,
    },
    ...(customer ? {
      customer: {
        name: customerName,
        phone: customerPhone,
        address: customerAddress,
        panNumber: text(customer.panNumber ?? customer.pan),
      },
    } : {}),
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
    ...(createdBy ? {
      createdBy: {
        id: text(createdBy.id),
        name: text(createdBy.name ?? createdBy.displayName),
        username: text(createdBy.username ?? createdBy.email),
      },
    } : {}),
  };
  const receiptNumber = formatBranchReceiptNumber(normalizedContent.branch.BranchCode, id);
  const createdAt = text(resource.createdAt ?? resource.created_at)
    || text(content.paidAt)
    || `${normalizedContent.billingDate}T00:00:00`;
  const bill: SavedBill = { id, receiptNumber, createdAt, content: normalizedContent };
  const finalDigits = normalizedContent.vehicle.vehicleNumber.match(/[0-9०-९]+$/u)?.[0] ?? '';
  const firstItemEntity = normalizedContent.items.find((item) => item.billingEntity)?.billingEntity ?? '';
  const history = auditHistory(content);
  const printHistory = history.filter((entry) => entry.action === 'PRINTED');
  const printedCopyCount = printHistory.reduce((total, entry) => {
    const copies = Number(entry.copyCount ?? entry.copies ?? 1);
    return total + (Number.isInteger(copies) && copies > 0 ? copies : 1);
  }, 0);
  const lastPrintedAt = printHistory.map((entry) => text(entry.at)).filter(Boolean).at(-1);
  const lastCorrection = history.filter((entry) => entry.action === 'CORRECTED').at(-1);

  return {
    id,
    billingType,
    customerPhone,
    customerPanNumber: text(customer?.panNumber ?? customer?.pan),
    receiptNumber,
    fiscalYear: normalizedContent.fiscalYearName,
    vehicleNumber: normalizedContent.vehicle.vehicleNumber,
    finalDigits,
    customerName: customerName || '—',
    organizationName: text(customer?.organizationName)
      || text(vehicle.organizationName ?? vehicle.companyName)
      || firstItemEntity,
    billingDate: normalizedContent.billingDate,
    paymentDate: normalizedContent.billingDate,
    validUntil: normalizedContent.periodEnd,
    paymentMethod: normalizedContent.paymentMethod,
    status: status(resource.status ?? content.status),
    totalAmount: normalizedContent.total,
    branchName: normalizedContent.branch.name,
    userName: text(
      createdBy?.name
      ?? createdBy?.username
      ??
      resource.userName
      ?? resource.username
      ?? resource.createdByName
      ?? resource.createdByUsername
      ?? resource.created_by_name
      ?? content.userName
      ?? content.username
      ?? content.createdByUsername,
    ) || '—',
    bill,
    resourceContent: content,
    externalContent: resource.external_content ?? resource.externalContent ?? null,
    printedCopyCount,
    lastPrintedAt,
    lastCorrection: lastCorrection
      ? { reason: text(lastCorrection.reason), at: text(lastCorrection.at) }
      : undefined,
  };
}

export interface ReceiptCorrection {
  ownerName: string;
  billingDate: string;
  periodStart: string;
  periodEnd: string;
  paymentMethod: string;
  items: BillResourceContent['items'];
  note: string;
}

function auditHistory(content: JsonRecord): JsonRecord[] {
  const value = content.auditHistory;
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is JsonRecord => Boolean(entry && typeof entry === 'object' && !Array.isArray(entry)));
}

function resourceIdValue(id: string): string | number {
  return /^\d+$/u.test(id) ? Number(id) : id;
}

function isValidIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
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

export async function recordReceiptPrint(
  id: string,
  resourceContent: unknown,
  externalContent: unknown,
  copyCount: number,
): Promise<Record<string, unknown>> {
  if (!Number.isInteger(copyCount) || copyCount < 1 || copyCount > 5) {
    throw new Error('प्रतिलिपि संख्या १ देखि ५ सम्म हुनुपर्छ।');
  }
  const content = asRecord(resourceContent);
  if (!content) throw new Error('रसिदको विवरण उपलब्ध नभएकाले प्रिन्ट अभिलेख राख्न सकिएन।');
  const at = new Date().toISOString();
  const updatedContent = {
    ...content,
    auditHistory: [
      ...auditHistory(content),
      { action: 'PRINTED', copyCount, at },
    ],
  };
  await apiClient.put<void>(endpoints.resources.bill.update(id), {
    id: resourceIdValue(id),
    resource_name: 'BillResource',
    inner_content: updatedContent,
    external_content: externalContent ?? null,
  });
  return updatedContent;
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
  const ownerName = correction.ownerName.trim();
  const billingDate = correction.billingDate.trim();
  const periodStart = correction.periodStart.trim();
  const periodEnd = correction.periodEnd.trim();
  const paymentMethod = correction.paymentMethod.trim();
  if (!ownerName || !billingDate || !periodStart || !periodEnd || !paymentMethod) {
    throw new Error('नाम, भुक्तानी विधि र सबै मितिहरू आवश्यक छन्।');
  }
  const dates = [billingDate, periodStart, periodEnd];
  if (dates.some((date) => !isValidIsoDate(date))) {
    throw new Error('भुक्तानी र सेवा अवधिका मितिहरू मान्य हुनुपर्छ।');
  }
  if (periodStart > periodEnd) throw new Error('सेवा सुरु मिति समाप्ति मितिभन्दा पछि हुन मिल्दैन।');
  if (!correction.items.length) throw new Error('कम्तीमा एउटा शुल्क शीर्षक आवश्यक छ।');
  const items = correction.items.map((item) => {
    if (!item.title.trim() || !Number.isFinite(item.amount) || item.amount < 0) {
      throw new Error('शुल्क शीर्षक र मान्य रकम आवश्यक छन्।');
    }
    return { ...item, title: item.title.trim() };
  });
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  if (!Number.isFinite(subtotal)) throw new Error('शुल्कको जम्मा रकम मान्य छैन।');

  const content = receipt.resourceContent ?? asRecord(receipt.bill.content);
  if (!content) throw new Error('BillResource content is unavailable.');
  const vehicle = asRecord(content.vehicle);
  if (!vehicle) throw new Error('BillResource मा सवारी विवरण उपलब्ध छैन।');
  const discount = number(content.discount, 0);
  const correctedAt = new Date().toISOString();
  await updateReceiptResource(receipt, {
    ...content,
    vehicle: { ...vehicle, ownerName },
    billingDate,
    periodStart,
    periodEnd,
    paymentMethod,
    items,
    subtotal,
    total: Math.max(0, subtotal - discount),
    note: correction.note.trim(),
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
