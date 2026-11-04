'use client';

import { useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Bell,
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  Info,
  MessageSquareText,
  PencilLine,
  Search,
  ShieldCheck,
  Smartphone,
  TriangleAlert,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { DEFAULT_NOTIFICATION_SETTINGS } from '@/features/notifications/api/notification-settings.api';
import { useNotificationSettings } from '@/features/notifications/hooks/useNotificationSettings';
import type {
  NotificationAutomationRule,
  NotificationHistoryItem,
  NotificationManagementSettings,
  NotificationRecord,
  NotificationStatus,
  NotificationTemplate,
} from '@/features/notifications/types';

const defaultTab = 'templates';

const tabLabels: Record<string, string> = {
  overview: 'सूचना विवरण',
  templates: 'SMS टेम्प्लेट',
  history: 'SMS इतिहास',
  automation: 'स्वचालित सूचना',
};

const sampleNotifications: NotificationRecord[] = [
  {
    id: 'n-101',
    title: 'नयाँ बिल तयार भयो',
    message: 'सवारी नम्बर BA 1 CHA 1902 को बिल तयार भएको नमुना सूचना।',
    category: 'Billing',
    channel: 'SMS',
    status: 'Delivered',
    recipient: 'सञ्जय महर्जन',
    createdAt: 'आज, बिहान ९:४५',
  },
  {
    id: 'n-102',
    title: 'भुक्तानी मिति सम्झना',
    message: 'भुक्तानीको अन्तिम मिति नजिकिएको नमुना सम्झना।',
    category: 'Billing',
    channel: 'SMS',
    status: 'Pending',
    recipient: 'रीता श्रेष्ठ',
    createdAt: 'आज, बिहान ८:२०',
  },
  {
    id: 'n-103',
    title: 'सदस्य दर्ता पुष्टि',
    message: 'नयाँ सदस्यलाई स्वागत सन्देश पठाइएको नमुना विवरण।',
    category: 'Member',
    channel: 'SMS',
    status: 'Delivered',
    recipient: 'बिकास घले',
    createdAt: 'हिजो, साँझ ५:१०',
  },
];

const placeholderSamples: Record<string, string> = {
  vehicleNumber: 'PROVINCE-5-01-001-KHA-1115',
  amount: '३,६००',
  organizationName: 'नारायणी यातायात व्यवसायी संघ',
  expiryDate: '२०८३/०४/१५',
  dueDate: '२०८३/०४/१५',
};

const placeholderLabels: Record<string, string> = {
  vehicleNumber: 'सवारी नम्बर',
  amount: 'रकम',
  organizationName: 'संस्थाको नाम',
  expiryDate: 'म्याद सकिने मिति',
  dueDate: 'भुक्तानीको अन्तिम मिति',
};

const historyRows: NotificationHistoryItem[] = [
  { id: 'h-1', recipient: 'नारायण कार्की', phone: '9841234567', message: 'रसिद १०२४ को भुक्तानी पुष्टि', channel: 'SMS', status: 'Delivered', sentAt: '२०८३/०७/१७, बिहान ९:१२', provider: 'SMS प्रदायक' },
  { id: 'h-2', recipient: 'निरज गुरुङ', phone: '9812121212', message: 'बाँकी भुक्तानी सम्झना', channel: 'SMS', status: 'Pending', sentAt: '२०८३/०७/१६, साँझ ५:५०', provider: 'SMS प्रदायक' },
  { id: 'h-3', recipient: 'रिचा भण्डारी', phone: '9800009999', message: 'बीमा म्याद सकिने सूचना', channel: 'SMS', status: 'Failed', sentAt: '२०८३/०७/१६, बिहान ९:००', provider: 'SMS प्रदायक' },
];

const statusStyles: Record<NotificationStatus, { label: string; tone: 'success' | 'pending' | 'error' | 'info' }> = {
  Delivered: { label: 'पुगेको', tone: 'success' },
  Pending: { label: 'पठाउन बाँकी', tone: 'pending' },
  Failed: { label: 'असफल', tone: 'error' },
  Scheduled: { label: 'तालिकामा', tone: 'info' },
};

function renderPreview(content: string): string {
  return content.replace(/\{([A-Za-z]+)\}/gu, (placeholder, key: string) => (
    placeholderSamples[key] ?? placeholder
  ));
}

export function NotificationDashboard() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') ?? defaultTab;
  const notificationSettings = useNotificationSettings();
  const [savedTemplates, setSavedTemplates] = useState<NotificationTemplate[] | null>(null);
  const [savedAutomationRules, setSavedAutomationRules] = useState<NotificationAutomationRule[] | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateDraftOverride, setTemplateDraftOverride] = useState<string | null>(null);
  const [templateSearch, setTemplateSearch] = useState('');
  const [showValidation, setShowValidation] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const templates = savedTemplates
    ?? notificationSettings.settings?.templates
    ?? DEFAULT_NOTIFICATION_SETTINGS.templates;
  const automationRules = savedAutomationRules
    ?? notificationSettings.settings?.automationRules
    ?? DEFAULT_NOTIFICATION_SETTINGS.automationRules;
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId)
    ?? templates[0]
    ?? DEFAULT_NOTIFICATION_SETTINGS.templates[0];
  const templateDraft = templateDraftOverride ?? selectedTemplate.content;
  const filteredTemplates = useMemo(() => {
    const query = templateSearch.trim().toLocaleLowerCase();
    return query
      ? templates.filter((template) => template.name.toLocaleLowerCase().includes(query))
      : templates;
  }, [templateSearch, templates]);
  const detectedPlaceholders = [...templateDraft.matchAll(/\{([A-Za-z]+)\}/gu)]
    .map((match) => match[1])
    .filter((key, index, list) => list.indexOf(key) === index);
  const unknownPlaceholders = detectedPlaceholders.filter((key) => !placeholderSamples[key]);
  const messageLength = Array.from(templateDraft).length;
  const missingPlaceholders = ['vehicleNumber', 'amount', 'organizationName']
    .filter((key) => !detectedPlaceholders.includes(key));

  const visibleTab = ['overview', 'templates', 'history', 'automation'].includes(activeTab)
    ? activeTab
    : defaultTab;

  const updateTab = (tab: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (tab === defaultTab) next.delete('tab');
    else next.set('tab', tab);
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const selectTemplate = (template: NotificationTemplate) => {
    setSelectedTemplateId(template.id);
    setTemplateDraftOverride(template.content);
    setShowValidation(false);
    setSaveFeedback(null);
  };

  const saveSettings = async (settings: NotificationManagementSettings) => {
    setSaveFeedback(null);
    try {
      await notificationSettings.save(settings);
      setSaveFeedback('सूचना सेटिङ सुरक्षित भयो।');
      return true;
    } catch (error) {
      setSaveFeedback(error instanceof Error ? error.message : 'सूचना सेटिङ सुरक्षित गर्न सकिएन।');
      return false;
    }
  };

  const saveTemplate = async () => {
    if (!templateDraft.trim() || !selectedTemplate) {
      setShowValidation(true);
      return;
    }
    const updatedTemplates = templates.map((template) => (
      template.id === selectedTemplate.id ? { ...template, content: templateDraft } : template
    ));
    if (await saveSettings({ templates: updatedTemplates, automationRules })) {
      setSavedTemplates(updatedTemplates);
      setTemplateDraftOverride(updatedTemplates.find((template) => template.id === selectedTemplate.id)?.content ?? '');
    }
  };

  const toggleAutomationRule = async (rule: NotificationAutomationRule) => {
    const updatedRules = automationRules.map((item) => (
      item.id === rule.id ? { ...item, enabled: !item.enabled } : item
    ));
    if (await saveSettings({ templates, automationRules: updatedRules })) {
      setSavedAutomationRules(updatedRules);
    }
  };

  const insertPlaceholder = (key: string) => {
    const textarea = textareaRef.current;
    const token = `{${key}}`;
    const start = textarea?.selectionStart ?? templateDraft.length;
    const end = textarea?.selectionEnd ?? templateDraft.length;
    const next = `${templateDraft.slice(0, start)}${token}${templateDraft.slice(end)}`;
    setTemplateDraftOverride(next);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 pb-10">
      <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-white to-blue-50/70 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <Bell className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-semibold tracking-wide text-blue-700">व्यवस्थापन तथा नियन्त्रण</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">सूचना तथा SMS व्यवस्थापन</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              टेम्प्लेट र सूचना नियम सामान्य SettingsResource मा सुरक्षित गर्नुहोस्। वास्तविक SMS पठाउने तथा डेलिभरी इतिहास हेर्ने सुविधा छुट्टै backend सेवा जोडिएपछि उपलब्ध हुनेछ।
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
          <Button type="button" variant="outline" size="sm" disabled title="SMS सेवा जडान भएपछि उपलब्ध हुनेछ">
            <MessageSquareText className="mr-2 h-4 w-4" aria-hidden="true" />
            परीक्षण SMS पठाउनुहोस्
          </Button>
          <Badge
            variant="outline"
            className={`h-8 gap-1.5 rounded-full px-3 ${
              notificationSettings.loadError
                ? 'border-red-200 bg-red-50 text-red-800'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            }`}
          >
            {notificationSettings.loadError
              ? 'सेटिङ पढ्न असफल'
              : notificationSettings.isLoading
                ? 'सेटिङ लोड हुँदैछ'
                : 'सामान्य सेटिङ सेवा जडान'}
          </Badge>
        </div>
      </header>

      <Tabs value={visibleTab} onValueChange={updateTab} className="space-y-5">
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
          <TabsList className="h-auto min-w-full justify-start gap-1 bg-transparent p-0 md:min-w-0">
            {Object.entries(tabLabels).map(([value, label]) => (
              <TabsTrigger
                key={value}
                value={value}
                className="h-10 shrink-0 gap-2 rounded-lg px-4 text-sm data-[state=active]:bg-blue-700 data-[state=active]:text-white data-[state=active]:shadow-sm"
              >
                {value === 'overview' ? <Bell className="h-4 w-4" aria-hidden="true" /> : null}
                {value === 'templates' ? <FileText className="h-4 w-4" aria-hidden="true" /> : null}
                {value === 'history' ? <Clock3 className="h-4 w-4" aria-hidden="true" /> : null}
                {value === 'automation' ? <ShieldCheck className="h-4 w-4" aria-hidden="true" /> : null}
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'कुल सूचनाहरू', detail: 'जम्मा पठाइएका तथा तयार सूचनाहरू', icon: Bell },
              { label: 'सफलतापूर्वक पुगेका', detail: 'प्रापकसम्म पुगेको पुष्टि भएका SMS', icon: CheckCircle2 },
              { label: 'पठाउन बाँकी', detail: 'प्रक्रियामा रहेका सूचना', icon: Clock3 },
              { label: 'असफल सन्देश', detail: 'पुग्न नसकेका SMS', icon: TriangleAlert },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.label} className="rounded-xl border-slate-200 bg-white shadow-sm">
                  <CardContent className="flex items-start justify-between gap-3 p-5">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                      <p className="mt-2 text-3xl font-bold text-slate-400">—</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{item.detail}</p>
                    </div>
                    <span className="rounded-lg bg-slate-100 p-2.5 text-slate-500"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-sm leading-6 text-blue-900">
            <p className="font-semibold">प्रत्यक्ष विवरण उपलब्ध छैन</p>
            <p className="mt-1 text-blue-800">
              हाल सूचना इतिहास, पठाउने अवस्था, SMS ब्यालेन्स र वितरण दरका लागि backend सेवा जोडिएको छैन। तथ्याङ्क नदेखाई राखिएको छ, ताकि नमुना विवरणलाई वास्तविक नठानियोस्।
            </p>
          </div>

          <Card className="rounded-xl border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">हालका सूचना गतिविधि</CardTitle>
              <CardDescription>तलका विवरणहरू नमुना सामग्री हुन्; वास्तविक पठाउने इतिहास होइनन्।</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {sampleNotifications.map((item) => (
                <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">{item.title}</p>
                      <Badge variant={statusStyles[item.status].tone} size="sm">{statusStyles[item.status].label}</Badge>
                    </div>
                    <p className="text-sm leading-6 text-slate-600">{item.message}</p>
                    <p className="text-xs text-slate-500">{item.recipient} <span className="px-1">·</span> {item.createdAt}</p>
                  </div>
                  <Badge variant="outline" className="w-fit rounded-full">{item.channel === 'SMS' ? 'SMS' : 'एपभित्र'}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-5">
          <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-white to-slate-50 px-5 py-5 sm:px-7">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-blue-100 p-2 text-blue-700"><MessageSquareText className="h-5 w-5" aria-hidden="true" /></span>
                    <CardTitle className="text-xl">SMS टेम्प्लेटहरू</CardTitle>
                  </div>
                  <CardDescription className="mt-2 max-w-2xl text-sm leading-6">
                    भुक्तानी पुष्टि र सम्झना SMS को पाठ हेर्नुहोस्। भेरिएबलहरू सन्देश पठाउँदा सम्बन्धित विवरणबाट स्वतः भरिनेछन्।
                  </CardDescription>
                </div>
                <Badge variant="outline" className="w-fit gap-1.5 rounded-full border-amber-200 bg-amber-50 px-3 py-1 text-amber-800">
                  <Info className="h-3.5 w-3.5" aria-hidden="true" />
                  नमुना सम्पादक
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 p-5 sm:p-7">
              {notificationSettings.isLoading ? (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900" role="status">
                  सुरक्षित टेम्प्लेट तथा सूचना सेटिङ लोड हुँदैछन्...
                </div>
              ) : null}
              {notificationSettings.loadError ? (
                <div className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900 sm:flex-row sm:items-center sm:justify-between" role="alert">
                  <span>सुरक्षित सूचना सेटिङ पढ्न सकिएन: {notificationSettings.loadError}</span>
                  <Button type="button" variant="outline" size="sm" onClick={() => void notificationSettings.reload()}>
                    फेरि प्रयास गर्नुहोस्
                  </Button>
                </div>
              ) : null}
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="inline-flex w-fit flex-wrap gap-1 rounded-xl bg-slate-100 p-1" role="group" aria-label="SMS टेम्प्लेटको प्रकार">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      disabled={notificationSettings.isLoading || Boolean(notificationSettings.loadError)}
                      aria-pressed={selectedTemplate.id === template.id}
                      onClick={() => selectTemplate(template)}
                      className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                        selectedTemplate.id === template.id
                          ? 'bg-white text-blue-800 shadow-sm ring-1 ring-slate-200'
                          : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
                      }`}
                    >
                      {template.name}
                    </button>
                  ))}
                </div>
                <div className="relative w-full md:max-w-xs">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <Input
                    value={templateSearch}
                    onChange={(event) => setTemplateSearch(event.target.value)}
                    placeholder="टेम्प्लेट खोज्नुहोस्"
                    aria-label="टेम्प्लेट खोज्नुहोस्"
                    className="h-10 rounded-lg border-slate-200 pl-9"
                  />
                </div>
              </div>

              {templateSearch.trim() && filteredTemplates.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center">
                  <Search className="mx-auto h-5 w-5 text-slate-400" aria-hidden="true" />
                  <p className="mt-2 text-sm font-medium text-slate-700">मिल्दो टेम्प्लेट भेटिएन</p>
                  <p className="mt-1 text-xs text-slate-500">अर्को शब्द प्रयोग गरेर फेरि खोज्नुहोस्।</p>
                </div>
              ) : null}

              {templateSearch.trim() && filteredTemplates.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  <span className="self-center text-xs text-slate-500">खोज परिणाम:</span>
                  {filteredTemplates.map((template) => (
                    <Button key={template.id} type="button" variant="outline" size="sm" onClick={() => selectTemplate(template)}>
                      {template.name}
                    </Button>
                  ))}
                </div>
              ) : null}

              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label htmlFor="notification-template-content" className="text-sm font-semibold text-slate-800">टेम्प्लेटको पाठ</label>
                  <span className="text-xs text-slate-500">वर्ग: {selectedTemplate.category === 'Billing' ? 'बिलिङ तथा भुक्तानी' : selectedTemplate.category}</span>
                </div>
                <Textarea
                  id="notification-template-content"
                  ref={textareaRef}
                  value={templateDraft}
                  disabled={notificationSettings.isLoading || Boolean(notificationSettings.loadError)}
                  onChange={(event) => {
                    setTemplateDraftOverride(event.target.value);
                    setShowValidation(false);
                    setSaveFeedback(null);
                  }}
                  rows={5}
                  className="min-h-36 resize-y rounded-xl border-slate-200 p-4 text-sm leading-7 focus-visible:ring-blue-500"
                  aria-describedby="template-help template-validation"
                  placeholder="SMS सन्देशको पाठ यहाँ लेख्नुहोस्..."
                />
                <p id="template-help" className="text-xs leading-5 text-slate-500">
                  `{`{`}variable{`}`} ` хэлбэрको भेरिएबल प्रयोग गर्नुहोस्। सम्पादन गर्दा तलको नमुना तुरुन्तै अद्यावधिक हुन्छ।
                </p>
              </div>

              <section aria-labelledby="template-variables-heading" className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 id="template-variables-heading" className="text-sm font-semibold text-slate-800">उपलब्ध भेरिएबलहरू</h3>
                  <span className="text-xs text-slate-500">थिच्दा पाठमा थपिन्छ</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(placeholderLabels).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      disabled={notificationSettings.isLoading || Boolean(notificationSettings.loadError)}
                      onClick={() => insertPlaceholder(key)}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs transition-colors hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      title={`${label} भेरिएबल थप्नुहोस्`}
                    >
                      <span className="font-mono font-semibold text-blue-800">{`{${key}}`}</span>
                      <span className="text-slate-500">{label}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section aria-labelledby="template-preview-heading" className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/70 px-4 py-3">
                  <div>
                    <h3 id="template-preview-heading" className="text-sm font-semibold text-slate-800">सन्देशको पूर्वावलोकन</h3>
                    <p className="mt-0.5 text-xs text-slate-500">उदाहरण विवरण राखेर SMS कस्तो देखिन्छ भनेर जाँच गर्नुहोस्।</p>
                  </div>
                  <Badge variant="outline" className="gap-1.5 rounded-full bg-white text-slate-600">
                    <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
                    SMS नमुना
                  </Badge>
                </div>
                <div className="p-4 sm:p-5">
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        <MessageSquareText className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-slate-800">{placeholderSamples.organizationName}</p>
                        <p className="text-[11px] text-slate-500">SMS पूर्वावलोकन</p>
                      </div>
                    </div>
                    <p className="min-h-20 whitespace-pre-wrap break-words text-sm leading-7 text-slate-800">
                      {renderPreview(templateDraft) || <span className="italic text-slate-400">सन्देशको पाठ यहाँ देखिनेछ।</span>}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs">
                      <span className="text-slate-500">नमुना प्राप्तकर्ता: <span className="font-medium text-slate-700">सञ्जय महर्जन</span></span>
                      <span className="font-medium text-slate-600">{messageLength} अक्षर</span>
                    </div>
                  </div>
                </div>
              </section>

              {showValidation ? (
                <div id="template-validation" className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
                  unknownPlaceholders.length || missingPlaceholders.length || !templateDraft.trim()
                    ? 'border-amber-200 bg-amber-50 text-amber-900'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-900'
                }`} role="status">
                  {unknownPlaceholders.length || missingPlaceholders.length || !templateDraft.trim()
                    ? <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    : <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
                  <span>
                    {!templateDraft.trim()
                      ? 'सन्देश खाली छ। पहिले SMS को पाठ लेख्नुहोस्।'
                      : unknownPlaceholders.length
                        ? `यी भेरिएबलको नमुना उपलब्ध छैन: ${unknownPlaceholders.map((key) => `{${key}}`).join(', ')}`
                        : missingPlaceholders.length
                          ? `सन्देशमा आवश्यक विवरण छुटेको हुन सक्छ: ${missingPlaceholders.map((key) => placeholderLabels[key]).join(', ')}।`
                          : 'सन्देशको पाठ र उपलब्ध भेरिएबलहरू ठीक छन्।'}
                  </span>
                </div>
              ) : null}

              <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-2xl text-xs leading-5 text-slate-500">
                  <Info className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />
                  टेम्प्लेट र सूचना नियम विद्यमान सामान्य SettingsResource मा सुरक्षित हुन्छन्। SMS पठाउन र डेलिभरी अवस्था प्राप्त गर्न छुट्टै backend API चाहिन्छ।
                </p>
                <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={notificationSettings.isLoading || Boolean(notificationSettings.loadError)}
                    onClick={() => {
                      setTemplateDraftOverride(selectedTemplate.content);
                      setShowValidation(false);
                    }}
                    leftIcon={<PencilLine className="h-4 w-4" />}
                  >
                    सुरुको पाठ फर्काउनुहोस्
                  </Button>
                  <Button
                    type="button"
                    disabled={
                      notificationSettings.isLoading
                      || Boolean(notificationSettings.loadError)
                      || notificationSettings.isSaving
                      || !selectedTemplate
                    }
                    loading={notificationSettings.isSaving}
                    onClick={() => void saveTemplate()}
                  >
                    <Check className="mr-2 h-4 w-4" aria-hidden="true" />
                    टेम्प्लेट सुरक्षित गर्नुहोस्
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={notificationSettings.isLoading || Boolean(notificationSettings.loadError)}
                    onClick={() => setShowValidation(true)}
                  >
                    सन्देश जाँच्नुहोस्
                  </Button>
                </div>
              </div>
              {saveFeedback || notificationSettings.saveError ? (
                <p
                  className={`text-sm ${
                    saveFeedback === 'सूचना सेटिङ सुरक्षित भयो।' && !notificationSettings.saveError
                      ? 'text-emerald-700'
                      : 'text-red-700'
                  }`}
                  role="status"
                >
                  {notificationSettings.saveError ?? saveFeedback}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card className="rounded-xl border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">SMS पठाउने इतिहास</CardTitle>
              <CardDescription>तलका पङ्क्ति नमुना हुन्। वास्तविक इतिहास backend जोडिएपछि देखिनेछ।</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <div className="min-w-[760px]">
                  <div className="grid grid-cols-[1.1fr_1fr_1.5fr_0.8fr_1.2fr] gap-3 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600">
                    <span>प्रापक</span><span>मोबाइल नम्बर</span><span>सन्देश</span><span>अवस्था</span><span>पठाएको समय</span>
                  </div>
                  {historyRows.map((row) => (
                    <div key={row.id} className="grid grid-cols-[1.1fr_1fr_1.5fr_0.8fr_1.2fr] items-center gap-3 border-t border-slate-100 px-4 py-3.5 text-xs">
                      <span className="font-medium text-slate-800">{row.recipient}</span>
                      <span className="text-slate-600">{row.phone}</span>
                      <span className="truncate text-slate-600" title={row.message}>{row.message}</span>
                      <Badge variant={statusStyles[row.status].tone} size="sm" className="w-fit">{statusStyles[row.status].label}</Badge>
                      <span className="text-slate-500">{row.sentAt}</span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-500">SMS पठाउने सेवा जडान नभएसम्म यी नमुना पङ्क्तिले वास्तविक पठाइ वा डेलिभरी अवस्था जनाउँदैनन्।</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation" className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            <p className="font-semibold">नियमको सेटिङ सुरक्षित गर्न सकिन्छ; स्वचालित SMS पठाउने प्रक्रिया अलग छ</p>
            <p className="mt-1">
              सक्रिय/निष्क्रिय अवस्था सामान्य SettingsResource मा सुरक्षित हुन्छ। वास्तविक घटना पहिचान, समय तालिका र SMS पठाउन backend ले यो सेटिङ पढ्ने स्वचालन सेवा आवश्यक हुन्छ।
            </p>
          </div>
          <Card className="rounded-xl border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">स्वचालित सूचना नियमहरू</CardTitle>
              <CardDescription>बिलिङका घटनाका लागि सुरक्षित गर्न मिल्ने सूचना नियमहरू।</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {notificationSettings.loadError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900" role="alert">
                  सेटिङ पढ्न सकिएन: {notificationSettings.loadError}
                </div>
              ) : null}
              {automationRules.map((rule) => (
                <div key={rule.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">{rule.name}</p>
                      <Badge variant={rule.enabled ? 'success' : 'outline'} size="sm">{rule.enabled ? 'सेटिङमा सक्रिय' : 'सेटिङमा निष्क्रिय'}</Badge>
                    </div>
                    <p className="text-sm leading-6 text-slate-600">{rule.description}</p>
                    <p className="text-xs text-slate-500">सम्बन्धित टेम्प्लेट: {rule.template}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={notificationSettings.isLoading || Boolean(notificationSettings.loadError) || notificationSettings.isSaving}
                    onClick={() => void toggleAutomationRule(rule)}
                  >
                    {rule.enabled ? 'निष्क्रिय गर्नुहोस्' : 'सक्रिय गर्नुहोस्'}
                  </Button>
                </div>
              ))}
              {saveFeedback || notificationSettings.saveError ? (
                <p
                  className={`text-sm ${
                    saveFeedback === 'सूचना सेटिङ सुरक्षित भयो।' && !notificationSettings.saveError
                      ? 'text-emerald-700'
                      : 'text-red-700'
                  }`}
                  role="status"
                >
                  {notificationSettings.saveError ?? saveFeedback}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
