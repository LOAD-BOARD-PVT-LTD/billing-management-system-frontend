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
    description: 'भुक्तानी र म्याद सकिएको अवस्थाका लागि विशेष नीति।', icon: ReceiptText,
    unavailableReason: 'यस अवस्थाका लागि छुट्टै नीति सेटिङ वा API हाल जडान छैन।',
  },
  {
    id: 'monthly-payment-rules', category: 'billing-rules', title: 'मासिक भुक्तानी नियम',
    description: 'मासिक अवधि र आवर्ती शुल्क हालको बिलिङ नियम मोड्युलबाट व्यवस्थापन हुन्छ।', icon: CalendarDays,
    href: '/dashboard/billing-rules', actionLabel: 'बिलिङ नियम खोल्नुहोस्',
  },
  {
    id: 'tqms-branch-filter', category: 'integrations', title: 'TQMS संघ शाखा फिल्टर',
    description: 'TQMS सवारी खोज र शाखा-आधारित फिल्टर।', icon: Building2,
    unavailableReason: 'फिल्टर सुरक्षित गर्ने सेटिङ सेवा वा UI हाल उपलब्ध छैन।',
    searchTerms: ['tqms branch', 'branch filter'],
  },
  {
    id: 'tqms-data-sync', category: 'integrations', title: 'TQMS डाटा सिंक',
    description: 'सिंक अवस्था, अन्तिम सफल समय, रेकर्ड गणना र छोडिएका अभिलेख।', icon: Link2,
    unavailableReason: 'TQMS स्न्यापसट सिंक, यसको operational metrics र Excel export UI/API हाल उपलब्ध छैन।',
  },
  {
    id: 'cts-insurance', category: 'integrations', title: 'CTS तथा बीमा एकीकरण',
    description: 'CTS र बीमा सेवाका जडान सेटिङहरू।', icon: ShieldCheck,
    unavailableReason: 'CTS वा बीमा एकीकरण व्यवस्थापनका लागि सेटिङ सेवा हाल जडान छैन।',
  },
  {
    id: 'sms-provider', category: 'sms-notifications', title: 'SMS प्रदायक सेटिङ्स',
    description: 'प्रदायक credentials र sender configuration।', icon: MessageSquareText,
    unavailableReason: 'SMS प्रदायक credentials पढ्ने वा सुरक्षित गर्ने सेटिङ सेवा छैन; कुनै secret field देखाइएको छैन।',
    searchTerms: ['sms api key', 'api key', 'sms provider'],
  },
  {
    id: 'payment-sms', category: 'sms-notifications', title: 'भुक्तानीपछि स्वचालित SMS',
    description: 'सफल भुक्तानीपछि सवारी धनीलाई पठाइने सूचना।', icon: ReceiptText,
    unavailableReason: 'स्वचालित SMS configuration हाल उपलब्ध छैन।',
  },
  {
    id: 'sms-templates', category: 'sms-notifications', title: 'SMS टेम्प्लेट तथा परीक्षण SMS',
    description: 'सन्देशका टेम्प्लेट सम्पादन र परीक्षण सन्देश पठाउने सुविधा।', icon: MessageSquareText,
    unavailableReason: 'टेम्प्लेट सम्पादन वा परीक्षण SMS का लागि हाल सेवा जडान छैन।',
  },
  {
    id: 'sms-delivery-history', category: 'sms-notifications', title: 'SMS पठाउने अवस्था तथा अभियान इतिहास',
    description: 'डेलिभरी विवरण र अभियान इतिहास।', icon: FileClock,
    unavailableReason: 'SMS delivery status वा अभियान इतिहास endpoint उपलब्ध छैन।',
  },
  {
    id: 'displaced-tags', category: 'organization', title: 'विस्थापित ट्याग सेटिङ',
    description: 'संस्था-स्तरमा प्रयोग हुने विस्थापित ट्याग।', icon: SlidersHorizontal,
    unavailableReason: 'ट्याग configuration का लागि छुट्टै सेटिङ मोड्युल छैन।',
  },
  {
    id: 'organization-features-policies', category: 'organization', title: 'संस्थागत सुविधाहरू तथा नीतिहरू',
    description: 'संस्थाले प्रयोग गर्ने billing entity र शाखा व्यवस्थापन।', icon: Building2,
    href: '/dashboard/billing-entities', actionLabel: 'संस्था विवरण खोल्नुहोस्',
  },
  {
    id: 'organization-branches', category: 'organization', title: 'संस्था तथा शाखा व्यवस्थापन',
    description: 'हालका संस्था र शाखा व्यवस्थापन मोड्युलहरू।', icon: Building2,
    href: '/dashboard/branches', actionLabel: 'शाखा व्यवस्थापन खोल्नुहोस्',
  },
  {
    id: 'organization-vat', category: 'organization', title: 'VAT तथा कर सेटिङ्स',
    description: 'VAT applicability र दरका लागि संस्था-स्तरको configuration।', icon: ReceiptText,
    unavailableReason: 'अनुवादमा VAT सेटिङ उल्लेख भए पनि हालको billing entity schema/API मा VAT configuration छैन।',
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