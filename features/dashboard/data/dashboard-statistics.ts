import type { DashboardMetric } from '@/features/dashboard/data/dashboard-data';

export type DashboardMemberMetricKey =
  | 'members'
  | 'activeMembers'
  | 'newSubscriptions'
  | 'inactiveMembers'
  | 'displacedMembers';

export type DashboardMemberMetric = {
  key: DashboardMemberMetricKey;
  title: string;
  icon: DashboardMetric['icon'];
  responseKeys: string[];
};

export const dashboardMemberMetrics: DashboardMemberMetric[] = [
  {
    key: 'members',
    title: 'कुल सदस्य',
    icon: 'members',
    responseKeys: ['total_users', 'total', 'totalUsers', 'totalMembers', 'members'],
  },
  {
    key: 'activeMembers',
    title: 'सक्रिय सदस्यहरू',
    icon: 'activeMembers',
    responseKeys: ['total_active_users', 'active', 'totalActiveUsers', 'activeUsers', 'activeMembers'],
  },
  {
    key: 'newSubscriptions',
    title: 'नयाँ सदस्यता',
    icon: 'newSubscriptions',
    responseKeys: ['new_users', 'new', 'newUsers', 'newMembers', 'newSubscriptions'],
  },
  {
    key: 'inactiveMembers',
    title: 'निष्क्रिय सदस्यहरू',
    icon: 'inactiveMembers',
    responseKeys: ['total_inactive_users', 'inactive', 'inactive_year', 'totalInactiveUsers', 'inactiveMembers'],
  },
  {
    key: 'displacedMembers',
    title: 'विस्थापित सदस्यहरू',
    icon: 'displacedMembers',
    responseKeys: ['displaced_users', 'displaced', 'displacedUsers', 'displacedMembers'],
  },
];
