'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useUsers } from '@/features/administration/users/hooks/useUsers';
import { useBillingEntities } from '@/features/administration/billing-entities/hooks/useBillingEntities';
import { getDefaultBillingEntityId } from '@/features/administration/billing-entities/utils/billing-entity-default';
import { useBillingRules } from '@/features/billing-rules/hooks/useBillingRules';
import { sortFeeHeadsByDisplayOrder } from '@/features/billing-rules/utils/fee-head-order';
import { buildBillResourceContent } from '@/features/billing/api/bill-resource.api';
import { buildFeeHeadBillingItems } from '@/features/billing/utils/build-fee-head-billing-items';
import { getVehicleApplicableBillingRules } from '@/features/billing/utils/vehicle-applicable-billing-rules';
import { useCreateBill } from '@/features/billing/hooks/useCreateBill';
import { useTqmsVehicleDetails } from '@/features/billing/hooks/useTqmsVehicleDetails';
import { BillingHeader } from '@/features/billing/components/create-bill/BillingHeader';
import { useToast } from '@/components/ui/use-toast';
import type { VehicleResourceDocument } from '@/features/billing/api/vehicle-resource.api';
import {
  VehicleReconciliationView,
  useVehicleReconciliation,
  type ReconciliationFieldDiff,
  type ReconciliationOption,
  type OwnerChangeType,
} from '@/features/reconciliation';
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
import type { ReceiptRecord } from '@/features/receipts/model/receipt';
import { useDownloadReceipt } from '@/features/receipts/hooks/use-download-receipt';
import { useLinkedFeeRules } from '@/features/settings/hooks/useLinkedFeeRules';
import { useVehicleBlacklist } from '@/features/vehicle/blacklist/hooks/useVehicleBlacklist';
import { PrintableBillReceipt } from '@/features/receipts/components/PrintableBillReceipt';
import { resolveBillBranding } from '@/shared/document-generation/utils/resolve-bill-branding';
import { useFiscalYearSelectorSettings } from '@/features/settings/hooks/useFiscalYearSelectorSettings';
import { useVatSettings } from '@/features/settings/hooks/useVatSettings';
import { calculateConfiguredVat } from '@/lib/receipts/vat-apply-rule';
import { DEFAULT_FISCAL_YEAR_SELECTOR_SETTINGS } from '@/features/settings/api/fiscal-year-selector.api';
import {
  formatNepaliFiscalYearLabel,
  generateNepaliFiscalYearOptions,
  parseFiscalYear,
} from '@/utils/nepali-calender-dates/nepali-fiscal-year';

import { getBillValidationMessages } from '@/features/billing/utils/bill-validation';

export function BillingWorkspace() {
  const { user: authUser } = useAuth();
  const { records: users } = useUsers();
  const billingRules = useBillingRules();
  const linkedFeeRuleSettings = useLinkedFeeRules();
  const { settings: fiscalYearSelectorSettings } = useFiscalYearSelectorSettings();
  const vatSettings = useVatSettings();
  const { records: billingEntities } = useBillingEntities();
  const {
    records: blacklistedVehicles,
    isLoading: isLoadingBlacklist,
    error: blacklistError,
    reload: reloadBlacklist,
  } = useVehicleBlacklist();
  const [selectedVehicle, setSelectedVehicle] = useState<BillingVehicle | null>(null);
  const { details: tqmsVehicleDetails, reload: reloadTqmsVehicleDetails } = useTqmsVehicleDetails(
    selectedVehicle?.vehicleNumber ?? '',
  );
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
  const { toast } = useToast();
  const [reconciliationData, setReconciliationData] = useState<{
    billingVehicle: BillingVehicle;
    tqmsVehicle: BillingVehicle;
    billingResource: VehicleResourceDocument;
    diffs: ReconciliationFieldDiff[];
    receipts: ReceiptRecord[];
  } | null>(null);
  const { applyDecision, isApplying: isSubmittingReconciliation } = useVehicleReconciliation();
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
    () => (savedBill ? resolveBillBranding(savedBill, billingEntities) : {}),
    [savedBill, billingEntities],
  );
  const selectorSettings = fiscalYearSelectorSettings ?? DEFAULT_FISCAL_YEAR_SELECTOR_SETTINGS;
  const availableFiscalYears = useMemo(() => {
    const normalFiscalYearOptions = new Set(generateNepaliFiscalYearOptions({
      yearsBack: selectorSettings.yearsBack,
      yearsForward: selectorSettings.yearsForward,
    }));
    const archivedFiscalYearOptions = new Set(selectorSettings.archivedYears.flatMap((year) => {
      const parsedYear = parseFiscalYear(year);
      return parsedYear === null ? [] : [formatNepaliFiscalYearLabel(parsedYear)];
    }));
    return billingRules.config.fiscalYears.filter((year) => {
      if (year.status !== 'ACTIVE') return false;
      const parsedYear = parseFiscalYear(year.code ?? '') ?? parseFiscalYear(year.name);
      if (parsedYear === null) return false;
      const label = formatNepaliFiscalYearLabel(parsedYear);
      return year.isDefault || (normalFiscalYearOptions.has(label) && !archivedFiscalYearOptions.has(label));
    });
  }, [billingRules.config.fiscalYears, selectorSettings]);
  const defaultFiscalYear = availableFiscalYears.find((year) => year.isDefault) ?? availableFiscalYears[0];
  const fiscalYearId = availableFiscalYears.some((year) => year.id === selectedFiscalYearId)
    ? selectedFiscalYearId
    : defaultFiscalYear?.id ?? '';
  const currentUserRecord = useMemo(
    () => users.find((user) => user.email.toLocaleLowerCase() === authUser?.email.toLocaleLowerCase()),
    [users, authUser?.email],
  );
  const assignedBranchId = currentUserRecord?.branchId;
  const billCreator = useMemo(() => (authUser ? {
    id: currentUserRecord?.id ?? authUser.id,
    name: currentUserRecord?.name.trim() || authUser.name?.trim() || authUser.email,
    username: currentUserRecord?.email || authUser.email,
  } : undefined), [authUser, currentUserRecord]);

  const updateItem = useCallback((id: string, changes: Partial<BillingLine>) => {
    if ('amount' in changes && !billingDetailsRef.current?.allowManualReceiptAmountOverride) return;
    if (id.startsWith('manual-')) {
      setManualItems((current) => current.map((item) => (item.id === id ? { ...item, ...changes } : item)));
      return;
    }
    setItemOverrides((current) => ({ ...current, [id]: { ...current[id], ...changes } }));
  }, []);

  const selectItemForReceipt = useCallback((id: string) => {
    setSelectedItemIds((current) => new Set(current).add(id));
    setSuppressedLinkedItemIds((current) => {
      if (!current.has(id)) return current;
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }, []);

  const deselectItemFromReceipt = useCallback((id: string, isLinkedAutoSelected = false) => {
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
  }, [billingRules.config.rules, fiscalYearId, linkedFeeRuleSettings.settings?.rules]);

  const addManualItem = useCallback(() => {
    setManualItems((current) => [
      ...current,
      {
        id: `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        title: '',
        amount: 0,
        entity: billingEntities.find((entity) => entity.id === getDefaultBillingEntityId(billingEntities))?.entity ?? '',
        entityId: getDefaultBillingEntityId(billingEntities),
        isManual: true,
      },
    ]);
  }, [billingEntities]);

  const handleSelectVehicle = useCallback((vehicle: BillingVehicle) => {
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
  }, []);

  const handleClearVehicleSelection = useCallback(() => {
    setSelectedVehicle(null);
  }, []);

  const handleSmsPhoneChange = useCallback((phone: string) => {
    setSelectedVehicle((current) => (current ? { ...current, smsPhone: phone } : current));
  }, []);

  const handleReloadBills = useCallback(() => {
    void reloadBills();
  }, [reloadBills]);

  const handleDownloadReceipt = useCallback((receipt: ReceiptRecord) => {
    void downloadReceipt(receipt);
  }, [downloadReceipt]);

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
      activeBillingEntityIds: new Set(billingEntities.filter((entity) => entity.status === 'ACTIVE').map((entity) => entity.id)),
      subtotal,
      discount,
      isLoadingRules: billingRules.isLoading,
      isLoadingLinkedFeeRules: linkedFeeRuleSettings.isLoading,
      linkedFeeRulesError: linkedFeeRuleSettings.error,
      isLoadingVatSettings: vatSettings.isLoading,
      vatSettingsError: vatSettings.error,
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
    if (!canCreateBill) {
      setIsCheckingDuplicates(false);
      return;
    }

    let vehicleDetails = tqmsVehicleDetails;
    if (!vehicleDetails) {
      const result = await reloadTqmsVehicleDetails();
      if (result.error) {
        setIsCheckingDuplicates(false);
        setDuplicateCheckError(`सवारीको रुट विवरण लोड गर्न सकिएन: ${result.error.message}`);
        return;
      }
      vehicleDetails = result.data ?? null;
    }
    setIsCheckingDuplicates(false);

    const vat = calculateConfiguredVat({
      items,
      subtotal,
      discount,
      enabled: vatSettings.settings?.enabled ?? false,
      rate: vatSettings.settings?.rate ?? 0,
      billingEntityIds: vatSettings.settings?.billingEntityIds ?? [],
    });
    const pendingInput: MembershipBillInput = {
      vehicle: {
        ...selectedVehicle,
        route: vehicleDetails?.Compliance?.RoutePermit?.Route?.trim() ?? '',
      },
      ...(billCreator ? { createdBy: billCreator } : {}),
      details: {
        ...billingDetails,
        billingMonths: hasPeriodicBillingRule ? billingMonths : 0,
      },
      items,
      subtotal,
      discount,
      vatAmount: vat.vatAmount,
      vatRatePct: vat.vatRatePct,
      vatBillingEntityIds: vat.billingEntityIds,
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



  const handleReconciliationConfirm = async (
    option: ReconciliationOption | null,
    ownerChangeType: OwnerChangeType | null,
    reason: string,
  ) => {
    if (!reconciliationData) return;
    const performedBy = authUser?.name?.trim() || authUser?.email || 'admin';

    try {
      const updatedVehicle = await applyDecision({
        option,
        ownerChangeType,
        reason,
        performedBy,
        billingVehicle: reconciliationData.billingVehicle,
        tqmsVehicle: reconciliationData.tqmsVehicle,
        billingResource: reconciliationData.billingResource,
        diffs: reconciliationData.diffs,
      });

      setSelectedVehicle(updatedVehicle);
      setReconciliationData(null);

      toast({
        title: 'सवारी विवरण मेलमिलाप सम्पन्न',
        description: `${updatedVehicle.vehicleNumber} को बिलिङ अगाडि बढाइयो।`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'निर्णय सुरक्षित गर्न सकिएन।';
      toast({
        title: 'सवारी विवरण अपडेट असफल',
        description: msg,
        variant: 'destructive',
      });
    }
  };

  if (reconciliationData) {
    return (
      <VehicleReconciliationView
        billingVehicle={reconciliationData.billingVehicle}
        tqmsVehicle={reconciliationData.tqmsVehicle}
        billingResource={reconciliationData.billingResource}
        diffs={reconciliationData.diffs}
        receipts={reconciliationData.receipts}
        isLoadingReceipts={false}
        receiptsError={null}
        isSubmitting={isSubmittingReconciliation}
        onCancel={() => setReconciliationData(null)}
        onConfirm={handleReconciliationConfirm}
      />
    );
  }

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
          onClearSelection={handleClearVehicleSelection}
          onSmsPhoneChange={handleSmsPhoneChange}
          loadReceipts={async () => {
            const result = await reloadBills();
            if (result.error) throw result.error;
            return result.data ?? [];
          }}
          onReconciliationRequired={setReconciliationData}
        />

        {selectedVehicle && (
          <VehicleCategoryMappingGate key={selectedVehicle.id} vehicle={selectedVehicle}>
            {(mappedCategoryId) => {
              const feeHeads = sortFeeHeadsByDisplayOrder(billingRules.config.feeHeads.filter((feeHead) => (
                feeHead.status === 'ACTIVE'
                && (feeHead.fiscalYearId === null || feeHead.fiscalYearId === fiscalYearId)
              )));
              const rules = getVehicleApplicableBillingRules(
                billingRules.config.rules,
                mappedCategoryId,
              ).filter((rule) => (
                rule.status === 'ACTIVE'
                && billingRules.config.feeHeads.some((feeHead) => feeHead.id === rule.feeHeadId && feeHead.status === 'ACTIVE')
                && rule.fiscalYearId === fiscalYearId
                && (rule.scope !== 'COMMON'
                  || rule.amount !== 0
                  || billingDetails?.allowManualReceiptAmountOverride === true)
              ));
              const ruleFeeHeads = feeHeads.filter((feeHead) => (
                rules.some((rule) => rule.feeHeadId === feeHead.id)
              ));
              const ruleItems = buildFeeHeadBillingItems(
                ruleFeeHeads,
                rules,
                billingEntities,
                itemOverrides,
              );
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
              const selectedRules = rules.filter((rule) => (
                !billingDetails?.allowManualReceiptAmountOverride || selectedLinkedItemIds.has(rule.id)
              ));
              const hasPeriodicBillingRule = selectedRules.some((rule) => rule.frequency === 'PERIODIC');
              const ruleAmounts = Object.fromEntries(rules.map((rule) => [rule.id, rule.amount]));
              const subtotal = includedItems.reduce((sum, item) => sum + Math.max(0, item.amount), 0);
              const vat = calculateConfiguredVat({
                items: includedItems,
                subtotal,
                discount,
                enabled: vatSettings.settings?.enabled ?? false,
                rate: vatSettings.settings?.rate ?? 0,
                billingEntityIds: vatSettings.settings?.billingEntityIds ?? [],
              });
              const saveValidationMessages = getBillValidationMessages({
                vehicle: selectedVehicle,
                details: billingDetails,
                items: includedItems,
                activeBillingEntityIds: new Set(billingEntities.filter((entity) => entity.status === 'ACTIVE').map((entity) => entity.id)),
                subtotal,
                discount,
                isLoadingRules: billingRules.isLoading,
                isLoadingLinkedFeeRules: linkedFeeRuleSettings.isLoading,
                linkedFeeRulesError: linkedFeeRuleSettings.error,
                isLoadingVatSettings: vatSettings.isLoading,
                vatSettingsError: vatSettings.error,
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
                        feeHeads={feeHeads}
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
                        vatAmount={vat.vatAmount}
                        vatRatePct={vat.vatRatePct}
                        vatEnabled={vatSettings.settings?.enabled === true}
                        vatApplicable={vat.vatApplicable}
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
                    onReload={handleReloadBills}
                    onDownloadReceipt={handleDownloadReceipt}
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
