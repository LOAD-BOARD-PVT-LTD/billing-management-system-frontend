type SidebarHref = `/${string}`;

export type UserMenuLinkKey = 'profile' | 'systemAdmin';

export type UserMenuLink = {
  key: UserMenuLinkKey;
  href: SidebarHref;
  adminOnly?: boolean;
};

export const USER_MENU_LINKS: UserMenuLink[] = [
  { key: 'profile', href: '/dashboard/profile' },
  { key: 'systemAdmin', href: '/dashboard/settings', adminOnly: true },
];

export function getUserMenuLinks(isAdmin: boolean): UserMenuLink[] {
  return USER_MENU_LINKS.filter((link) => !link.adminOnly || isAdmin);
}
