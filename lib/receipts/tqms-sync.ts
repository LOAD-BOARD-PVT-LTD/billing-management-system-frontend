import { getRealOwnerName } from '@/lib/receipts/owner-name';

export type ReceiptLocalMemberSnapshot = {
  id: string;
  membershipNumber: string;
  vehicleNumber: string;
  name: string | null;
  phone: string | null;
  address: string | null;
  vehicleCategory: string;
  vehicleSubcategory: string | null;
};

export type ReceiptTqmsSnapshot = {
  vehicleNumber: string;
  ownerName: string | null;
  ownerPhone: string | null;
  operatorName?: string | null;
  ownerAddress: string | null;
  vehicleCategory: string;
  vehicleSubcategory: string | null;
};

export type ReceiptTqmsMismatchField =
  | 'ownerName'
  | 'ownerPhone'
  | 'ownerAddress'
  | 'vehicleCategory'
  | 'vehicleSubcategory';

export type ReceiptTqmsMismatch = {
  field: ReceiptTqmsMismatchField;
  localValue: string | null;
  tqmsValue: string | null;
};

export type ReceiptTqmsSyncReview = {
  status: 'NO_MEMBER' | 'MATCHED' | 'MISMATCH';
  member: ReceiptLocalMemberSnapshot | null;
  tqms: ReceiptTqmsSnapshot;
  mismatches: ReceiptTqmsMismatch[];
  syncData: {
    name?: string;
    phone?: string;
    address?: string;
    vehicleCategory?: string;
    vehicleSubcategory?: string | null;
  };
  fingerprint: string;
};

export type ReceiptOwnerAuthority = {
  source: 'TQMS' | 'FALLBACK';
  ownerName: string | null;
  ownerPhone: string | null;
  ownerAddress: string | null;
  operatorName: string | null;
};

function normalizeText(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().replace(/\s+/gu, ' ');
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeComparable(value: string | null | undefined): string {
  return normalizeText(value)?.toUpperCase() ?? '';
}

function normalizeOwnerName(value: string | null | undefined, vehicleNumber: string): string | null {
  return getRealOwnerName(value, vehicleNumber);
}

export function resolveReceiptOwnerAuthority(params: {
  review: Pick<ReceiptTqmsSyncReview, 'tqms'> | null;
  vehicleNumber: string;
  fallback: {
    ownerName?: string | null;
    ownerPhone?: string | null;
    ownerAddress?: string | null;
    operatorName?: string | null;
  };
}): ReceiptOwnerAuthority {
  const source = params.review?.tqms ?? params.fallback;
  return {
    source: params.review ? 'TQMS' : 'FALLBACK',
    ownerName: normalizeOwnerName(
      'ownerName' in source ? source.ownerName : null,
      params.vehicleNumber,
    ),
    ownerPhone: normalizeText('ownerPhone' in source ? source.ownerPhone : null),
    ownerAddress: normalizeText('ownerAddress' in source ? source.ownerAddress : null),
    operatorName: normalizeText('operatorName' in source ? source.operatorName : null),
  };
}

function pushMismatch(params: {
  mismatches: ReceiptTqmsMismatch[];
  field: ReceiptTqmsMismatchField;
  localValue: string | null;
  tqmsValue: string | null;
  compareWhenTqmsMissing?: boolean;
}) {
  if (!params.compareWhenTqmsMissing && params.tqmsValue == null) return;
  if (normalizeComparable(params.localValue) === normalizeComparable(params.tqmsValue)) return;
  params.mismatches.push({
    field: params.field,
    localValue: params.localValue,
    tqmsValue: params.tqmsValue,
  });
}

function buildFingerprint(mismatches: ReceiptTqmsMismatch[]): string {
  if (mismatches.length === 0) return 'matched';
  return mismatches
    .map((item) => {
      const localValue = normalizeText(item.localValue) ?? '';
      const tqmsValue = normalizeText(item.tqmsValue) ?? '';
      return `${item.field}:${localValue}->${tqmsValue}`;
    })
    .join('|');
}

export function buildReceiptTqmsSyncReview(params: {
  member: ReceiptLocalMemberSnapshot | null;
  tqms: ReceiptTqmsSnapshot;
}): ReceiptTqmsSyncReview {
  if (!params.member) {
    return {
      status: 'NO_MEMBER',
      member: null,
      tqms: params.tqms,
      mismatches: [],
      syncData: {},
      fingerprint: 'no-member',
    };
  }

  const member = params.member;
  const tqmsOwnerName = normalizeOwnerName(params.tqms.ownerName, params.tqms.vehicleNumber);
  const tqmsOwnerPhone = normalizeText(params.tqms.ownerPhone);
  const tqmsOwnerAddress = normalizeText(params.tqms.ownerAddress);
  const tqmsVehicleCategory = normalizeText(params.tqms.vehicleCategory);
  const tqmsVehicleSubcategory = normalizeText(params.tqms.vehicleSubcategory);

  const mismatches: ReceiptTqmsMismatch[] = [];

  pushMismatch({
    mismatches,
    field: 'ownerName',
    localValue: normalizeText(member.name),
    tqmsValue: tqmsOwnerName,
  });
  pushMismatch({
    mismatches,
    field: 'ownerPhone',
    localValue: normalizeText(member.phone),
    tqmsValue: tqmsOwnerPhone,
  });
  pushMismatch({
    mismatches,
    field: 'ownerAddress',
    localValue: normalizeText(member.address),
    tqmsValue: tqmsOwnerAddress,
  });
  pushMismatch({
    mismatches,
    field: 'vehicleCategory',
    localValue: normalizeText(member.vehicleCategory),
    tqmsValue: tqmsVehicleCategory,
    compareWhenTqmsMissing: true,
  });
  pushMismatch({
    mismatches,
    field: 'vehicleSubcategory',
    localValue: normalizeText(member.vehicleSubcategory),
    tqmsValue: tqmsVehicleSubcategory,
    compareWhenTqmsMissing: true,
  });

  const syncData: ReceiptTqmsSyncReview['syncData'] = {};
  if (mismatches.some((item) => item.field === 'ownerName') && tqmsOwnerName) {
    syncData.name = tqmsOwnerName;
  }
  if (mismatches.some((item) => item.field === 'ownerPhone') && tqmsOwnerPhone) {
    syncData.phone = tqmsOwnerPhone;
  }
  if (mismatches.some((item) => item.field === 'ownerAddress') && tqmsOwnerAddress) {
    syncData.address = tqmsOwnerAddress;
  }
  if (mismatches.some((item) => item.field === 'vehicleCategory') && tqmsVehicleCategory) {
    syncData.vehicleCategory = tqmsVehicleCategory;
  }
  if (mismatches.some((item) => item.field === 'vehicleSubcategory')) {
    syncData.vehicleSubcategory = tqmsVehicleSubcategory ?? null;
  }

  return {
    status: mismatches.length > 0 ? 'MISMATCH' : 'MATCHED',
    member,
    tqms: params.tqms,
    mismatches,
    syncData,
    fingerprint: buildFingerprint(mismatches),
  };
}
