'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { useUsers } from '@/features/administration/users/hooks/useUsers';
import { useBillingEntities } from '@/features/administration/billing-entities/hooks/useBillingEntities';
import { getDefaultBillingEntityId } from '@/features/administration/billing-entities/utils/billing-entity-default';
import { useBillingRules } from '@/features/billing-rules/hooks/useBillingRules';
import { sortFeeHeadsByDisplayOrder } from '@/features/billing-rules/utils/fee-head-order';
import { buildBillResourceContent } from '@/features/billing/api/bill-resource.api';
import {
	buildFeeHeadBillingItems,
	calculateBillingRuleAmount,
} from '@/features/billing/utils/build-fee-head-billing-items';
import {
  getCoveredLinkedFeeHeadIds,
  resolveLinkedBillingRuleIds,
} from '@/features/billing/utils/resolve-linked-billing-rules';
import { getVehicleApplicableBillingRules } from '@/features/billing/utils/vehicle-applicable-billing-rules';
import { useCreateBill } from '@/features/billing/hooks/useCreateBill';
import { useTqmsVehicleDetails } from '@/features/billing/hooks/useTqmsVehicleDetails';
import { BillingHeader } from '@/features/billing/components/create-bill/BillingHeader';
import { useToast } from '@/components/ui/use-toast';
import {
  buildSmsPhoneMetadata,
  createVehicleResource,
  updateVehicleResource,
  type VehicleResourceDocument,
} from '@/features/billing/api/vehicle-resource.api';
import {
  applySelectedDhaniOwner,
  extractVehicleOwnersList,
  requiresDhaniOwnerSelection,
} from '@/features/billing/utils/resolve-tqms-vehicle-owners';
import { VehicleOwnerSelectDialog } from '@/features/billing/components/create-bill/VehicleOwnerSelectDialog';
import {
  VehicleReconciliationView,
  useVehicleReconciliation,
  prepareFirstBillCacheSyncPayload,
  recordReconciledVehicleSnapshot,
  type ReconciliationFieldDiff,
  type ReconciliationOption,
  type OwnerChangeType,
} from '@/features/reconciliation';
import { invalidateVehicleReconciliationCaches } from '@/features/reconciliation/utils/reconciliation-cache';
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
import { useVatSettings } from '@/features/settings/hooks/useVatSettings';
import { calculateConfiguredVat } from '@/lib/receipts/vat-apply-rule';
import {
  resolveReceiptPeriodEndStrategy,
  type ReceiptPeriodEndStrategy,
} from '@/lib/receipts/period';

import { getBillValidationMessages } from '@/features/billing/utils/bill-validation';

export function BillingWorkspace() {
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const { records: users } = useUsers();
  const billingRules = useBillingRules();
  const linkedFeeRuleSettings = useLinkedFeeRules();
  const vatSettings = useVatSettings();
  const { records: billingEntities } = useBillingEntities();
  const {
    records: blacklistedVehicles,
    isLoading: isLoadingBlacklist,
    error: blacklistError,
    ensureRecords: ensureBlacklist,
  } = useVehicleBlacklist();
  const [selectedVehicle, setSelectedVehicle] = useState<BillingVehicle | null>(null);
  const [missingVehicleResourceId, setMissingVehicleResourceId] = useState<string | null>(null);
  const [pendingVehicleCacheSync, setPendingVehicleCacheSync] = useState<{
    billingResource: VehicleResourceDocument;
    tqmsVehicle: BillingVehicle;
  } | null>(null);
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
  const {
    records: existingBills,
    isLoading: isLoadingExistingBills,
    error: existingBillsError,
    ensureRecords: ensureBills,
    reload: reloadBills,
  } = useReceipts();
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateBillMatch[]>([]);
  const [pendingSubmit, setPendingSubmit] = useState<MembershipBillInput | null>(null);
  const [pendingMappedCategoryId, setPendingMappedCategoryId] = useState('');
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
  const [ownerSelectDialog, setOwnerSelectDialog] = useState<{
    mode: 'initial' | 'change';
    selectedIndex: number;
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
    if (isLoadingBlacklist) {
      setDuplicateCheckError('सवारीको कालोसूची अवस्था जाँच हुँदैछ।');
      return false;
    }
    if (blacklistError) {
      setDuplicateCheckError(`कालोसूची अवस्था जाँच गर्न सकिएन: ${blacklistError}`);
      return false;
    }
    try {
      const currentBlacklist = await ensureBlacklist();
      const isBlacklisted = currentBlacklist.some((record) => (
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
  const availableFiscalYears = useMemo(
    () => billingRules.config.fiscalYears.filter((year) => year.status === 'ACTIVE'),
    [billingRules.config.fiscalYears],
  );
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

  const getSelectedOwnerIndex = useCallback((vehicle: BillingVehicle): number => {
    const owners = extractVehicleOwnersList(
      vehicle.resourceContent?.Owners ?? vehicle.resourceContent?.owners,
    );
    if (owners.length <= 1) return 0;
    const targetName = vehicle.ownerName.trim().toLocaleLowerCase();
    const matchedIndex = owners.findIndex(
      (owner) => owner.name.trim().toLocaleLowerCase() === targetName,
    );
    return matchedIndex >= 0 ? matchedIndex : 1;
  }, []);

  const triggerOwnerSafeguardIfNeeded = useCallback((vehicle: BillingVehicle) => {
    if (requiresDhaniOwnerSelection(vehicle.resourceContent?.Owners ?? vehicle.resourceContent?.owners)) {
      setOwnerSelectDialog({
        mode: 'initial',
        selectedIndex: getSelectedOwnerIndex(vehicle),
      });
      return;
    }
    setOwnerSelectDialog(null);
  }, [getSelectedOwnerIndex]);

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
    triggerOwnerSafeguardIfNeeded(vehicle);
  }, [triggerOwnerSafeguardIfNeeded]);

  const handleClearVehicleSelection = useCallback(() => {
    setSelectedVehicle(null);
    setMissingVehicleResourceId(null);
    setPendingVehicleCacheSync(null);
    setOwnerSelectDialog(null);
  }, []);

  const handleVehicleResourceStatusChange = useCallback((vehicleId: string | null) => {
    setMissingVehicleResourceId(vehicleId);
  }, []);

  const restoreVehicleResourceIfMissing = async (vehicle: BillingVehicle) => {
    if (missingVehicleResourceId !== vehicle.tqmsVehicleId) return;
    await createVehicleResource(vehicle);
    setMissingVehicleResourceId((current) => (
      current === vehicle.tqmsVehicleId ? null : current
    ));
    await invalidateVehicleReconciliationCaches(queryClient);
  };

  const syncPendingVehicleCacheIfNeeded = async (vehicle: BillingVehicle) => {
    if (!pendingVehicleCacheSync) return;
    if (pendingVehicleCacheSync.tqmsVehicle.tqmsVehicleId !== vehicle.tqmsVehicleId) return;
    const { innerContent, externalContent } = prepareFirstBillCacheSyncPayload(
      pendingVehicleCacheSync.billingResource,
      pendingVehicleCacheSync.tqmsVehicle,
    );
    await updateVehicleResource(pendingVehicleCacheSync.billingResource, innerContent, externalContent);
    recordReconciledVehicleSnapshot({
      cacheId: pendingVehicleCacheSync.billingResource.id,
      tqmsVehicleId: pendingVehicleCacheSync.tqmsVehicle.tqmsVehicleId || vehicle.tqmsVehicleId,
      innerContent,
      externalContent,
    });
    setPendingVehicleCacheSync(null);
    await invalidateVehicleReconciliationCaches(queryClient);
  };

  const handleSmsPhoneChange = useCallback((phone: string) => {
    const nextPhone = phone.trim();
    setSelectedVehicle((current) => {
      if (!current) return current;
      const existingMeta = (
        current.resourceContent?.metadata
        && typeof current.resourceContent.metadata === 'object'
        && !Array.isArray(current.resourceContent.metadata)
      )
        ? current.resourceContent.metadata as Record<string, unknown>
        : {};
      return {
        ...current,
        smsPhone: nextPhone,
        resourceContent: {
          ...current.resourceContent,
          metadata: buildSmsPhoneMetadata(existingMeta, nextPhone, current.phone),
        },
      };
    });
    setPendingVehicleCacheSync((current) => {
      if (!current) return current;
      const existingMeta = (
        current.billingResource.innerContent.metadata
        && typeof current.billingResource.innerContent.metadata === 'object'
        && !Array.isArray(current.billingResource.innerContent.metadata)
      )
        ? current.billingResource.innerContent.metadata as Record<string, unknown>
        : {};
      const nextMeta = buildSmsPhoneMetadata(existingMeta, nextPhone, current.tqmsVehicle.phone);
      return {
        ...current,
        billingResource: {
          ...current.billingResource,
          innerContent: {
            ...current.billingResource.innerContent,
            metadata: nextMeta,
          },
        },
        tqmsVehicle: {
          ...current.tqmsVehicle,
          smsPhone: nextPhone,
          resourceContent: {
            ...current.tqmsVehicle.resourceContent,
            metadata: nextMeta,
          },
        },
      };
    });
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
    monthlyPeriodicRuleIds: ReadonlySet<string>,
    ruleAmounts: Record<string, number>,
    mappedCategoryId: string,
  ) => {
    if (!mappedCategoryId.trim()) {
      setDuplicateCheckError('बिलिङ गर्नुअघि सवारी प्रकारलाई Billing Vehicle Category मा म्याप गर्नुहोस्।');
      return;
    }
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

    const billedItems = items.map((item) => (
      item.ruleId && monthlyPeriodicRuleIds.has(item.ruleId)
        ? { ...item, billingMonths }
        : item
    ));
    const vat = calculateConfiguredVat({
      items: billedItems,
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
      items: billedItems,
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
      const billRecords = await ensureBills();

      const duplicateMatches = findDuplicateBillItems(buildBillResourceContent(pendingInput), billRecords);
      if (duplicateMatches.length > 0) {
        setDuplicateMatches(duplicateMatches);
        setPendingSubmit(pendingInput);
        setPendingMappedCategoryId(mappedCategoryId);
        return;
      }

      await restoreVehicleResourceIfMissing(pendingInput.vehicle);
      await syncPendingVehicleCacheIfNeeded(pendingInput.vehicle);
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
    if (!pendingMappedCategoryId || selectedVehicle?.id !== pendingSubmit.vehicle.id) {
      setDuplicateCheckError('बिलिङ जारी राख्नुअघि चयन गरिएको सवारीको श्रेणी म्यापिङ पुष्टि गर्नुहोस्।');
      return;
    }
    setDuplicateCheckError(null);
    setIsCheckingDuplicates(true);
    try {
      if (!await verifyVehicleCanBeBilled(pendingSubmit.vehicle)) return;
      await restoreVehicleResourceIfMissing(pendingSubmit.vehicle);
      await syncPendingVehicleCacheIfNeeded(pendingSubmit.vehicle);
      const bill = await createBill.create(pendingSubmit);
      setSavedBill(bill);
      setDuplicateMatches([]);
      setPendingSubmit(null);
      setPendingMappedCategoryId('');
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
      triggerOwnerSafeguardIfNeeded(updatedVehicle);
      await invalidateVehicleReconciliationCaches(queryClient);

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
          setPendingVehicleCacheSync(null);
          setOwnerSelectDialog(null);
          setBillingDetails(null);
          setManualItems([]);
          setItemOverrides({});
          setSelectedItemIds(new Set());
          setDiscount(0);
          setDuplicateMatches([]);
          setPendingSubmit(null);
          setPendingMappedCategoryId('');
          setDuplicateCheckError(null);
        }}
      />
    );
  }

  return (
    <>
      {selectedVehicle && ownerSelectDialog ? (
        <VehicleOwnerSelectDialog
          key={`${selectedVehicle.id}-${ownerSelectDialog.mode}-${ownerSelectDialog.selectedIndex}`}
          open
          vehicle={selectedVehicle}
          owners={extractVehicleOwnersList(
            selectedVehicle.resourceContent?.Owners ?? selectedVehicle.resourceContent?.owners,
          )}
          initialSelectedIndex={ownerSelectDialog.selectedIndex}
          isInitialSafeguard={ownerSelectDialog.mode === 'initial'}
          onConfirm={(selectedIndex) => {
            setSelectedVehicle((current) => (
              current ? applySelectedDhaniOwner(current, selectedIndex) : current
            ));
            setOwnerSelectDialog(null);
          }}
          onCancel={() => {
            const wasInitial = ownerSelectDialog.mode === 'initial';
            setOwnerSelectDialog(null);
            if (wasInitial) handleClearVehicleSelection();
          }}
        />
      ) : null}
      <DuplicateBillWarningDialog
        open={duplicateMatches.length > 0}
        matches={duplicateMatches}
        isSubmitting={isCheckingDuplicates}
        onCancel={() => {
          setDuplicateMatches([]);
          setPendingSubmit(null);
          setPendingMappedCategoryId('');
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
          onVehicleResourceStatusChange={handleVehicleResourceStatusChange}
          onOpenOwnerSelect={selectedVehicle && requiresDhaniOwnerSelection(
            selectedVehicle.resourceContent?.Owners ?? selectedVehicle.resourceContent?.owners,
          ) ? () => {
            setOwnerSelectDialog({
              mode: 'change',
              selectedIndex: getSelectedOwnerIndex(selectedVehicle),
            });
          } : undefined}
          loadReceipts={ensureBills}
          onPendingVehicleCacheSync={setPendingVehicleCacheSync}
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
                billingMonths,
              );
              const coveredFeeHeadIds = getCoveredLinkedFeeHeadIds(
                existingBills,
                selectedVehicle.tqmsVehicleId,
                fiscalYearId,
              );
              const { selectedRuleIds: selectedLinkedItemIds, autoLinkedRuleIds: autoLinkedItemIds } =
                resolveLinkedBillingRuleIds({
                  settings: linkedFeeRuleSettings.settings,
                  fiscalYearId,
                  rules,
                  selectedRuleIds: selectedItemIds,
                  coveredFeeHeadIds,
                  suppressedRuleIds: suppressedLinkedItemIds,
                });
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
              const periodicRules = selectedRules.filter((rule) => rule.frequency === 'PERIODIC');
              const monthlyPeriodicRules = periodicRules.filter((rule) => rule.period === 'MONTH');
              const hasPeriodicBillingRule = monthlyPeriodicRules.length > 0;
              const periodicRuleId = monthlyPeriodicRules[0]?.id ?? null;
              const monthlyPeriodicRuleIds = new Set(monthlyPeriodicRules.map((rule) => rule.id));
              const periodEndStrategy: ReceiptPeriodEndStrategy | null = periodicRules.length > 0
                ? resolveReceiptPeriodEndStrategy(periodicRules.map((rule) => (
                  rule.validity === 'END_OF_MONTH'
                    ? 'END_OF_MONTH'
                    : rule.validity === 'END_OF_FISCAL_YEAR'
                      ? 'FISCAL_YEAR_END'
                      : 'MATCH_START_DAY'
                )))
                : null;
              const ruleAmounts = Object.fromEntries(rules.map((rule) => [
                rule.id,
                calculateBillingRuleAmount(rule, billingMonths),
              ]));
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
                    billingMonths={billingMonths}
                    periodEndStrategy={periodEndStrategy}
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
                        periodicRuleId={periodicRuleId}
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
                          monthlyPeriodicRuleIds,
                          ruleAmounts,
                          mappedCategoryId,
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
