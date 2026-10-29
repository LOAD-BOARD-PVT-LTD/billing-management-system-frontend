import type { ReceiptRecord } from '@/features/receipts/model/receipt';

function previewReceipt(input: {
  id: string;
  receiptNumber: string;
  vehicleNumber: string;
  customerName: string;
  organizationName: string;
  paymentDate: string;
  validUntil: string;
  paymentMethod: string;
  totalAmount: number;
  branchName: string;
  userName: string;
  status?: ReceiptRecord['status'];
}): ReceiptRecord {
  const bill = {
    id: input.id,
    receiptNumber: input.receiptNumber,
    createdAt: `${input.paymentDate}T04:15:00.000Z`,
    content: {
      vehicle: {
        id: input.id,
        vehicleNumber: input.vehicleNumber,
        vehicleType: 'बस',
        ownerName: input.customerName,
        phone: '9800000000',
        address: 'हेटौंडा, मकवानपुर',
      },
      branch: {
        id: `branch-${input.branchName}`,
        name: input.branchName,
        BranchCode: '',
        address: 'हेटौंडा',
        phone: '',
        contactPerson: input.userName,
      },
      fiscalYearId: '2083/84',
      fiscalYearName: '२०८३/८४',
      billingDate: input.paymentDate,
      periodStart: input.paymentDate,
      periodEnd: input.validUntil,
      billingMonths: 12,
      items: [{ feeHeadId: 'annual-fee', title: 'वार्षिक सदस्यता शुल्क', billingEntityId: 'association', billingEntity: input.organizationName, ruleId: null, amount: input.totalAmount }],
      subtotal: input.totalAmount,
      discount: 0,
      total: input.totalAmount,
      paymentMethod: input.paymentMethod,
      note: 'पूर्वावलोकन डाटा',
    },
  } satisfies ReceiptRecord['bill'];

  const finalDigits = input.vehicleNumber.match(/[0-9०-९]+$/u)?.[0] ?? '';
  return {
    ...input,
    billingType: 'MEMBERSHIP',
    status: input.status ?? 'PAID',
    fiscalYear: '2083/84',
    printedCopyCount: 0,
    finalDigits,
    billingDate: input.paymentDate,
    bill,
  };
}

// Replace this sample adapter when the receipts listing API contract is available.
export const RECEIPT_PREVIEW_RECORDS: ReceiptRecord[] = [
  previewReceipt({ id: 'preview-1', receiptNumber: '4.1304', vehicleNumber: 'प्रदेश-३-०३-००१-ख-००१४', customerName: 'जगबहादुर गुरुङ', organizationName: 'जगा बहादुर सेवा', paymentDate: '2026-10-09', validUntil: '2027-01-15', paymentMethod: 'नगद', totalAmount: 6700, branchName: 'हेटौंडा', userName: 'ममता धुवानी सेवा' }),
  previewReceipt({ id: 'preview-2', receiptNumber: '4.1303', vehicleNumber: 'बा.प्र.०३-००१-क-००३१', customerName: 'लक्ष्मी सनराइज बैंक लिमिटेड', organizationName: 'रेडिमिक्स कंक्रिट प्रा.लि.', paymentDate: '2026-10-09', validUntil: '2027-01-15', paymentMethod: 'नगद', totalAmount: 12900, branchName: 'हेटौंडा', userName: 'प्रशासन' }),
  previewReceipt({ id: 'preview-3', receiptNumber: '4.1302', vehicleNumber: 'प्रदेश-३-०१-००५-च-००८२', customerName: 'सिता कार्की', organizationName: 'नारायणी यातायात व्यवसायी संघ', paymentDate: '2026-10-08', validUntil: '2027-01-14', paymentMethod: 'बैंक', totalAmount: 8500, branchName: 'चितवन', userName: 'शाखा कर्मचारी' }),
  previewReceipt({ id: 'preview-4', receiptNumber: '4.1301', vehicleNumber: 'ना.४.ख-००१२', customerName: 'रामकृष्ण श्रेष्ठ', organizationName: 'श्रेष्ठ यातायात सेवा', paymentDate: '2026-10-07', validUntil: '2027-01-13', paymentMethod: 'नगद', totalAmount: 5400, branchName: 'हेटौंडा', userName: 'प्रशासन' }),
  previewReceipt({ id: 'preview-5', receiptNumber: '4.1300', vehicleNumber: 'प्रदेश-२-०३-००२-ख-००४५', customerName: 'मनिषा थापा', organizationName: 'थापा ट्राभल्स', paymentDate: '2026-10-06', validUntil: '2027-01-12', paymentMethod: 'बैंक', totalAmount: 7200, branchName: 'परासी', userName: 'शाखा कर्मचारी' }),
  previewReceipt({ id: 'preview-6', receiptNumber: '4.1299', vehicleNumber: 'बा.प्र.०३-००१-ज-००२०', customerName: 'विकास बस्नेत', organizationName: 'मकवानपुर यातायात सेवा', paymentDate: '2026-10-05', validUntil: '2027-01-11', paymentMethod: 'नगद', totalAmount: 6100, branchName: 'चितवन', userName: 'प्रशासन', status: 'CANCELLED' }),
  previewReceipt({ id: 'preview-7', receiptNumber: '4.1298', vehicleNumber: 'प्रदेश-३-०३-००१-ख-००९१', customerName: 'सुरज लामा', organizationName: 'लामा बस सेवा', paymentDate: '2026-10-04', validUntil: '2027-01-10', paymentMethod: 'नगद', totalAmount: 9400, branchName: 'परासी', userName: 'शाखा कर्मचारी' }),
];