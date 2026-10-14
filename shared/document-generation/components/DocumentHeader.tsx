import type { ReactNode } from 'react';

export function DocumentHeader({ children }: { children: ReactNode }) {
  return <header className="document-header">{children}</header>;
}
