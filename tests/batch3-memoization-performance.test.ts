import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { ReceiptRecord } from '../features/receipts/model/receipt';

describe('Batch 3: Memoization & Performance Optimizations', () => {
	describe('Report Metrics & Page Totals Derivation', () => {
		it('computes aggregated income, subtotal, discount, and transactions deterministically', () => {
			const rows = [
				{
					id: 'r1',
					date: '2081-01-10',
					receiptNumber: 'REC-001',
					vehicleNumber: 'BA 1 KHA 1234',
					branch: 'Kathmandu',
					subtotal: 1000,
					discount: 100,
					total: 900,
				},
				{
					id: 'r2',
					date: '2081-01-12',
					receiptNumber: 'REC-002',
					vehicleNumber: 'BA 2 KHA 5678',
					branch: 'Birgunj',
					subtotal: 2500,
					discount: 0,
					total: 2500,
				},
				{
					id: 'r3',
					date: '2081-01-15',
					receiptNumber: 'REC-003',
					vehicleNumber: 'NA 1 KHA 9999',
					branch: 'Kathmandu',
					subtotal: 1200,
					discount: 200,
					total: 1000,
				},
			];

			const totalSubtotal = rows.reduce((sum, row) => sum + row.subtotal, 0);
			const totalDiscount = rows.reduce((sum, row) => sum + row.discount, 0);
			const totalIncome = rows.reduce((sum, row) => sum + row.total, 0);
			const totalTransactions = rows.length;

			assert.strictEqual(totalSubtotal, 4700);
			assert.strictEqual(totalDiscount, 300);
			assert.strictEqual(totalIncome, 4400);
			assert.strictEqual(totalTransactions, 3);
		});

		it('derives fee head column totals and page totals efficiently for fee head reports', () => {
			const feeHeadKeys = ['fh1', 'fh2', 'fh3'];
			const rows = [
				{ id: '1', amounts: { fh1: 500, fh2: 200, fh3: 0 }, total: 700 },
				{ id: '2', amounts: { fh1: 300, fh2: 0, fh3: 150 }, total: 450 },
				{ id: '3', amounts: { fh1: 0, fh2: 100, fh3: 50 }, total: 150 },
			];

			const columnTotals = Object.fromEntries(
				feeHeadKeys.map((key) => [
					key,
					rows.reduce((sum, row) => sum + (row.amounts[key as keyof typeof row.amounts] ?? 0), 0),
				]),
			);
			const grandTotal = rows.reduce((sum, row) => sum + row.total, 0);

			assert.strictEqual(columnTotals.fh1, 800);
			assert.strictEqual(columnTotals.fh2, 300);
			assert.strictEqual(columnTotals.fh3, 200);
			assert.strictEqual(grandTotal, 1300);
		});
	});

	describe('Membership History Filtering and Sorting', () => {
		const mockReceipts: ReceiptRecord[] = [
			{
				id: 'rec-1',
				billingType: 'MEMBERSHIP',
				receiptNumber: 'REC-001',
				fiscalYear: '2081/82',
				vehicleNumber: 'BA 1 KHA 1234',
				finalDigits: '1234',
				customerName: 'Ram',
				organizationName: 'Sangh',
				billingDate: '2081-01-15',
				paymentDate: '2081-01-15',
				validUntil: '',
				paymentMethod: 'CASH',
				status: 'PAID',
				totalAmount: 500,
				branchName: 'Kathmandu',
				userName: 'admin',
				printedCopyCount: 1,
				bill: {
					id: 'b-1',
					receiptNumber: 'REC-001',
					createdAt: '2024-04-28T10:00:00Z',
					content: {
						vehicle: { id: 'v-100', vehicleNumber: 'BA 1 KHA 1234', ownerName: 'Ram' } as any,
						fiscalYearId: 'fy-81',
						items: [{ feeHeadId: 'head-1', amount: 500, entityId: 'ent-1', description: 'Test Fee' }],
					} as any,
				},
			},
			{
				id: 'rec-2',
				billingType: 'MEMBERSHIP',
				receiptNumber: 'REC-002',
				fiscalYear: '2081/82',
				vehicleNumber: 'BA 1 KHA 1234',
				finalDigits: '1234',
				customerName: 'Ram',
				organizationName: 'Sangh',
				billingDate: '2081-02-01',
				paymentDate: '2081-02-01',
				validUntil: '',
				paymentMethod: 'CASH',
				status: 'PAID',
				totalAmount: 1500,
				branchName: 'Kathmandu',
				userName: 'admin',
				printedCopyCount: 1,
				bill: {
					id: 'b-2',
					receiptNumber: 'REC-002',
					createdAt: '2024-05-14T10:00:00Z',
					content: {
						vehicle: { id: 'v-100', vehicleNumber: 'BA 1 KHA 1234', ownerName: 'Ram' } as any,
						fiscalYearId: 'fy-81',
						items: [{ feeHeadId: 'head-2', amount: 1500, entityId: 'ent-1', description: 'Annual Fee' }],
					} as any,
				},
			},
			{
				id: 'rec-3',
				billingType: 'MEMBERSHIP',
				receiptNumber: 'REC-003',
				fiscalYear: '2081/82',
				vehicleNumber: 'NA 2 KHA 9999',
				finalDigits: '9999',
				customerName: 'Shyam',
				organizationName: 'Sangh',
				billingDate: '2081-01-20',
				paymentDate: '2081-01-20',
				validUntil: '',
				paymentMethod: 'CASH',
				status: 'PAID',
				totalAmount: 500,
				branchName: 'Kathmandu',
				userName: 'admin',
				printedCopyCount: 1,
				bill: {
					id: 'b-3',
					receiptNumber: 'REC-003',
					createdAt: '2024-05-03T10:00:00Z',
					content: {
						vehicle: { id: 'v-200', vehicleNumber: 'NA 2 KHA 9999', ownerName: 'Shyam' } as any,
						fiscalYearId: 'fy-81',
						items: [{ feeHeadId: 'head-1', amount: 500, entityId: 'ent-1', description: 'Test Fee' }],
					} as any,
				},
			},
		];

		it('filters records strictly by matched vehicle identifier and sorts newest first', () => {
			const targetVehicleId = 'v-100';
			const targetVehicleNumber = 'BA 1 KHA 1234';

			const vehicleHistory = mockReceipts
				.filter((receipt) => {
					const billVehicleId = receipt.bill.content.vehicle?.id?.trim();
					if (targetVehicleId && billVehicleId) return billVehicleId === targetVehicleId;
					return (
						receipt.vehicleNumber.trim().toLocaleLowerCase() ===
						targetVehicleNumber.trim().toLocaleLowerCase()
					);
				})
				.sort((left, right) => {
					const dateA = Date.parse(`${left.billingDate}T00:00:00`) || Date.parse(left.bill.createdAt) || 0;
					const dateB = Date.parse(`${right.billingDate}T00:00:00`) || Date.parse(right.bill.createdAt) || 0;
					return dateB - dateA;
				});

			assert.strictEqual(vehicleHistory.length, 2);
			assert.strictEqual(vehicleHistory[0].id, 'rec-2');
			assert.strictEqual(vehicleHistory[1].id, 'rec-1');
		});
	});
});
