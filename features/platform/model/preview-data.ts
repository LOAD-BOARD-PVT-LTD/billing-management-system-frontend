export type PreviewOrganizationStatus = 'ACTIVE' | 'TRIAL' | 'SUSPENDED';

export interface PreviewOrganization {
  id: string;
  name: string;
  identifier: string;
  status: PreviewOrganizationStatus;
  plan: string;
  users: number;
  branches: number;
  createdAt: string;
  features: string[];
}

export const PLATFORM_PREVIEW_ORGANIZATIONS: PreviewOrganization[] = [
  { id: 'org-kathmandu-mobility', name: 'Kathmandu Mobility Association', identifier: 'KMA-2081-014', status: 'ACTIVE', plan: 'Professional', users: 72, branches: 8, createdAt: '2025-01-12', features: ['Billing', 'Members', 'Vehicles', 'Reports'] },
  { id: 'org-narayani-transport', name: 'Narayani Transport Sangh', identifier: 'NTS-2080-006', status: 'ACTIVE', plan: 'Enterprise', users: 54, branches: 5, createdAt: '2025-01-08', features: ['Billing', 'Members', 'Vehicles', 'Reports', 'SMS'] },
  { id: 'org-koshi-transit', name: 'Koshi Transit Association', identifier: 'KTA-2082-022', status: 'TRIAL', plan: 'Starter', users: 18, branches: 2, createdAt: '2025-02-02', features: ['Billing', 'Members'] },
  { id: 'org-pokhara-transport', name: 'Pokhara Transport Association', identifier: 'PTA-2081-011', status: 'ACTIVE', plan: 'Professional', users: 38, branches: 4, createdAt: '2025-01-20', features: ['Billing', 'Members', 'Vehicles', 'Reports'] },
  { id: 'org-lumbini-yatayat', name: 'Lumbini Yatayat Sangh', identifier: 'LYS-2081-018', status: 'SUSPENDED', plan: 'Starter', users: 24, branches: 3, createdAt: '2025-03-03', features: ['Billing', 'Members'] },
  { id: 'org-madhesh-carriers', name: 'Madhesh Carriers Association', identifier: 'MCA-2082-029', status: 'ACTIVE', plan: 'Professional', users: 31, branches: 3, createdAt: '2025-04-16', features: ['Billing', 'Members', 'Vehicles'] },
];

export const PLATFORM_PREVIEW_NOTICE = 'Preview data only · no platform organization API is connected.';