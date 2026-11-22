export type DashboardMetric = {
  title: string;
  value: number;
  change?: number;
  icon:
    | 'members'
    | 'activeMembers'
    | 'newSubscriptions'
    | 'inactiveMembers'
    | 'blacklistedMembers'
    | 'displacedMembers'
    | 'vehicles'
    | 'income'
    | 'pending';
};

export type IncomeTrendPoint = {
  label: string;
  amount: number;
};

export type VehicleSegment = {
  label: string;
  count: number;
  share: number;
  color: string;
};

export type BillingRecord = {
  invoice: string;
  member: string;
  service: string;
  amount: number;
  date: string;
  status: 'paid' | 'pending' | 'overdue';
};

export type CollectionItem = {
  label: string;
  amount: number;
  share: number;
};

export type DashboardAction = {
  title: string;
  detail: string;
  href: string;
  icon: 'billing' | 'members' | 'receipt' | 'report';
};

export type DashboardActivity = {
  title: string;
  detail: string;
  time: string;
  state: 'success' | 'warning' | 'info';
};

export const dashboardData = {
  incomeTrend: [
    { label: 'साउन', amount: 4500000 },
    { label: 'भदौ', amount: 6200000 },
    { label: 'असोज', amount: 7100000 },
    { label: 'कार्तिक', amount: 6500000 },
    { label: 'मंसिर', amount: 8900000 },
    { label: 'पुष', amount: 7400000 },
    { label: 'माघ', amount: 9600000 },
    { label: 'फागुन', amount: 8200000 },
  ] satisfies IncomeTrendPoint[],
  vehicleBreakdown: [
    { label: 'बस', count: 5680, share: 52, color: '#2563eb' },
    { label: 'ट्रक', count: 2287, share: 21, color: '#10b981' },
    { label: 'हलुका सवारी', count: 1307, share: 12, color: '#f59e0b' },
    { label: 'मोटरसाइकल', count: 871, share: 8, color: '#e879a8' },
    { label: 'अन्य', count: 747, share: 7, color: '#94a3b8' },
  ] satisfies VehicleSegment[],
  recentBillings: [
    { invoice: 'INV-2083-01428', member: 'राम प्रसाद अधिकारी', service: 'वार्षिक नवीकरण', amount: 24000, date: '२०८३-०६-१५', status: 'paid' },
    { invoice: 'INV-2083-01427', member: 'सीता कुमारी श्रेष्ठ', service: 'सदस्यता शुल्क', amount: 12500, date: '२०८३-०६-१५', status: 'pending' },
    { invoice: 'INV-2083-01426', member: 'कृष्ण बहादुर थापा', service: 'सवारी दर्ता', amount: 18000, date: '२०८३-०६-१४', status: 'paid' },
    { invoice: 'INV-2083-01425', member: 'माया देवी गुरुङ', service: 'वार्षिक नवीकरण', amount: 24000, date: '२०८३-०६-१४', status: 'overdue' },
    { invoice: 'INV-2083-01424', member: 'हरि प्रसाद पौडेल', service: 'सदस्यता शुल्क', amount: 12500, date: '२०८३-०६-१३', status: 'paid' },
  ] satisfies BillingRecord[],
  collectionSummary: [
    { label: 'वार्षिक सदस्यता', amount: 84250000, share: 78 },
    { label: 'सवारी नवीकरण', amount: 38650000, share: 61 },
    { label: 'नयाँ दर्ता', amount: 22480000, share: 42 },
  ] satisfies CollectionItem[],
  quickActions: [
    { title: 'नयाँ बिल बनाउनुहोस्', detail: 'सदस्यको बिलिङ सुरु गर्नुहोस्', href: '/dashboard/billing-new', icon: 'billing' },
    { title: 'सदस्य खोज्नुहोस्', detail: 'सदस्य विवरण हेर्नुहोस्', href: '/dashboard/members', icon: 'members' },
    { title: 'रसिदहरू हेर्नुहोस्', detail: 'भुक्तानी अभिलेख जाँच्नुहोस्', href: '/dashboard/receipts', icon: 'receipt' },
    { title: 'आम्दानी प्रतिवेदन', detail: 'सङ्कलनको विवरण हेर्नुहोस्', href: '/dashboard/income-report', icon: 'report' },
  ] satisfies DashboardAction[],
  activities: [
    { title: 'नयाँ बिल सफलतापूर्वक जारी भयो', detail: 'INV-2083-01428 · राम प्रसाद अधिकारी', time: '५ मिनेटअघि', state: 'success' },
    { title: 'भुक्तानी बाँकी रहेको सम्झना', detail: '१२ सदस्यको नवीकरण म्याद सकिँदैछ', time: '१८ मिनेटअघि', state: 'warning' },
    { title: 'सदस्य विवरण अद्यावधिक भयो', detail: 'सदस्य अभिलेखमा ८ नयाँ प्रविष्टि', time: '१ घण्टाअघि', state: 'info' },
  ] satisfies DashboardActivity[],
};