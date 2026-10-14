import { z } from 'zod';

import type { BillingEntityFields, BillingEntityRecord } from '../types/billing-entity.types';

const billingEntityFieldsSchema = z.object({
  Entity: z.string().trim().min(1, 'Entity name is required.'),
  'Registration Number': z.string().trim().min(1, 'Registration number is required.'),
  'PAN number': z.string().trim().min(1, 'PAN number is required.'),
  'Contact Person': z.string().trim().min(1, 'Contact person is required.'),
  Email: z.string().trim().email('Enter a valid email address.'),
  'Phone Number': z.string().trim().min(1, 'Phone number is required.'),
  'Hotline Number': z.string().trim(),
  Website: z.string().trim(),
  Address: z.string().trim().min(1, 'Address is required.'),
  Status: z.enum(['ACTIVE', 'INACTIVE']),
});

function parseSerializedJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

const billingEntityResourceSchema = z.object({
  id: z.union([z.number(), z.string().trim().min(1)]),
  resource_name: z.literal('BillingEntityResource'),
  inner_content: z.preprocess(parseSerializedJson, billingEntityFieldsSchema),
  external_content: z.unknown().nullable().optional(),
});

export const billingEntityFormSchema = billingEntityFieldsSchema;

export function toBillingEntityRequest(fields: BillingEntityFields, id?: string) {
  const parsed = billingEntityFormSchema.parse({
    Entity: fields.entity,
    'Registration Number': fields.registrationNumber,
    'PAN number': fields.panNumber,
    'Contact Person': fields.contactPerson,
    Email: fields.email,
    'Phone Number': fields.phoneNumber,
    'Hotline Number': fields.hotlineNumber,
    Website: fields.website,
    Address: fields.address,
    Status: fields.status,
  });

  const request = {
    resource_name: 'BillingEntityResource' as const,
    inner_content: parsed,
    external_content: null,
  };

  if (id === undefined) return request;

  const normalizedId = /^\d+$/u.test(id) ? Number(id) : id;
  return {
    id: normalizedId,
    ...request,
  };
}

export function parseBillingEntity(value: unknown): BillingEntityRecord {
  const result = billingEntityResourceSchema.safeParse(parseSerializedJson(value));
  if (!result.success) {
    const issue = result.error.issues[0];
    const details = issue
      ? `${issue.path.length ? `${issue.path.join('.')}: ` : ''}${issue.message}`
      : 'Invalid response format';
    throw new Error(`Could not read billing entity: ${details}`);
  }

  const { inner_content: content } = result.data;
  return {
    id: String(result.data.id),
    entity: content.Entity,
    registrationNumber: content['Registration Number'],
    panNumber: content['PAN number'],
    contactPerson: content['Contact Person'],
    email: content.Email,
    phoneNumber: content['Phone Number'],
    hotlineNumber: content['Hotline Number'],
    website: content.Website,
    address: content.Address,
    status: content.Status,
  };
}

function getResourceList(value: unknown): unknown[] {
  const parsedValue = parseSerializedJson(value);
  if (parsedValue !== value) return getResourceList(parsedValue);
  value = parsedValue;

  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') {
    throw new Error('Could not read billing entities: expected a list response.');
  }

  const record = value as Record<string, unknown>;
  if (record.resource_name === 'BillingEntityResource' && 'inner_content' in record) {
    return [record];
  }

  for (const key of ['data', 'items', 'results']) {
    const nested = record[key];
    if (Array.isArray(nested)) return nested;
    if (typeof nested === 'string' || (nested && typeof nested === 'object')) return getResourceList(nested);
  }

  throw new Error('Could not read billing entities: expected a list response.');
}

export function parseBillingEntityList(value: unknown): BillingEntityRecord[] {
  return getResourceList(value).map(parseBillingEntity);
}

export function validateBillingEntity(fields: BillingEntityFields): string | null {
  const result = billingEntityFormSchema.safeParse({
    Entity: fields.entity,
    'Registration Number': fields.registrationNumber,
    'PAN number': fields.panNumber,
    'Contact Person': fields.contactPerson,
    Email: fields.email,
    'Phone Number': fields.phoneNumber,
    'Hotline Number': fields.hotlineNumber,
    Website: fields.website,
    Address: fields.address,
    Status: fields.status,
  });

  return result.success ? null : result.error.issues[0]?.message ?? 'Check the billing entity details.';
}
