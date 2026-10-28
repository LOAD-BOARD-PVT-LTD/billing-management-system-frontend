'use client';

import { Badge } from '@/components/ui/badge';
import type { MemberStatus } from '@/features/members/model/member';

const STATUS_LABELS: Record<MemberStatus, string> = {
  ACTIVE: 'सक्रिय',
  NEW: 'नयाँ सदस्यता',
  INACTIVE: 'निष्क्रिय',
  DISPLACED: 'विस्थापित',
  BLACKLISTED: 'कालोसूची',
};

export function MemberStatusBadge({
  status,
  billingStatus,
  isDisplaced,
  isBlacklisted,
}: {
  status: MemberStatus;
  billingStatus?: MemberStatus;
  isDisplaced?: boolean;
  isBlacklisted?: boolean;
}) {
  const displaced = isDisplaced ?? status === 'DISPLACED';
  const blacklisted = isBlacklisted ?? status === 'BLACKLISTED';
  if (displaced || blacklisted) {
    const baseStatus = billingStatus
      ?? (status === 'DISPLACED' || status === 'BLACKLISTED' ? 'INACTIVE' : status);
    return (
      <span className="inline-flex flex-wrap items-center gap-1">
        {statusBadge(baseStatus)}
        {displaced ? <Badge variant="secondary">{STATUS_LABELS.DISPLACED}</Badge> : null}
        {blacklisted ? <Badge variant="destructive">{STATUS_LABELS.BLACKLISTED}</Badge> : null}
      </span>
    );
  }
  return statusBadge(status);
}

function statusBadge(status: MemberStatus) {
  if (status === 'BLACKLISTED') return <Badge variant="destructive">{STATUS_LABELS[status]}</Badge>;
  if (status === 'ACTIVE') {
    return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">{STATUS_LABELS[status]}</Badge>;
  }
  if (status === 'NEW') return <Badge variant="outline">{STATUS_LABELS[status]}</Badge>;
  return <Badge variant="secondary">{STATUS_LABELS[status]}</Badge>;
}

export { STATUS_LABELS };
