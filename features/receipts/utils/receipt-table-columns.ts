export const RECEIPT_COLUMN_OPTIONS = [
  { id: 'receiptNumber', label: 'रसिद नम्बर', defaultVisible: true, required: true },
  { id: 'vehicleNumber', label: 'सवारी साधन नम्बर', defaultVisible: true, required: true },
  { id: 'finalDigits', label: 'अन्तिम अङ्क', defaultVisible: true, required: false },
  { id: 'customer', label: 'नाम / संस्था', defaultVisible: true, required: false },
  { id: 'paymentDate', label: 'भु. मिति (बाट)', defaultVisible: true, required: false },
  { id: 'validUntil', label: 'भु. मिति सम्म', defaultVisible: true, required: false },
  { id: 'paymentMethod', label: 'भु. विधि', defaultVisible: true, required: false },
  { id: 'status', label: 'स्थिति', defaultVisible: true, required: false },
  { id: 'totalAmount', label: 'कुल रकम', defaultVisible: true, required: false },
] as const;

export type ReceiptColumnId = (typeof RECEIPT_COLUMN_OPTIONS)[number]['id'];

export const DEFAULT_RECEIPT_COLUMNS: ReceiptColumnId[] = RECEIPT_COLUMN_OPTIONS
  .filter((column) => column.defaultVisible)
  .map((column) => column.id);

export const REQUIRED_RECEIPT_COLUMNS: ReceiptColumnId[] = RECEIPT_COLUMN_OPTIONS
  .filter((column) => column.required)
  .map((column) => column.id);