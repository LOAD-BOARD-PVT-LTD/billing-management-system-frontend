export const MAHASANG_REPORT_COLUMN_OPTIONS = [
  { id: 'vehicleNumber', label: 'गाडी नं.', defaultVisible: true, required: true },
  { id: 'previousVehicleNumber', label: 'पुरानो गाडी नं.', defaultVisible: true, required: false },
  { id: 'vehicleType', label: 'सवारी प्रकार', defaultVisible: true, required: false },
  { id: 'ownerName', label: 'धनीको नाम', defaultVisible: true, required: false },
  { id: 'ownerPhone', label: 'धनीको फोन', defaultVisible: true, required: false },
  { id: 'note', label: 'कैफियत', defaultVisible: true, required: false },
  { id: 'receiptNumber', label: 'रसिद नं.', defaultVisible: true, required: false },
  { id: 'membershipIncome', label: 'सदस्यताबाट', defaultVisible: true, required: false },
  { id: 'otherIncome', label: 'अन्य आम्दानी', defaultVisible: true, required: false },
  { id: 'total', label: 'जम्मा', defaultVisible: true, required: false },
  { id: 'periodMonths', label: 'अवधि महिना', defaultVisible: true, required: false },
  { id: 'paymentMethod', label: 'भुक्तानी तरिका', defaultVisible: true, required: false },
  { id: 'billingDate', label: 'का. मिति', defaultVisible: true, required: false },
  { id: 'periodStart', label: 'देखि', defaultVisible: true, required: false },
  { id: 'periodEnd', label: 'सम्म', defaultVisible: true, required: false },
] as const;

export type MahasangReportColumnId = (typeof MAHASANG_REPORT_COLUMN_OPTIONS)[number]['id'];

export const DEFAULT_MAHASANG_REPORT_COLUMNS: MahasangReportColumnId[] =
  MAHASANG_REPORT_COLUMN_OPTIONS.map((column) => column.id);

export const REQUIRED_MAHASANG_REPORT_COLUMNS: MahasangReportColumnId[] =
  MAHASANG_REPORT_COLUMN_OPTIONS
    .filter((column) => column.required)
    .map((column) => column.id);
