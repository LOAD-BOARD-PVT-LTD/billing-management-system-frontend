import { z } from 'zod';

import { calculateVatAmount } from '@/lib/receipts/vat-apply-rule';

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/gu, ' ');
}

const normalLineItemSchema = z
  .object({
    label: z.string().max(120).transform(normalizeText).pipe(z.string().min(1)),
    amount: z.number().finite().min(0.01).max(1_000_000),
    note: z.string().max(140).transform(normalizeText).optional(),
  })
  .strict();

const normalEntitySchema = z
  .object({
    billingEntity: z.string().max(160).transform(normalizeText).pipe(z.string().min(1)),
    manualItems: z.array(normalLineItemSchema).min(1).max(100),
  })
  .strict();

export const normalCashPaymentSchema = z
  .object({
    customerId: z.string().trim().min(1).max(128),
    branchId: z.string().trim().min(1).max(128).optional(),
    paymentDateBs: z
      .string()
      .trim()
      .regex(/^[0-9]{4}[-/][0-9]{2}[-/][0-9]{2}$/u)
      .transform((value) => value.replace(/\//gu, '-')),
    selectedFiscalYear: z.string().trim().regex(/^[0-9]{4}\/[0-9]{2}$/u).optional(),
    notes: z.string().trim().max(2000).optional(),
    entities: z.array(normalEntitySchema).min(1).max(20),
  })
  .strict();

export type NormalCashPaymentInput = z.infer<typeof normalCashPaymentSchema>;
export type NormalEntityInput = NormalCashPaymentInput['entities'][number];

export function buildNormalInvoiceComputation(
  entity: NormalEntityInput,
  vatApplicable: boolean,
  vatRatePct: number,
) {
  const lineItems = entity.manualItems.map((item) => ({
    kind: 'CHARGE',
    label: item.label,
    quantity: 1,
    rate: item.amount,
    amount: item.amount,
    note: item.note || null,
  }));
  const additionalFees = lineItems.reduce((total, item) => total + item.amount, 0);
  const vatAmount = vatApplicable ? calculateVatAmount(additionalFees, vatRatePct) : 0;
  return {
    billingEntity: entity.billingEntity,
    lineItems,
    baseAmount: 0,
    additionalFees,
    vatAmount,
    totalAmount: additionalFees + vatAmount,
  };
}
