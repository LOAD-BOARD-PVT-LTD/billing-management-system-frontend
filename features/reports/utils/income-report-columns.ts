export const INCOME_REPORT_COLUMN_OPTIONS = [
  { id: 'receiptNumber', label: 'रसिद नं.', defaultVisible: true, required: true },
  { id: 'vehicleNumber', label: 'गाडी नं. / प्रकार', defaultVisible: true, required: true },
  { id: 'customerName', label: 'ग्राहक / सदस्य', defaultVisible: true, required: false },
  { id: 'feeTitle', label: 'आम्दानी शीर्षक', defaultVisible: true, required: false },
  { id: 'billingEntity', label: 'Billing Entity', defaultVisible: true, required: false },
  { id: 'branchName', label: 'शाखा', defaultVisible: true, required: false },
  { id: 'userName', label: 'प्रयोगकर्ता', defaultVisible: false, required: false },
  { id: 'paymentMethod', label: 'भुक्तानी विधि', defaultVisible: true, required: false },
  { id: 'paymentDate', label: 'मिति', defaultVisible: true, required: false },
  { id: 'amount', label: 'शुल्क रकम', defaultVisible: true, required: false },
  { id: 'receiptTotal', label: 'रसिद जम्मा', defaultVisible: true, required: false },
  { id: 'status', label: 'स्थिति', defaultVisible: true, required: false },
] as const;

export type IncomeReportColumnId = (typeof INCOME_REPORT_COLUMN_OPTIONS)[number]['id'];

export const DEFAULT_INCOME_REPORT_COLUMNS: IncomeReportColumnId[] = INCOME_REPORT_COLUMN_OPTIONS
  .filter((column) => column.defaultVisible)
  .map((column) => column.id);

export const REQUIRED_INCOME_REPORT_COLUMNS: IncomeReportColumnId[] = INCOME_REPORT_COLUMN_OPTIONS
  .filter((column) => column.required)
  .map((column) => column.id);
