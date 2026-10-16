import { z } from 'zod';
import { Role } from '@/types/auth';
import type { UserFields, UserRecord, UserUpdateFields } from '../types/user.types';

export const userFormSchema = z.object({
  name: z.string().trim().min(2, 'नाम कम्तीमा २ अक्षरको हुनुपर्छ।').max(100, 'नाम १०० अक्षरभन्दा लामो हुन मिल्दैन।'),
  email: z.string().trim().email('मान्य इमेल ठेगाना लेख्नुहोस्।').max(254, 'इमेल ठेगाना धेरै लामो भयो।'),
  password: z.string().min(8, 'पासवर्ड कम्तीमा ८ वर्णको हुनुपर्छ।').max(128, 'पासवर्ड १२८ वर्णभन्दा लामो हुन मिल्दैन।'),
  confirmPassword: z.string().min(1, 'पासवर्ड पुष्टि गर्नुहोस्।'),
  role: z.enum([Role.Admin, Role.User, Role.Operator], { message: 'भूमिका छान्नुहोस्।' }),
  branchId: z.string().trim().min(1, 'शाखा छान्नुहोस्।'),
  status: z.enum(['Active', 'Inactive']),
}).superRefine((fields, context) => {
  if (fields.password !== fields.confirmPassword) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['confirmPassword'],
      message: 'पासवर्ड र पुष्टि मिल्नुपर्छ।',
    });
  }
});

export const userUpdateSchema = z.object({
  name: z.string().trim().min(2, 'नाम कम्तीमा २ अक्षरको हुनुपर्छ।').max(100, 'नाम १०० अक्षरभन्दा लामो हुन मिल्दैन।'),
  email: z.string().trim().email('मान्य इमेल ठेगाना लेख्नुहोस्।').max(254, 'इमेल ठेगाना धेरै लामो भयो।'),
  password: z.string().max(128, 'पासवर्ड १२८ वर्णभन्दा लामो हुन मिल्दैन।').optional(),
  confirmPassword: z.string().optional(),
  role: z.enum([Role.Admin, Role.User, Role.Operator], { message: 'भूमिका छान्नुहोस्।' }),
  branchId: z.string().trim().min(1, 'शाखा छान्नुहोस्।'),
  status: z.enum(['Active', 'Inactive']),
}).superRefine((fields, context) => {
  if (fields.password && fields.password.length < 8) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['password'],
      message: 'पासवर्ड कम्तीमा ८ वर्णको हुनुपर्छ।',
    });
  }
  if (fields.confirmPassword && !fields.password) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['password'],
      message: 'नयाँ पासवर्ड पुष्टि गर्न पहिले पासवर्ड लेख्नुहोस्।',
    });
  }
  if (fields.password && fields.password !== fields.confirmPassword) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['confirmPassword'],
      message: 'पासवर्ड र पुष्टि मिल्नुपर्छ।',
    });
  }
});

function parseJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

const userContentSchema = z.object({
  name: z.string().trim().optional().default(''),
  email: z.string().trim().email(),
  role: z.string().trim().min(1),
  status: z.string().trim().optional().nullable(),
  branchId: z.union([z.number(), z.string()]).nullable().optional(),
});

const userResourceSchema = z.object({
  id: z.union([z.number(), z.string().trim().min(1)]),
  resource_name: z.literal('UserResource'),
  inner_content: z.preprocess(parseJson, userContentSchema),
  external_content: z.unknown().nullable().optional(),
});

export function parseUser(value: unknown): UserRecord {
  const result = userResourceSchema.safeParse(parseJson(value));
  if (!result.success) {
    const issue = result.error.issues[0];
    const details = issue
      ? `${issue.path.length ? `${issue.path.join('.')}: ` : ''}${issue.message}`
      : 'Invalid response format';
    throw new Error(`Could not read user: ${details}`);
  }

  return {
    id: String(result.data.id),
    name: result.data.inner_content.name,
    email: result.data.inner_content.email,
    role: result.data.inner_content.role,
    status: result.data.inner_content.status ?? null,
    branchId: result.data.inner_content.branchId === undefined || result.data.inner_content.branchId === null
      ? null
      : String(result.data.inner_content.branchId),
  };
}

export function parseUserPassword(value: unknown): string {
  const parsed = parseJson(value);
  if (typeof parsed !== 'object' || parsed === null || !('inner_content' in parsed)) {
    throw new Error('Could not preserve user password: missing inner_content.');
  }

  const innerContent = parseJson(parsed.inner_content);
  if (typeof innerContent !== 'object' || innerContent === null || !('password' in innerContent)) {
    throw new Error('Could not preserve user password: the user resource did not include a password.');
  }

  const password = innerContent.password;
  if (typeof password !== 'string' || password.length === 0) {
    throw new Error('Could not preserve user password: the stored password is invalid.');
  }

  return password;
}

export function parseUserList(value: unknown): UserRecord[] {
  const parsed = parseJson(value);
  if (!Array.isArray(parsed)) {
    throw new Error('Could not read users: expected a list response.');
  }

  return parsed.map(parseUser);
}

export function toUserRequest(fields: UserFields) {
  const parsed = userFormSchema.parse({ ...fields, confirmPassword: fields.password });
  return {
    resource_name: 'UserResource' as const,
    inner_content: {
      name: parsed.name,
      email: parsed.email,
      password: parsed.password,
      role: parsed.role,
      branchId: /^\d+$/u.test(parsed.branchId) ? Number(parsed.branchId) : parsed.branchId,
      status: parsed.status,
    },
    external_content: null,
  };
}

export function toUserUpdateRequest(fields: UserUpdateFields, id?: string) {
  const parsed = userUpdateSchema.parse({
    ...fields,
    password: fields.password || undefined,
    confirmPassword: fields.password ? fields.password : undefined,
  });
  const request = {
    resource_name: 'UserResource' as const,
    inner_content: {
      name: parsed.name,
      email: parsed.email,
      ...(parsed.password ? { password: parsed.password } : {}),
      role: parsed.role,
      branchId: /^\d+$/u.test(parsed.branchId) ? Number(parsed.branchId) : parsed.branchId,
      status: parsed.status,
    },
    external_content: null,
  };

  if (id === undefined) return request;

  const normalizedId = id.trim();
  if (!normalizedId) throw new Error('A user ID is required.');

  return {
    id: /^\d+$/u.test(normalizedId) ? Number(normalizedId) : normalizedId,
    ...request,
  };
}
