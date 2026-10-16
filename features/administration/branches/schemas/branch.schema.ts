import { z } from 'zod';
import type { BranchFields, BranchRecord } from '../types/branch.types';

const branchContentSchema = z.object({
  name: z.string().trim().min(1),
  code: z.string().trim().min(1),
  address: z.string().trim(),
  phone: z.string().trim(),
  contactPerson: z.string().trim(),
  billingEntityIds: z.array(z.union([z.number(), z.string()])).default([]),
  allowManualReceiptAmountOverride: z.boolean().default(false),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

function parseJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

const branchResourceSchema = z.object({
  id: z.union([z.number(), z.string().trim().min(1)]),
  resource_name: z.literal('BranchResource'),
  inner_content: z.preprocess(parseJson, branchContentSchema),
  external_content: z.unknown().nullable().optional(),
});

export function toBranchRequest(fields: BranchFields, id?: string) {
  const request = {
    resource_name: 'BranchResource' as const,
    inner_content: {
      name: fields.name.trim(),
      code: fields.code.trim(),
      address: fields.address.trim(),
      phone: fields.phone.trim(),
      contactPerson: fields.contactPerson.trim(),
      billingEntityIds: fields.billingEntityIds.map((id) => /^\d+$/u.test(id) ? Number(id) : id),
      allowManualReceiptAmountOverride: fields.allowManualReceiptAmountOverride,
      status: fields.status,
    },
    external_content: null,
  };

  if (id === undefined) return request;

  return {
    id: /^\d+$/u.test(id) ? Number(id) : id,
    ...request,
  };
}

export function parseBranch(value: unknown): BranchRecord {
  const result = branchResourceSchema.safeParse(parseJson(value));
  if (!result.success) {
    const issue = result.error.issues[0];
    const details = issue
      ? `${issue.path.length ? `${issue.path.join('.')}: ` : ''}${issue.message}`
      : 'Invalid response format';
    throw new Error(`Could not read branch: ${details}`);
  }

  const { inner_content: content } = result.data;
  return {
    id: String(result.data.id),
    name: content.name,
    code: content.code,
    address: content.address,
    phone: content.phone,
    contactPerson: content.contactPerson,
    billingEntityIds: content.billingEntityIds.map(String),
    allowManualReceiptAmountOverride: content.allowManualReceiptAmountOverride,
    status: content.status,
  };
}

function resourceList(value: unknown): unknown[] {
  const parsed = parseJson(value);
  if (parsed !== value) return resourceList(parsed);
  if (Array.isArray(parsed)) return parsed;
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Could not read branches: expected a list response.');
  }
  const record = parsed as Record<string, unknown>;
  if (record.resource_name === 'BranchResource' && 'inner_content' in record) return [record];

  for (const key of ['data', 'items', 'results']) {
    const nested = record[key];
    if (Array.isArray(nested) || (nested && typeof nested === 'object') || typeof nested === 'string') {
      return resourceList(nested);
    }
  }
  throw new Error('Could not read branches: expected a list response.');
}

export function parseBranchList(value: unknown): BranchRecord[] {
  return resourceList(value).map(parseBranch);
}
