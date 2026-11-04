import {
  Building2,
  CalendarDays,
  CarFront,
  FileClock,
  FileCog,
  Gauge,
  Link2,
  MessageSquareText,
  ReceiptText,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  type LucideIcon,
} from 'lucide-react';

export const SETTINGS_CATEGORIES = [
  { id: 'billing-receipts', label: 'बिलिङ तथा रसिद', description: 'रसिद र आर्थिक वर्षसँग सम्बन्धित पहुँच।', icon: ReceiptText },
  { id: 'billing-rules', label: 'बिलिङ नियमहरू', description: 'शुल्क, अवधि र बिलिङ नियम व्यवस्थापन।', icon: FileCog },
  { id: 'integrations', label: 'एकीकृत सेवाहरू', description: 'बाह्य सेवा र डाटा जडानहरू।', icon: Link2 },
  { id: 'sms-notifications', label: 'SMS तथा सूचना', description: 'SMS प्रदायक, सन्देश र डेलिभरी।', icon: MessageSquareText },
  { id: 'organization', label: 'संस्था व्यवस्थापन', description: 'संस्था र शाखासँग सम्बन्धित व्यवस्थापन।', icon: Building2 },
  { id: 'system-security', label: 'प्रणाली तथा सुरक्षा', description: 'प्रयोगकर्ता पहुँच र प्रणाली प्रशासन।', icon: ShieldCheck },
] as const;

export type SettingsCategoryId = (typeof SETTINGS_CATEGORIES)[number]['id'];

export interface SettingsEntry {
  id: string;
  category: SettingsCategoryId;
  title: string;
  description: string;
  icon: LucideIcon;
  href?: string;
  actionLabel?: string;
  unavailableReason?: string;
  searchTerms?: string[];
}

export const SETTINGS_ENTRIES: SettingsEntry[] = [
  {
    id: 'receipt-cancel-window', category: 'billing-receipts', title: 'रसिद रद्द गर्ने समय सीमा',
    description: 'भुक्तानी भइसकेको रसिद रद्द गर्ने समय सीमा व्यवस्थापन गर्नुहोस्।', icon: FileClock,
    searchTerms: ['receipt cancellation', 'cancel receipt'],
  },
  {
    id: 'receipt-fiscal-year-control', category: 'billing-receipts', title: 'आर्थिक वर्ष व्यवस्थापन',
    description: 'आर्थिक वर्ष थप्नुहोस्, सक्रिय वर्ष छान्नुहोस् र बिलिङ तथा रिपोर्टमा देखिने प्राथमिकता व्यवस्थापन गर्नुहोस्।', icon: CalendarDays,
  },
  {
    id: 'insurance-eligibility', category: 'billing-rules', title: 'बीमा योग्यताको नियम',
    description: 'बीमा योग्यताका लागि लागू हुने नियम।', icon: CarFront,
    unavailableReason: 'बीमा योग्यताको छुट्टै configuration वा API हाल उपलब्ध छैन।',
  },
  {
    id: 'related-fee-rules', category: 'billing-rules', title: 'सम्बन्धित शुल्क नियम',
    description: 'एउटा शुल्क छनोट हुँदा अर्को शुल्क स्वतः थपिने सम्बन्ध व्यवस्थापन।', icon: SlidersHorizontal,
    searchTerms: ['जोडिएको शुल्क नियम', 'linked fee rules', 'automatic fee'],
  },
  {
    id: 'paid-expired-rules', category: 'billing-rules', title: 'तिरेको तर म्याद सकिएको नियम',
    description: 'भुक्तानी र म्याद सकिएको अवस्थाका लागि बिलिङ नियम छान्नुहोस्।', icon: ReceiptText,
    searchTerms: ['arrears', 'expired', 'तिरेको म्याद सकिएको'],
  },
  {
    id: 'monthly-payment-rules', category: 'billing-rules', title: 'मासिक तिरेको नियम',
    description: 'मासिक भुक्तानी देखाउन आर्थिक वर्ष र बिलिङ नियम छान्नुहोस्।', icon: CalendarDays,
    searchTerms: ['monthly payment', 'मासिक तिरेको'],
  },
  {
    id: 'tqms-data-sync', category: 'integrations', title: 'TQMS डाटा सिंक',
    description: 'सिंक अवस्था, अन्तिम सफल समय, रेकर्ड गणना र छोडिएका अभिलेख।', icon: Link2,
    searchTerms: ['TQMS snapshot sync', 'सवारी सिंक', 'छोडिएका अभिलेख'],
  },
  {
    id: 'cts-insurance', category: 'integrations', title: 'CTS तथा बीमा एकीकरण',
    description: 'CTS र बीमा सेवाका जडान सेटिङहरू।', icon: ShieldCheck,
    unavailableReason: 'CTS वा बीमा एकीकरण व्यवस्थापनका लागि सेटिङ सेवा हाल जडान छैन।',
  },
  {
    id: 'notification-center', category: 'sms-notifications', title: 'सूचना केन्द्र तथा SMS ड्यासबोर्ड',
    description: 'प्रत्येक सूचना, SMS स्थिति र हालको ड्यासबोर्ड समीक्षा।', icon: MessageSquareText,
    href: '/dashboard/notifications', actionLabel: 'सूचना केन्द्र खोल्नुहोस्',
    searchTerms: ['notification center', 'sms dashboard', 'message overview'],
  },
  {
    id: 'sms-provider', category: 'sms-notifications', title: 'SMS प्रदायक सेटिङ्स',
    description: 'प्रदायक credentials र sender configuration।', icon: MessageSquareText,
    href: '/dashboard/notifications?tab=automation', actionLabel: 'सेटिङ हेर्नुहोस्',
    searchTerms: ['sms api key', 'api key', 'sms provider'],
  },
  {
    id: 'payment-sms', category: 'sms-notifications', title: 'भुक्तानीपछि स्वचालित SMS',
    description: 'सफल भुक्तानीपछि सवारी धनीलाई पठाइने सूचना।', icon: ReceiptText,
    href: '/dashboard/notifications?tab=automation', actionLabel: 'स्वचालित SMS हेर्नुहोस्',
  },
  {
    id: 'sms-templates', category: 'sms-notifications', title: 'SMS टेम्प्लेट तथा परीक्षण SMS',
    description: 'सन्देशका टेम्प्लेट सम्पादन र परीक्षण सन्देश पठाउने सुविधा।', icon: MessageSquareText,
    href: '/dashboard/notifications?tab=templates', actionLabel: 'टेम्प्लेट हेर्नुहोस्',
  },
  {
    id: 'sms-delivery-history', category: 'sms-notifications', title: 'SMS पठाउने अवस्था तथा अभियान इतिहास',
    description: 'डेलिभरी विवरण र अभियान इतिहास।', icon: FileClock,
    href: '/dashboard/notifications?tab=history', actionLabel: 'इतिहास हेर्नुहोस्',
  },
  {
    id: 'tqms-branch-filter', category: 'organization', title: 'TQMS संघ शाखा फिल्टर',
    description: 'संघ शाखा अनुसार TQMS सवारी सीमित गर्नुहोस्। खाली राख्दा सबै शाखाका सवारी देखिन्छन्।', icon: Building2,
    searchTerms: ['tqms branch', 'branch filter', 'Sthaniya', 'स्थानीय'],
  },
  {
    id: 'displaced-tags', category: 'organization', title: 'विस्थापित ट्याग सेटिङ',
    description: 'संस्था-स्तरमा प्रयोग हुने विस्थापित ट्याग।', icon: SlidersHorizontal,
    searchTerms: ['displaced tags', 'displaced tagging', 'विस्थापित सुविधा'],
  },
  {
    id: 'organization-vat', category: 'organization', title: 'VAT तथा कर सेटिङ्स',
    description: 'मुख्य संस्थाको VAT अवस्था, दर र VAT लाग्ने Billing Entity व्यवस्थापन गर्नुहोस्।', icon: ReceiptText,
    searchTerms: ['vat दर', 'vat rate', 'vat'],
  },
  {
    id: 'system-users', category: 'system-security', title: 'प्रयोगकर्ता व्यवस्थापन',
    description: 'प्रयोगकर्ता व्यवस्थापनको विद्यमान मोड्युल प्रयोग गर्नुहोस्।', icon: Users,
    href: '/dashboard/users', actionLabel: 'प्रयोगकर्ता व्यवस्थापन खोल्नुहोस्',
  },
  {
    id: 'system-security-settings', category: 'system-security', title: 'प्रणाली तथा सुरक्षा नीति',
    description: 'हाल उपलब्ध platform वा tenant सुरक्षा configuration।', icon: Gauge,
    unavailableReason: 'यस परियोजनामा एडमिन सेटिङका लागि छुट्टै प्रणाली-सुरक्षा configuration सेवा छैन।',
  },
];