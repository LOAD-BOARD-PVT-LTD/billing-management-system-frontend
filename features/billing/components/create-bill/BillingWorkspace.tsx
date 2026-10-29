'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useUsers } from '@/features/administration/users/hooks/useUsers';
import { useBillingEntities } from '@/features/administration/billing-entities/hooks/useBillingEntities';
import { useBillingRules } from '@/features/billing-rules/hooks/useBillingRules';
import { buildBillResourceContent } from '@/features/billing/api/bill-resource.api';
import { useCreateBill } from '@/features/billing/hooks/useCreateBill';
import { BillingHeader } from '@/features/billing/components/create-bill/BillingHeader';
import { DuplicateBillWarningDialog } from '@/features/billing/components/create-bill/DuplicateBillWarningDialog';
import { VehicleCategoryMappingGate } from '@/features/billing/components/create-bill/VehicleCategoryMappingGate';
import { BillingItems } from '@/features/billing/components/create-bill/BillingItems';
import { PaymentSection } from '@/features/billing/components/create-bill/PaymentSection';
import { VehicleBilling } from '@/features/billing/components/create-bill/VehicleBilling';
import { MembershipHistory } from '@/features/billing/components/membership/MembershipHistory';
import { VehicleSummary } from '@/features/billing/components/vehicle-summary/VehicleSummary';
import type { BillingLine, BillingVehicle } from '@/features/billing/model/types';
import type { BillDetails, MembershipBillInput, SavedBill } from '@/features/billing/model/bill.types';
import { findDuplicateBillItems, type DuplicateBillMatch } from '@/features/billing/utils/duplicate-bill-check';
import { useReceipts } from '@/features/receipts/hooks/use-receipts';
import { useDownloadReceipt } from '@/features/receipts/hooks/use-download-receipt';
import { useLinkedFeeRules } from '@/features/settings/hooks/useLinkedFeeRules';
import { useVehicleBlacklist } from '@/features/vehicle/blacklist/hooks/useVehicleBlacklist';
import { PrintableBillReceipt } from '@/features/receipts/components/PrintableBillReceipt';
import { resolveBillBranding } from '@/shared/document-generation/utils/resolve-bill-branding';
import { useFiscalYearSelectorSettings } from '@/features/settings/hooks/useFiscalYearSelectorSettings';
import { DEFAULT_FISCAL_YEAR_SELECTOR_SETTINGS } from '@/features/settings/api/fiscal-year-selector.api';
import {
  formatNepaliFiscalYearLabel,
  generateNepaliFiscalYearOptions,
  parseFiscalYear,
} from '@/utils/nepali-calender-dates/nepali-fiscal-year';

function getBillValidationMessages(input: {
  vehicle: BillingVehicle | null;
  details: BillDetails | null;
  items: BillingLine[];
  subtotal: number;
  discount: number;
  isLoadingRules: boolean;
  isLoadingLinkedFeeRules: boolean;
  linkedFeeRulesError: string | null;
  hasPeriodicBillingRule: boolean;
  billingMonths: number;
  ruleAmounts: Record<string, number>;
  isCheckingBlacklist: boolean;
  blacklistError: string | null;
  isBlacklisted: boolean;
}): string[] {
  const {
    vehicle,
    details,
    items,
    subtotal,
    discount,
    isLoadingRules,
    isLoadingLinkedFeeRules,
    linkedFeeRulesError,
    hasPeriodicBillingRule,
    billingMonths,
    ruleAmounts,
    isCheckingBlacklist,
    blacklistError,
    isBlacklisted,
  } = input;
  const messages: string[] = [];
  if (!vehicle) messages.push('पहिले सवारी छान्नुहोस्।');
  if (vehicle && isCheckingBlacklist) messages.push('सवारीको कालोसूची अवस्था जाँच हुँदैछ।');
  if (vehicle && blacklistError) messages.push(`कालोसूची अवस्था जाँच गर्न सकिएन: ${blacklistError}`);
  if (vehicle && isBlacklisted) messages.push('यो सवारी कालोसूचीमा छ। यसका लागि बिल बनाउन मिल्दैन।');
  if (!details?.branchId) messages.push('बिलिङ शाखा छान्नुहोस्।');
  if (!details?.branchCode.trim()) messages.push('शाखाको कोड उपलब्ध छैन। बिलिङ शाखाको विवरण जाँच्नुहोस्।');
  if (!details?.fiscalYearId) messages.push('वित्तीय वर्ष छान्नुहोस्।');
  if (!details?.billingDate || !details.periodStart || !details.periodEnd) {
    messages.push('भुक्तानी मिति र बिलिङ अवधि पूरा गर्नुहोस्।');
  }

  if (details?.periodStart && details.periodEnd && details.periodStart > details.periodEnd) {
    messages.push('अवधिको सुरु मिति अन्त्य मितिभन्दा पछि हुन मिल्दैन।');
  }
  if (isLoadingRules) messages.push('बिलिङ नियम लोड हुँदैछ।');
  if (vehicle && isLoadingLinkedFeeRules) messages.push('जोडिएको शुल्क नियम लोड हुँदैछ।');
  if (vehicle && linkedFeeRulesError) messages.push(`जोडिएको शुल्क नियम लोड गर्न सकिएन: ${linkedFeeRulesError}`);
  if (hasPeriodicBillingRule && (!Number.isInteger(billingMonths) || billingMonths < 1 || billingMonths > 12)) {
    messages.push('आवधिक बिलिङका लागि १ देखि १२ सम्मको बिलिङ महिना छान्नुहोस्।');
  }
  if (items.length === 0) {
    messages.push(details?.allowManualReceiptAmountOverride
      ? 'रसीदमा समावेश गर्न कम्तीमा एउटा शुल्क चयन गर्नुहोस् वा Manual शुल्क थप्नुहोस्।'
      : 'बिलमा कम्तीमा एउटा शुल्क थप्नुहोस्।');
  }
  if (items.some((item) => !item.title.trim())) messages.push('सबै शुल्कका लागि शीर्षक छान्नुहोस्।');
  if (items.some((item) => !item.entityId)) messages.push('सबै शुल्कका लागि Billing Entity छान्नुहोस्।');
  if (items.some((item) => !Number.isFinite(item.amount) || item.amount < 0)) {
    messages.push('शुल्क रकम शून्य वा सोभन्दा बढी हुनुपर्छ।');
  }
  if (!details?.allowManualReceiptAmountOverride && items.some((item) =>
    item.isManual || (item.ruleId !== undefined && ruleAmounts[item.ruleId] !== undefined && item.amount !== ruleAmounts[item.ruleId]),
  )) {
    messages.push('चयन गरिएको शाखामा Manual Amount Override अनुमति छैन।');
  }
  const calculatedSubtotal = items.reduce((sum, item) => sum + item.amount, 0);
  if (!Number.isFinite(subtotal) || subtotal !== calculatedSubtotal) {
    messages.push('शुल्क रकम परिवर्तन भएको छ। कुल रकम पुनः जाँच गर्नुहोस्।');
  }
  if (!Number.isFinite(discount) || discount < 0 || discount > subtotal) {
    messages.push('छुट रकम कुल रकमभन्दा बढी हुन मिल्दैन।');
  }
  return messages;
}

export function BillingWorkspace() {
  const { user: authUser } = useAuth();
  const { records: users } = useUsers();
  const billingRules = useBillingRules();
  const linkedFeeRuleSettings = useLinkedFeeRules();
  const { settings: fiscalYearSelectorSettings } = useFiscalYearSelectorSettings();
  const { records: billingEntities } = useBillingEntities();
  const {
    records: blacklistedVehicles,
    isLoading: isLoadingBlacklist,
    error: blacklistError,
    reload: reloadBlacklist,
  } = useVehicleBlacklist();
  const [selectedVehicle, setSelectedVehicle] = useState<BillingVehicle | null>(null);
  const [manualItems, setManualItems] = useState<BillingLine[]>([]);
  const [itemOverrides, setItemOverrides] = useState<Record<string, Partial<BillingLine>>>({});
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(() => new Set());
  const [suppressedLinkedItemIds, setSuppressedLinkedItemIds] = useState<Set<string>>(() => new Set());
  const [selectedFiscalYearId, setSelectedFiscalYearId] = useState('');
  const [billingMonths, setBillingMonths] = useState(1);
  const [discount, setDiscount] = useState(0);
  const [billingDetails, setBillingDetails] = useState<BillDetails | null>(null);
  const billingDetailsRef = useRef<BillDetails | null>(null);
  const [savedBill, setSavedBill] = useState<SavedBill | null>(null);
  const { records: existingBills, error: existingBillsError, isLoading: isLoadingExistingBills, reload: reloadBills } = useReceipts();
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateBillMatch[]>([]);
  const [pendingSubmit, setPendingSubmit] = useState<MembershipBillInput | null>(null);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [duplicateCheckError, setDuplicateCheckError] = useState<string | null>(null);
  const createBill = useCreateBill();
  const { downloadReceipt, downloadingReceiptId } = useDownloadReceipt();
  const selectedVehicleIsBlacklisted = Boolean(
    selectedVehicle?.tqmsVehicleId
    && blacklistedVehicles.some((record) => (
      record.vehicleId.trim().toLocaleLowerCase()
      === selectedVehicle.tqmsVehicleId.trim().toLocaleLowerCase()
    )),
  );
  const verifyVehicleCanBeBilled = async (vehicle: BillingVehicle): Promise<boolean> => {
    if (!vehicle.tqmsVehicleId.trim()) {
      setDuplicateCheckError('TQMS सवारी ID उपलब्ध नभएकाले कालोसूची जाँच गर्न सकिएन।');
      return false;
    }
    try {
      const result = await reloadBlacklist();
      if (result.error) throw result.error;
      const isBlacklisted = result.data?.some((record) => (
        record.vehicleId.trim().toLocaleLowerCase()
        === vehicle.tqmsVehicleId.trim().toLocaleLowerCase()
      ));
      if (isBlacklisted) {
        setDuplicateCheckError('यो सवारी कालोसूचीमा छ। यसका लागि बिल बनाउन मिल्दैन।');
        return false;
      }
      return true;
    } catch (error) {
      setDuplicateCheckError(
        `कालोसूची अवस्था जाँच गर्न सकिएन: ${error instanceof Error ? error.message : 'पुनः प्रयास गर्नुहोस्।'}`,
      );
      return false;
    }
  };
  const savedBillBranding = useMemo(
    () => savedBill ? resolveBillBranding(savedBill, billingEntities) : {},
    [savedBill, billingEntities],
  );
  const selectorSettings = fiscalYearSelectorSettings ?? DEFAULT_FISCAL_YEAR_SELECTOR_SETTINGS;
  const normalFiscalYearOptions = new Set(generateNepaliFiscalYearOptions({
    yearsBack: selectorSettings.yearsBack,
    yearsForward: selectorSettings.yearsForward,
  }));
  const archivedFiscalYearOptions = new Set(selectorSettings.archivedYears.flatMap((year) => {
    const parsedYear = parseFiscalYear(year);
    return parsedYear === null ? [] : [formatNepaliFiscalYearLabel(parsedYear)];
  }));
  const availableFiscalYears = billingRules.config.fiscalYears.filter((year) => {
    if (year.status !== 'ACTIVE') return false;
    const parsedYear = parseFiscalYear(year.code ?? '') ?? parseFiscalYear(year.name);
    if (parsedYear === null) return false;
    const label = formatNepaliFiscalYearLabel(parsedYear);
    return year.isDefault || (normalFiscalYearOptions.has(label) && !archivedFiscalYearOptions.has(label));
  });
  const defaultFiscalYear = availableFiscalYears.find((year) => year.isDefault) ?? availableFiscalYears[0];
  const fiscalYearId = availableFiscalYears.some((year) => year.id === selectedFiscalYearId)
    ? selectedFiscalYearId
    : defaultFiscalYear?.id ?? '';
  const currentUserRecord = users.find((user) =>
    user.email.toLocaleLowerCase() === authUser?.email.toLocaleLowerCase(),
  );
  const assignedBranchId = currentUserRecord?.branchId;
  const billCreator = authUser ? {
    id: currentUserRecord?.id ?? authUser.id,
    name: currentUserRecord?.name.trim() || authUser.name?.trim() || authUser.email,
    username: currentUserRecord?.email || authUser.email,
  } : undefined;

  const updateItem = (id: string, changes: Partial<BillingLine>) => {
    if ('amount' in changes && !billingDetailsRef.current?.allowManualReceiptAmountOverride) return;
    if (id.startsWith('manual-')) {
      setManualItems((current) => current.map((item) => item.id === id ? { ...item, ...changes } : item));
      return;
    }
    setItemOverrides((current) => ({ ...current, [id]: { ...current[id], ...changes } }));
  };

  const selectItemForReceipt = (id: string) => {
    setSelectedItemIds((current) => new Set(current).add(id));
    setSuppressedLinkedItemIds((current) => {
      if (!current.has(id)) return current;
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  };

  const deselectItemFromReceipt = (id: string, isLinkedAutoSelected = false) => {
    setSelectedItemIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    if (isLinkedAutoSelected) {
      setSuppressedLinkedItemIds((current) => new Set(current).add(id));
      return;
    }

    const sourceRule = billingRules.config.rules.find((rule) => rule.id === id);
    if (!sourceRule) return;
    const linkedFeeHeadIds = new Set(linkedFeeRuleSettings.settings?.rules
      .filter((rule) => rule.active && rule.fiscalYearId === fiscalYearId && rule.sourceFeeHeadId === sourceRule.feeHeadId)
      .map((rule) => rule.linkedFeeHeadId) ?? []);
    const linkedRuleIds = new Set(billingRules.config.rules
      .filter((rule) => rule.fiscalYearId === fiscalYearId && linkedFeeHeadIds.has(rule.feeHeadId))
      .map((rule) => rule.id));
    setSuppressedLinkedItemIds((current) => {
      const next = new Set(current);
      linkedRuleIds.forEach((linkedRuleId) => next.delete(linkedRuleId));
      return next;
    });
  };

  const addManualItem = () => {
    setManualItems((current) => [
      ...current,
      {
        id: `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        title: '',
        amount: 0,
        entity: '',
        entityId: '',
        isManual: true,
      },
    ]);
  };

  const handleSelectVehicle = (vehicle: BillingVehicle) => {
    setSelectedVehicle(vehicle);
    setBillingMonths(
      Number.isInteger(vehicle.billingMonths) && vehicle.billingMonths >= 1 && vehicle.billingMonths <= 12
        ? vehicle.billingMonths
        : 1,
    );
    setBillingDetails(null);
    setSavedBill(null);
    setManualItems([]);
    setItemOverrides({});
    setSelectedItemIds(new Set());
    setSuppressedLinkedItemIds(new Set());
    setDiscount(0);
  };

  const handleBillingDetailsChange = useCallback((details: BillDetails) => {
    const previousDetails = billingDetailsRef.current;
    if (previousDetails?.branchId !== details.branchId) {
      setSelectedItemIds(new Set());
    }
    if (previousDetails?.branchId !== details.branchId && !details.allowManualReceiptAmountOverride) {
      setItemOverrides((current) => Object.fromEntries(
        Object.entries(current).map(([id, changes]) => {
          return [id, Object.fromEntries(Object.entries(changes).filter(([key]) => key !== 'amount'))];
        }).filter(([, changes]) => Object.keys(changes).length > 0),
      ));
      setManualItems([]);
    }
    billingDetailsRef.current = details;
    setBillingDetails(details);
  }, []);

  const handleSaveBill = async (
    items: BillingLine[],
    subtotal: number,
    paymentMethod: string,
    note: string,
    hasPeriodicBillingRule: boolean,
    ruleAmounts: Record<string, number>,
  ) => {
    const validationMessages = getBillValidationMessages({
      vehicle: selectedVehicle,
      details: billingDetails,
      items,
      subtotal,
      discount,
      isLoadingRules: billingRules.isLoading,
      isLoadingLinkedFeeRules: linkedFeeRuleSettings.isLoading,
      linkedFeeRulesError: linkedFeeRuleSettings.error,
      hasPeriodicBillingRule,
      billingMonths,
      ruleAmounts,
      isCheckingBlacklist: isLoadingBlacklist,
      blacklistError,
      isBlacklisted: selectedVehicleIsBlacklisted,
    });
    if (validationMessages.length > 0) return;
    if (!selectedVehicle || !billingDetails) return;

    setDuplicateCheckError(null);
    setIsCheckingDuplicates(true);
    const canCreateBill = await verifyVehicleCanBeBilled(selectedVehicle);
    setIsCheckingDuplicates(false);
    if (!canCreateBill) return;

    const pendingInput: MembershipBillInput = {
      vehicle: selectedVehicle,
      ...(billCreator ? { createdBy: billCreator } : {}),
      details: {
        ...billingDetails,
        billingMonths: hasPeriodicBillingRule ? billingMonths : 0,
      },
      items,
      subtotal,
      discount,
      paymentMethod,
      note,
    };

    setDuplicateCheckError(null);
    setIsCheckingDuplicates(true);

    try {
      if (existingBillsError) {
        setDuplicateCheckError(existingBillsError);
        return;
      }

      let billRecords = existingBills;
      if (billRecords.length === 0 && !isLoadingExistingBills) {
        const refetchResult = await reloadBills();
        billRecords = refetchResult.data ?? [];
      }

      if (isLoadingExistingBills) return;

      const duplicateMatches = findDuplicateBillItems(buildBillResourceContent(pendingInput), billRecords);
      if (duplicateMatches.length > 0) {
        setDuplicateMatches(duplicateMatches);
        setPendingSubmit(pendingInput);
        return;
      }

      const bill = await createBill.create(pendingInput);
      setSavedBill(bill);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'भिल जाँच गर्दा समस्या आयो।';
      setDuplicateCheckError(message);
    } finally {
      setIsCheckingDuplicates(false);
    }
  };

  const handleDuplicateConfirmation = async () => {
    if (!pendingSubmit) return;
    setDuplicateCheckError(null);
    setIsCheckingDuplicates(true);
    try {
      if (!await verifyVehicleCanBeBilled(pendingSubmit.vehicle)) return;
      const bill = await createBill.create(pendingSubmit);
      setSavedBill(bill);
      setDuplicateMatches([]);
      setPendingSubmit(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'बिल सेभ हुन सकेन।';
      setDuplicateCheckError(message);
    } finally {
      setIsCheckingDuplicates(false);
    }
  };

  if (savedBill) {
    return (
      <PrintableBillReceipt
        bill={savedBill}
        branding={savedBillBranding}
        onBack={() => {
          setSavedBill(null);
          setSelectedVehicle(null);
          setBillingDetails(null);
          setManualItems([]);
          setItemOverrides({});
          setSelectedItemIds(new Set());
          setDiscount(0);
          setDuplicateMatches([]);
          setPendingSubmit(null);
          setDuplicateCheckError(null);
        }}
      />
    );
  }

  return (
    <>
      <DuplicateBillWarningDialog
        open={duplicateMatches.length > 0}
        matches={duplicateMatches}
        isSubmitting={isCheckingDuplicates}
        onCancel={() => {
          setDuplicateMatches([]);
          setPendingSubmit(null);
          setDuplicateCheckError(null);
        }}
        onConfirm={() => {
          void handleDuplicateConfirmation();
        }}
      />
      <section className="w-full space-y-1 pb-1">
      <BillingHeader
        selectedVehicle={selectedVehicle}
        onSelectVehicle={handleSelectVehicle}
        onClearSelection={() => setSelectedVehicle(null)}
        onSmsPhoneChange={(phone) => {
          setSelectedVehicle((current) => current ? { ...current, smsPhone: phone } : current);
        }}
      />

      {selectedVehicle && (
        <VehicleCategoryMappingGate key={selectedVehicle.id} vehicle={selectedVehicle}>
          {(mappedCategoryId) => {
            const rules = billingRules.config.rules.filter((rule) =>
              rule.status === 'ACTIVE'
              && billingRules.config.feeHeads.some((feeHead) => feeHead.id === rule.feeHeadId && feeHead.status === 'ACTIVE')
              && rule.fiscalYearId === fiscalYearId
              && (rule.scope !== 'COMMON'
                || rule.amount !== 0
                || billingDetails?.allowManualReceiptAmountOverride === true)
              && (rule.scope === 'COMMON'
                || (rule.scope === 'VEHICLE_TYPE' && rule.vehicleCategoryId === mappedCategoryId)),
            );
            const ruleItems: BillingLine[] = rules.flatMap((rule) => {
              const feeHead = billingRules.config.feeHeads.find((head) => head.id === rule.feeHeadId);
              if (!feeHead) return [];
              const baseItem: BillingLine = {
                id: rule.id,
                ruleId: rule.id,
                title: feeHead.name,
                feeHeadId: feeHead.id,
                amount: rule.amount,
                entity: billingEntities.find((entity) => entity.id === rule.billingEntityId)?.entity ?? '',
                entityId: rule.billingEntityId ?? '',
              };
              return [{ ...baseItem, ...itemOverrides[rule.id] }];
            });
            const selectedLinkedItemIds = new Set(selectedItemIds);
            const autoLinkedItemIds = new Set<string>();
            if (linkedFeeRuleSettings.settings?.enabled) {
              const activeLinks = linkedFeeRuleSettings.settings.rules.filter((linkedRule) => (
                linkedRule.active && linkedRule.fiscalYearId === fiscalYearId
              ));
              for (const linkedRule of activeLinks) {
                const sourceSelected = rules.some((rule) => (
                  rule.feeHeadId === linkedRule.sourceFeeHeadId && selectedItemIds.has(rule.id)
                ));
                if (!sourceSelected) continue;
                const linkedFeeAlreadyPaid = linkedRule.oncePerFiscalYear && existingBills.some((receipt) => (
                  receipt.status === 'PAID'
                  && receipt.bill.content.vehicle.id === selectedVehicle.id
                  && receipt.bill.content.fiscalYearId === fiscalYearId
                  && receipt.bill.content.items.some((item) => item.feeHeadId === linkedRule.linkedFeeHeadId)
                ));
                if (linkedFeeAlreadyPaid) continue;
                rules
                  .filter((rule) => rule.feeHeadId === linkedRule.linkedFeeHeadId && !suppressedLinkedItemIds.has(rule.id))
                  .forEach((rule) => {
                    selectedLinkedItemIds.add(rule.id);
                    autoLinkedItemIds.add(rule.id);
                  });
              }
            }
            const items = [...ruleItems, ...manualItems.map((item) => ({
              ...item,
              ...itemOverrides[item.id],
            }))];
            const includedItems = billingDetails?.allowManualReceiptAmountOverride
              ? items.filter((item) => selectedLinkedItemIds.has(item.id))
              : items;
            const selectedRules = rules.filter((rule) =>
              !billingDetails?.allowManualReceiptAmountOverride || selectedLinkedItemIds.has(rule.id),
            );
            const hasPeriodicBillingRule = selectedRules.some((rule) => rule.frequency === 'PERIODIC');
            const ruleAmounts = Object.fromEntries(rules.map((rule) => [rule.id, rule.amount]));
            const subtotal = includedItems.reduce((sum, item) => sum + Math.max(0, item.amount), 0);
            const saveValidationMessages = getBillValidationMessages({
              vehicle: selectedVehicle,
              details: billingDetails,
              items: includedItems,
              subtotal,
              discount,
              isLoadingRules: billingRules.isLoading,
              isLoadingLinkedFeeRules: linkedFeeRuleSettings.isLoading,
              linkedFeeRulesError: linkedFeeRuleSettings.error,
              hasPeriodicBillingRule,
              billingMonths,
              ruleAmounts,
              isCheckingBlacklist: isLoadingBlacklist,
              blacklistError,
              isBlacklisted: selectedVehicleIsBlacklisted,
            });

            return (
              <div className="space-y-1 pt-0.5">
                {selectedVehicleIsBlacklisted ? (
                  <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                    यो सवारी कालोसूचीमा छ। यसका लागि बिल बनाउन मिल्दैन।
                  </div>
                ) : null}
                {blacklistError ? (
                  <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                    कालोसूची अवस्था जाँच गर्न सकिएन: {blacklistError}
                  </div>
                ) : null}
                <VehicleBilling
                  key={selectedVehicle.id}
                  vehicle={selectedVehicle}
                  fiscalYears={availableFiscalYears}
                  selectedFiscalYearId={fiscalYearId}
                  isLoadingBillingRules={billingRules.isLoading}
                  billingRulesError={billingRules.error}
                  onFiscalYearChange={setSelectedFiscalYearId}
                  onReloadBillingRules={billingRules.load}
                  onBillingDetailsChange={handleBillingDetailsChange}
                  assignedBranchId={assignedBranchId}
                />
                <div className="grid items-start gap-1 xl:grid-cols-[minmax(0,1fr)_300px]">
                  <div className="min-w-0 space-y-1">
                    <BillingItems
                      items={items}
                      feeHeads={billingRules.config.feeHeads.filter((feeHead) => feeHead.status === 'ACTIVE')}
                      entities={billingEntities}
                      isLoadingRules={billingRules.isLoading}
                      rulesError={billingRules.error}
                      hasPeriodicRule={hasPeriodicBillingRule}
                      billingMonths={billingMonths}
                      onBillingMonthsChange={setBillingMonths}
                      allowManualAmountOverride={billingDetails?.allowManualReceiptAmountOverride ?? false}
                      selectedItemIds={selectedLinkedItemIds}
                      autoLinkedItemIds={autoLinkedItemIds}
                      onChange={updateItem}
                      onSelectItemForReceipt={selectItemForReceipt}
                      onDeselectItemFromReceipt={(id) => deselectItemFromReceipt(id, autoLinkedItemIds.has(id))}
                      onAddManualItem={addManualItem}
                      onReloadRules={billingRules.load}
                    />
                    <PaymentSection
                      total={subtotal}
                      discount={discount}
                      onDiscountChange={setDiscount}
                      onSave={(paymentMethod, note) => void handleSaveBill(
                        includedItems,
                        subtotal,
                        paymentMethod,
                        note,
                        hasPeriodicBillingRule,
                        ruleAmounts,
                      )}
                      isSaving={createBill.isSaving}
                      isCheckingDuplicate={isCheckingDuplicates || isLoadingExistingBills}
                      disabledReason={saveValidationMessages.length ? saveValidationMessages.join(' ') : null}
                      error={createBill.error ?? duplicateCheckError}
                    />
                  </div>
                  <VehicleSummary vehicle={selectedVehicle} />
                </div>
                <MembershipHistory
                  vehicleId={selectedVehicle.tqmsVehicleId}
                  vehicleNumber={selectedVehicle.vehicleNumber}
                  records={existingBills}
                  isLoading={isLoadingExistingBills}
                  error={existingBillsError}
                  onReload={() => void reloadBills()}
                  onDownloadReceipt={(receipt) => void downloadReceipt(receipt)}
                  downloadingReceiptId={downloadingReceiptId}
                />
              </div>
            );
          }}
        </VehicleCategoryMappingGate>
      )}
      </section>
    </>
  );
}