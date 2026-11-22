'use client';

import { useMemo, useRef, useState } from 'react';
import { AlertCircle, Check, MessageSquareText, RotateCcw } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { DEFAULT_SMS_SETTINGS } from '@/features/notifications/api/notification-settings.api';
import { useNotificationSettings } from '@/features/notifications/hooks/useNotificationSettings';
import type { SmsTemplate } from '@/features/notifications/types';

const PLACEHOLDER_ITEMS: ReadonlyArray<{ key: string; label: string; sample: string }> = [
  { key: 'vehicleNumber', label: 'सवारी नम्बर', sample: 'PROVINCE-5-01-001-KHA-1115' },
  { key: 'amount', label: 'रकम', sample: '३,६००' },
  { key: 'organizationName', label: 'संस्थाको नाम', sample: 'नारायणी यातायात व्यवसायी संघ' },
  { key: 'expiryDate', label: 'म्याद मिति', sample: '२०८३/०४/१५' },
  { key: 'dueDate', label: 'अन्तिम मिति', sample: '२०८३/०४/१५' },
];

const PLACEHOLDER_SAMPLES: Record<string, string> = Object.fromEntries(
  PLACEHOLDER_ITEMS.map((item) => [item.key, item.sample]),
);

function renderPreview(content: string): string {
  return content.replace(/\{([A-Za-z]+)\}/gu, (placeholder, key: string) => (
    PLACEHOLDER_SAMPLES[key] ?? placeholder
  ));
}

export function SmsTemplatesControl() {
  const { toast } = useToast();
  const notificationSettings = useNotificationSettings();
  const [draftTemplates, setDraftTemplates] = useState<SmsTemplate[] | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const savedTemplates = notificationSettings.settings?.templates ?? DEFAULT_SMS_SETTINGS.templates;
  const templates = draftTemplates ?? savedTemplates;
  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? templates[0] ?? DEFAULT_SMS_SETTINGS.templates[0],
    [selectedTemplateId, templates],
  );
  const activeCount = useMemo(
    () => templates.filter((template) => template.active).length,
    [templates],
  );
  const isDirty = useMemo(
    () => draftTemplates !== null && JSON.stringify(draftTemplates) !== JSON.stringify(savedTemplates),
    [draftTemplates, savedTemplates],
  );
  const isDisabled = notificationSettings.isLoading || Boolean(notificationSettings.loadError) || notificationSettings.isSavingTemplates;

  const updateTemplate = (id: string, patch: Partial<SmsTemplate>) => {
    setValidationError(null);
    setDraftTemplates((current) => {
      const base = current ?? savedTemplates;
      return base.map((template) => (template.id === id ? { ...template, ...patch } : template));
    });
  };

  const insertPlaceholder = (key: string) => {
    if (!selectedTemplate) return;
    const textarea = textareaRef.current;
    const token = `{${key}}`;
    const content = selectedTemplate.content;
    const start = textarea?.selectionStart ?? content.length;
    const end = textarea?.selectionEnd ?? content.length;
    const nextContent = `${content.slice(0, start)}${token}${content.slice(end)}`;
    updateTemplate(selectedTemplate.id, { content: nextContent });
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const handleReset = () => {
    setDraftTemplates(null);
    setValidationError(null);
  };

  const handleSave = async () => {
    const emptyTemplate = templates.find((template) => !template.content.trim());
    if (emptyTemplate) {
      setSelectedTemplateId(emptyTemplate.id);
      setValidationError(`"${emptyTemplate.name}" को सन्देश खाली हुन मिल्दैन।`);
      return;
    }

    setValidationError(null);
    try {
      await notificationSettings.saveTemplates(templates);
      setDraftTemplates(null);
      toast({ title: 'SMS टेम्प्लेट सेटिङ सुरक्षित भयो।' });
    } catch (error) {
      toast({
        title: 'SMS टेम्प्लेट सुरक्षित गर्न सकिएन।',
        description: error instanceof Error ? error.message : 'कृपया पुनः प्रयास गर्नुहोस्।',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="overflow-hidden rounded-xl border-border/80 bg-card shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 px-4 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <MessageSquareText className="size-4.5" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-foreground">SMS टेम्प्लेटहरू</h3>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
              भुक्तानी र रिमाइन्डर SMS सन्देशका टेम्प्लेट सम्पादन तथा सक्रिय गर्नुहोस्।
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="rounded-full border-border bg-muted/40 px-2.5 py-0.5 text-[11px] font-medium text-foreground"
        >
          {activeCount}/{templates.length} सक्रिय
        </Badge>
      </header>

      <div className="p-4 sm:p-6">
        {notificationSettings.loadError ? (
          <div role="alert" className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1">{notificationSettings.loadError}</span>
            <Button
              type="button"
              size="xs"
              variant="link"
              className="h-auto shrink-0 p-0"
              onClick={() => void notificationSettings.reload()}
            >
              पुनः प्रयास
            </Button>
          </div>
        ) : null}

        {notificationSettings.isLoading ? (
          <p role="status" className="py-6 text-center text-xs text-muted-foreground">
            SMS टेम्प्लेटहरू लोड हुँदैछन्...
          </p>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
            <div className="space-y-1.5" role="listbox" aria-label="SMS टेम्प्लेट सूची">
              {templates.map((template) => {
                const isSelected = selectedTemplate.id === template.id;
                return (
                  <button
                    key={template.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={Boolean(notificationSettings.loadError)}
                    onClick={() => {
                      setSelectedTemplateId(template.id);
                      setValidationError(null);
                    }}
                    className={`flex w-full items-center justify-between gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      isSelected
                        ? 'border-primary/40 bg-primary/5 text-foreground shadow-xs'
                        : 'border-border/70 bg-background text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-foreground">{template.name}</span>
                      <span className="mt-0.5 block truncate font-mono text-[10px] text-muted-foreground">{template.id}</span>
                    </span>
                    <span
                      className={`size-2 shrink-0 rounded-full ${template.active ? 'bg-emerald-500' : 'bg-slate-300'}`}
                      aria-label={template.active ? 'सक्रिय' : 'निष्क्रिय'}
                      title={template.active ? 'सक्रिय' : 'निष्क्रिय'}
                    />
                  </button>
                );
              })}
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-semibold text-foreground">{selectedTemplate.name}</h4>
                  <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground">
                    {selectedTemplate.id}
                  </Badge>
                </div>
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border/80 px-2.5 py-1.5 text-xs transition-colors hover:bg-muted/30">
                  <Checkbox
                    checked={selectedTemplate.active}
                    disabled={isDisabled}
                    onCheckedChange={(checked) => updateTemplate(selectedTemplate.id, { active: checked === true })}
                    aria-label={`${selectedTemplate.name} सक्रिय अवस्था`}
                  />
                  <span className={selectedTemplate.active ? 'font-medium text-emerald-700' : 'text-muted-foreground'}>
                    {selectedTemplate.active ? 'सक्रिय' : 'निष्क्रिय'}
                  </span>
                </label>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="sms-template-content" className="text-xs font-medium text-foreground">
                    सन्देशको पाठ
                  </label>
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {Array.from(selectedTemplate.content).length} अक्षर
                  </span>
                </div>
                <Textarea
                  id="sms-template-content"
                  ref={textareaRef}
                  rows={4}
                  value={selectedTemplate.content}
                  disabled={isDisabled}
                  onChange={(event) => updateTemplate(selectedTemplate.id, { content: event.target.value })}
                  placeholder="SMS सन्देशको पाठ यहाँ लेख्नुहोस्..."
                  className="min-h-28 resize-y text-sm leading-6"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[11px] text-muted-foreground">भेरिएबल:</span>
                {PLACEHOLDER_ITEMS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => insertPlaceholder(item.key)}
                    title={`${item.label} थप्नुहोस्`}
                    className="inline-flex items-center gap-1 rounded-md border border-border/80 bg-muted/30 px-2 py-1 text-[11px] transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  >
                    <span className="font-mono font-medium text-primary">{`{${item.key}}`}</span>
                    <span className="text-muted-foreground">{item.label}</span>
                  </button>
                ))}
              </div>

              <div className="rounded-lg border border-border/70 bg-muted/30 p-3.5">
                <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">SMS पूर्वावलोकन</p>
                <p className="whitespace-pre-wrap break-words text-xs leading-6 text-foreground">
                  {renderPreview(selectedTemplate.content) || (
                    <span className="italic text-muted-foreground">सन्देशको पाठ खाली छ।</span>
                  )}
                </p>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-border/70 pt-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-h-4 text-xs text-destructive" role="alert">
                  {validationError ?? notificationSettings.templatesSaveError ?? ''}
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleReset}
                    disabled={!isDirty || isDisabled}
                  >
                    <RotateCcw className="mr-1.5 size-3.5" aria-hidden="true" />
                    रिसेट गर्नुहोस्
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void handleSave()}
                    loading={notificationSettings.isSavingTemplates}
                    disabled={!isDirty || isDisabled}
                  >
                    <Check className="mr-1.5 size-3.5" aria-hidden="true" />
                    सुरक्षित गर्नुहोस्
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
