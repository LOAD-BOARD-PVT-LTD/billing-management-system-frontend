'use client';

import { Button } from '@/components/ui/button';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command';
import { formatCurrency } from '@/utils/numbers';
import { formatReceiptNumberWithFiscalYear } from '@/lib/receipts/receipt-number-display';
import { organizationConfig } from '@/constants/organization';
import { useTranslations } from '@/utils/translations';
import { authenticatedFetch } from '@/lib/authentication/authenticated-fetch';
import { globalSearchKeys } from '@/lib/query/query-keys';
import { useQuery } from '@tanstack/react-query';
import { FileText, Receipt as ReceiptIcon, Search, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type MemberSearchResult = {
  id: string;
  name: string;
  membershipNumber: string;
  vehicleNumber: string;
  status: string;
  registrationDateBs: string;
  registrationFiscalYear: string;
};

type BillingRuleSearchResult = {
  id: string;
  ruleName: string;
  ruleType: string;
  fiscalYear: string;
  isActive: boolean;
  effectiveDateBs: string;
  effectiveDateFiscalYear: string;
  effectiveDate: string | null;
};

type ReceiptSearchResult = {
  id: string;
  receiptNumber: string | null;
  fiscalYear: string | null;
  vehicleNumber: string;
  status: string;
  totalAmount: number | null;
  memberName: string | null;
  membershipNumber: string | null;
  dueDate: string | null;
  dueDateBs: string | null;
  dueDateFiscalYear: string | null;
};

type SearchResults = {
  members: MemberSearchResult[];
  billingRules: BillingRuleSearchResult[];
  receipts: ReceiptSearchResult[];
};

const INITIAL_RESULTS: SearchResults = {
  members: [],
  billingRules: [],
  receipts: [],
};

const MIN_QUERY_LENGTH = 2;

                                                                                         
                                                                                   
                                                                              

function useKeyboardShortcut(): { shortcutText: string; shortcutLabel: string } {
  const { t } = useTranslations();
  const [isMac] = useState(() => {
    if (typeof navigator !== 'undefined') {
      return /Mac/i.test(navigator.userAgent);
    }
    return false;
  });

  const shortcutText = isMac ? '⌘ K' : 'Ctrl K';
  const shortcutLabel = t('globalSearch.shortcutHint', { shortcut: shortcutText });

  return { shortcutText, shortcutLabel };
}

function formatStatus(status: string, t: (key: string) => string) {
  if (!status) return '';
  const key = `status.${status.toLowerCase()}`;
  const translated = t(key);
  return translated === key ? status : translated;
}

function formatRuleType(ruleType: string, t: (key: string) => string) {
  const normalized = ruleType.toLowerCase();
  const key = `billing.ruleType.${normalized}`;
  const translated = t(key);
  return translated === key ? ruleType.replace(/_/g, ' ').toLowerCase() : translated;
}

function formatAmount(amount: number | null, currencySymbol: string | null | undefined) {
  if (amount === null || Number.isNaN(amount)) return '';
  if (currencySymbol) {
    return `${currencySymbol} ${formatCurrency(amount)}`;
  }
  return formatCurrency(amount);
}

function formatAdDate(dateIso: string | null) {
  if (!dateIso) return '';
  try {
    return new Date(dateIso).toLocaleDateString('ne-NP');
  } catch {
    return '';
  }
}

function buildDateMeta(bsDate?: string | null, fiscalYear?: string | null, isoDate?: string | null) {
  const parts: string[] = [];
  if (bsDate) {
    parts.push(`${bsDate} (BS)`);
  }
  if (fiscalYear) {
    parts.push(fiscalYear);
  }
  const ad = formatAdDate(isoDate ?? null);
  if (!bsDate && ad) {
    parts.push(ad);
  }
  return parts.join(' • ');
}

export function GlobalSearch() {
  const { t } = useTranslations();
  const router = useRouter();
  const { currencySymbol } = organizationConfig;
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { shortcutText, shortcutLabel } = useKeyboardShortcut();

  const trimmedSearch = searchTerm.trim();
  const searchQuery = useQuery({
    queryKey: globalSearchKeys.search(trimmedSearch),
    enabled: open && trimmedSearch.length >= MIN_QUERY_LENGTH,
    queryFn: async ({ signal }) => {
      const response = await authenticatedFetch(
        `/api/search?q=${encodeURIComponent(trimmedSearch)}`,
        { signal },
      );
      const result = await response.json() as {
        success?: boolean;
        data?: Partial<SearchResults>;
        error?: { message?: string };
      } | null;

      if (!response.ok || !result?.success) {
        throw new Error(result?.error?.message || 'Search failed');
      }

      return {
        members: result.data?.members ?? [],
        billingRules: result.data?.billingRules ?? [],
        receipts: result.data?.receipts ?? [],
      } satisfies SearchResults;
    },
  });
  const results = searchQuery.data ?? INITIAL_RESULTS;
  const isLoading = searchQuery.isFetching;
  const errorMessage = searchQuery.error ? t('globalSearch.error') : null;

  const emptyMessage = useMemo(() => {
    if (errorMessage) return errorMessage;
    if (trimmedSearch.length < MIN_QUERY_LENGTH) {
      return t('globalSearch.typeToSearch');
    }
    if (isLoading) {
      return t('globalSearch.loading');
    }
    return t('globalSearch.noResults');
  }, [errorMessage, isLoading, trimmedSearch, t]);

  const handleMemberSelect = (member: MemberSearchResult) => {
    setOpen(false);
    const targetSearch = member.membershipNumber || member.name || trimmedSearch;
    router.push(`/dashboard/members?search=${encodeURIComponent(targetSearch)}`);
  };

  const handleBillingRuleSelect = (rule: BillingRuleSearchResult) => {
    setOpen(false);
    const params = new URLSearchParams();
    params.set('search', rule.ruleName);
    router.push(`/dashboard/billing-rules?${params.toString()}`);
  };

  const handleReceiptSelect = (receipt: ReceiptSearchResult) => {
    setOpen(false);
    const fallback = trimmedSearch || receipt.vehicleNumber || '';
    const target =
      receipt.membershipNumber || receipt.vehicleNumber || receipt.receiptNumber || fallback;
    router.push(`/dashboard/members?search=${encodeURIComponent(target)}`);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.key === 'k' || event.key === 'K') && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        aria-label={shortcutLabel}
        className="group flex h-10 w-full items-center gap-3 rounded-md border-border/60 bg-background/70 pl-3 pr-2 text-left text-sm text-muted-foreground transition hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <Search className="h-4 w-4 text-muted-foreground transition group-hover:text-foreground" />
        <span className="flex-1 truncate">{t('globalSearch.triggerPlaceholder')}</span>
        <kbd className="hidden rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm md:inline-flex">
          {shortcutText}
        </kbd>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) setSearchTerm('');
        }}
        title={t('globalSearch.dialogTitle')}
        description={t('globalSearch.typeToSearch')}
      >
        <CommandInput
          value={searchTerm}
          onValueChange={setSearchTerm}
          placeholder={t('globalSearch.inputPlaceholder')}
        />
        <CommandList>
          <CommandEmpty>{emptyMessage}</CommandEmpty>

          {results.members.length ? (
            <CommandGroup heading={t('globalSearch.membersGroup')}>
              {results.members.map((member) => (
                <CommandItem
                  key={`member-${member.id}`}
                  value={`${member.name} ${member.membershipNumber} ${member.vehicleNumber}`}
                  onSelect={() => handleMemberSelect(member)}
                >
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-1 flex-col overflow-hidden">
                    <span className="truncate text-sm font-medium text-foreground">{member.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {member.vehicleNumber
                        ? `${member.membershipNumber} | ${member.vehicleNumber}`
                        : member.membershipNumber}
                    </span>
                    {member.registrationDateBs ? (
                      <span className="truncate text-[10px] text-muted-foreground">
                        {buildDateMeta(member.registrationDateBs, member.registrationFiscalYear)}
                      </span>
                    ) : null}
                  </div>
                  <CommandShortcut className="text-xs uppercase tracking-wide text-muted-foreground">
                    {formatStatus(member.status, t)}
                  </CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          {results.billingRules.length ? (
            <CommandGroup heading={t('globalSearch.billingRulesGroup')}>
              {results.billingRules.map((rule) => (
                <CommandItem
                  key={`rule-${rule.id}`}
                  value={`${rule.ruleName} ${rule.fiscalYear} ${rule.ruleType}`}
                  onSelect={() => handleBillingRuleSelect(rule)}
                >
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-1 flex-col overflow-hidden">
                    <span className="truncate text-sm font-medium text-foreground">{rule.ruleName}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {[rule.fiscalYear, formatRuleType(rule.ruleType, t)].filter(Boolean).join(' • ')}
                    </span>
                    <span className="truncate text-[10px] text-muted-foreground">
                      {buildDateMeta(rule.effectiveDateBs, rule.effectiveDateFiscalYear, rule.effectiveDate)}
                    </span>
                  </div>
                  <CommandShortcut className="text-xs uppercase tracking-wide text-muted-foreground">
                    {formatStatus(rule.isActive ? 'active' : 'inactive', t)}
                  </CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          {results.receipts.length ? (
            <CommandGroup heading={t('globalSearch.receiptsGroup')}>
              {results.receipts.map((receipt) => {
                const secondaryLine = [
                  receipt.memberName || receipt.membershipNumber,
                  receipt.vehicleNumber,
                ]
                  .filter(Boolean)
                  .join(' • ');

                const metaLine = [
                  formatAmount(receipt.totalAmount, currencySymbol),
                  buildDateMeta(receipt.dueDateBs, receipt.dueDateFiscalYear, receipt.dueDate),
                ]
                  .filter(Boolean)
                  .join(' • ');

                return (
                  <CommandItem
                    key={`receipt-${receipt.id}`}
                    value={`${receipt.receiptNumber ?? ''} ${receipt.vehicleNumber} ${receipt.memberName ?? ''}`}
                    onSelect={() => handleReceiptSelect(receipt)}
                  >
                    <ReceiptIcon className="h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-1 flex-col overflow-hidden">
                      <span className="truncate text-sm font-medium text-foreground">
                        {formatReceiptNumberWithFiscalYear(receipt.receiptNumber, receipt.fiscalYear) || t('globalSearch.receiptFallback')}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {secondaryLine || t('globalSearch.receiptNoDetails')}
                      </span>
                      {metaLine ? (
                        <span className="truncate text-[10px] text-muted-foreground">{metaLine}</span>
                      ) : null}
                    </div>
                    <CommandShortcut className="text-xs uppercase tracking-wide text-muted-foreground">
                      {formatStatus(receipt.status, t)}
                    </CommandShortcut>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ) : null}
        </CommandList>
      </CommandDialog>
    </>
  );
}
