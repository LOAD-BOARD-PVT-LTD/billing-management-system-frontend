import contacts from '@/shared/document-generation/data/document-contacts.json';
import { fontasyFromUnicode } from '@/utils/fontasy-himali/fromUnicode';

export function DocumentContacts() {
  return (
    <aside className="document-contact-list">
      <strong>{fontasyFromUnicode('सम्पर्क नम्बरहरू:')}</strong>
      {contacts.map(({ label, phone }) => (
        <span key={label}>{fontasyFromUnicode(`${label}: ${phone}`)}</span>
      ))}
    </aside>
  );
}
