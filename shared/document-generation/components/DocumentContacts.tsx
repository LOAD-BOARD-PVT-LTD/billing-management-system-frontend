import { useOrganization } from '@/contexts/organization-context';
import { fontasyFromUnicode } from '@/utils/fontasy-himali/fromUnicode';

export function DocumentContacts() {
  const { organization } = useOrganization();
  const branches = organization.branches ?? [];

  if (branches.length === 0) return null;

  return (
    <aside className="document-contact-list">
      <strong>{fontasyFromUnicode('सम्पर्क नम्बरहरू:')}</strong>
      {branches.map(({ name, phoneNumbers }) => (
        <span key={name}>
          {fontasyFromUnicode(`${name}: ${phoneNumbers.join(', ')}`)}
        </span>
      ))}
    </aside>
  );
}
