import { Badge } from '@/components/ui/badge';
import { t } from '@/utils/translations';

export function UserStatusBadge({ status }: { status: string | null | undefined }) {
  const normalized = status?.trim().toLocaleLowerCase();
  if (normalized === 'active') {
    return <Badge variant="success">{t('users.active')}</Badge>;
  }
  if (normalized === 'inactive') {
    return <Badge variant="secondary">{t('users.inactive')}</Badge>;
  }
  if (status?.trim()) {
    return <Badge variant="outline">{status}</Badge>;
  }

  return (
    <Badge variant="outline" aria-label={t('users.statusUnavailable')}>
      {t('users.statusUnavailable')}
    </Badge>
  );
}
