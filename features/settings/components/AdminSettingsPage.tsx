'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, Settings2, X } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SETTINGS_CATEGORIES, SETTINGS_ENTRIES, type SettingsCategoryId } from '@/features/settings/model/settings-catalog';
import { SettingsEntryCard } from '@/features/settings/components/SettingsEntryCard';
import { FiscalYearManagement } from '@/features/settings/components/FiscalYearManagement';
import { ReceiptCancelWindowControl } from '@/features/settings/components/ReceiptCancelWindowControl';
import { FontasyHimaliControl } from '@/features/settings/components/FontasyHimaliControl';

const DEFAULT_CATEGORY: SettingsCategoryId = 'billing-receipts';

export function AdminSettingsPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryCategory = searchParams.get('tab');
  const selectedCategory = SETTINGS_CATEGORIES.some((category) => category.id === queryCategory)
    ? queryCategory as SettingsCategoryId
    : DEFAULT_CATEGORY;
  const [search, setSearch] = useState('');
  const [pendingFocus, setPendingFocus] = useState<{ category: SettingsCategoryId; entryId: string } | null>(null);

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return [];
    return SETTINGS_ENTRIES.filter((entry) => `${entry.title} ${entry.description} ${entry.unavailableReason ?? ''} ${(entry.searchTerms ?? []).join(' ')}`.toLocaleLowerCase().includes(query));
  }, [search]);

  const setCategory = (category: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (category === DEFAULT_CATEGORY) next.delete('tab');
    else next.set('tab', category);
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  useEffect(() => {
    if (!pendingFocus || selectedCategory !== pendingFocus.category) return;
    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(pendingFocus.entryId);
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target?.focus({ preventScroll: true });
      setPendingFocus(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pendingFocus, selectedCategory]);

  const selectSearchResult = (category: SettingsCategoryId, entryId: string) => {
    setPendingFocus({ category, entryId });
    setCategory(category);
    setSearch('');
  };

  return (
    <div className="space-y-5 pb-8">
      <header className="flex items-start gap-3">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Settings2 className="h-5 w-5" aria-hidden="true" /></span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">एडमिन सेटिङ्स</h1>
          <p className="mt-1 text-sm text-muted-foreground">प्रणालीका सेटिङ्स, बिलिङ नीतिहरू तथा एकीकृत सेवाहरू व्यवस्थापन गर्नुहोस्।</p>
        </div>
      </header>

      <FontasyHimaliControl />

      <div className="relative max-w-lg">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="सेटिङ खोज्नुहोस्: VAT, रसिद, TQMS, SMS..." aria-label="सेटिङ खोज्नुहोस्" aria-expanded={Boolean(search.trim())} aria-controls="settings-search-results" className="h-9 bg-white pl-9 pr-9 text-sm" />
        {search ? <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted" aria-label="खोज हटाउनुहोस्" onClick={() => setSearch('')}><X className="h-3.5 w-3.5" /></button> : null}
        {search.trim() ? (
          <div id="settings-search-results" className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-lg" role="region" aria-label="सेटिङ खोज परिणाम">
            {filteredEntries.length ? filteredEntries.map((entry) => {
              const category = SETTINGS_CATEGORIES.find((item) => item.id === entry.category);
              const isAvailable = Boolean(entry.href) || entry.id === 'receipt-fiscal-year-control' || entry.id === 'receipt-cancel-window';
              return <button key={entry.id} type="button" className="flex w-full items-start justify-between gap-3 rounded px-2.5 py-2 text-left hover:bg-accent" onClick={() => selectSearchResult(entry.category, entry.id)}><span><span className="block text-xs font-medium">{entry.title}</span><span className="mt-0.5 block text-[10px] text-muted-foreground">{category?.label}</span></span><span className="mt-0.5 text-[10px] text-muted-foreground">{isAvailable ? 'उपलब्ध' : 'जडान छैन'}</span></button>;
            }) : <p className="px-3 py-4 text-xs text-muted-foreground">मिल्दो सेटिङ भेटिएन।</p>}
          </div>
        ) : null}
      </div>

      <Tabs value={selectedCategory} onValueChange={setCategory}>
        <div className="overflow-x-auto rounded-lg border border-border bg-white p-1">
          <TabsList className="inline-flex h-auto min-w-full justify-start gap-1 bg-transparent p-0 md:grid md:grid-cols-6">
            {SETTINGS_CATEGORIES.map((category) => {
              const Icon = category.icon;
              return <TabsTrigger key={category.id} value={category.id} className="h-9 shrink-0 gap-2 px-3 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground md:w-full"><Icon className="h-3.5 w-3.5" aria-hidden="true" /><span>{category.label}</span></TabsTrigger>;
            })}
          </TabsList>
        </div>

        {SETTINGS_CATEGORIES.map((category) => (
          <TabsContent key={category.id} value={category.id} className="mt-4 space-y-3 focus-visible:outline-none">
            <div className="mb-3"><h2 className="text-base font-semibold">{category.label}</h2><p className="mt-0.5 text-xs text-muted-foreground">{category.description}</p></div>
            <div className="grid gap-3 xl:grid-cols-2">
              {SETTINGS_ENTRIES.filter((entry) => entry.category === category.id).map((entry) => (
                entry.id === 'receipt-fiscal-year-control'
                  ? <div key={entry.id} id={entry.id} tabIndex={-1} className="scroll-mt-28 outline-none focus-visible:ring-2 focus-visible:ring-ring xl:col-span-2"><FiscalYearManagement /></div>
                  : entry.id === 'receipt-cancel-window'
                    ? <div key={entry.id} id={entry.id} tabIndex={-1} className="scroll-mt-28 outline-none focus-visible:ring-2 focus-visible:ring-ring xl:col-span-2"><ReceiptCancelWindowControl /></div>
                  : <SettingsEntryCard key={entry.id} entry={entry} />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <p className="text-[10px] text-muted-foreground">सेटिङको उपलब्धता हालको API तथा अनुमति अनुसार हुन्छ। संस्था र प्रयोगकर्ता परिवर्तनका लागि सम्बन्धित मोड्युल प्रयोग गर्नुहोस्।</p>
    </div>
  );
}