export const MEMBER_COLUMN_OPTIONS = [
  { id: 'vehicleId', label: 'सदस्य नं.', defaultVisible: true, required: true },
  { id: 'member', label: 'नाम / सम्पर्क', defaultVisible: true, required: false },
  { id: 'vehicle', label: 'सवारी नं.', defaultVisible: true, required: false },
  { id: 'vehicleType', label: 'सवारी प्रकार', defaultVisible: true, required: false },
  { id: 'status', label: 'स्थिति', defaultVisible: true, required: false },
  { id: 'lastPayment', label: 'अन्तिम बिल', defaultVisible: true, required: false },
  { id: 'branch', label: 'शाखा', defaultVisible: true, required: false },
  { id: 'actions', label: 'कार्य', defaultVisible: true, required: true },
] as const;

export type MemberColumnId = (typeof MEMBER_COLUMN_OPTIONS)[number]['id'];

export const DEFAULT_MEMBER_COLUMNS: MemberColumnId[] = MEMBER_COLUMN_OPTIONS
  .filter((column) => column.defaultVisible)
  .map((column) => column.id);

export const REQUIRED_MEMBER_COLUMNS: MemberColumnId[] = MEMBER_COLUMN_OPTIONS
  .filter((column) => column.required)
  .map((column) => column.id);
