'use client';

import { useCallback, useRef, useState } from 'react';
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
import type { BillDetails, CreateBillInput, SavedBill } from '@/features/billing/model/bill.types';
import { findDuplicateBillItems, type DuplicateBillMatch } from '@/features/billing/utils/duplicate-bill-check';
import { useReceipts } from '@/features/receipts/hooks/use-receipts';
import { PrintableBillReceipt } from '@/features/receipts/components/PrintableBillReceipt';
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
  hasPeriodicBillingRule: boolean;
  billingMonths: number;
  ruleAmounts: Record<string, number>;
}): string[] {
  const {
    vehicle,
    details,
    items,
    subtotal,
    discount,
    isLoadingRules,
    hasPeriodicBillingRule,
    billingMonths,
    ruleAmounts,
  } = input;
  const messages: string[] = [];
  if (!vehicle) messages.push('पहिले सवारी छान्नुहोस्।');
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
  if (hasPeriodicBillingRule && (!Number.isInteger(billingMonths) || billingMonths < 1 || billingMonths > 12)) {
    messages.push('आवधिक बिलिङका लागि १ देखि १२ सम्मको बिलिङ महिना छान्नुहोस्।');
  }
  if (items.length === 0) messages.push('बिलमा कम्तीमा एउटा शुल्क थप्नुहोस्।');
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
  const billingRules = useBillingRules();
  const { settings: fiscalYearSelectorSettings } = useFiscalYearSelectorSettings();
  const { records: billingEntities } = useBillingEntities();
  const [selectedVehicle, setSelectedVehicle] = useState<BillingVehicle | null>(null);
  const [manualItems, setManualItems] = useState<BillingLine[]>([]);
  const [itemOverrides, setItemOverrides] = useState<Record<string, Partial<BillingLine>>>({});
  const [selectedFiscalYearId, setSelectedFiscalYearId] = useState('');
  const [billingMonths, setBillingMonths] = useState(1);
  const [discount, setDiscount] = useState(0);
  const [billingDetails, setBillingDetails] = useState<BillDetails | null>(null);
  const billingDetailsRef = useRef<BillDetails | null>(null);
  const [savedBill, setSavedBill] = useState<SavedBill | null>(null);
  const { records: existingBills, error: existingBillsError, isLoading: isLoadingExistingBills, reload: reloadBills } = useReceipts();
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateBillMatch[]>([]);
  const [pendingSubmit, setPendingSubmit] = useState<CreateBillInput | null>(null);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [duplicateCheckError, setDuplicateCheckError] = useState<string | null>(null);
  const createBill = useCreateBill();
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

  const updateItem = (id: string, changes: Partial<BillingLine>) => {
    if ('amount' in changes && !billingDetailsRef.current?.allowManualReceiptAmountOverride) return;
    if (id.startsWith('manual-')) {
      setManualItems((current) => current.map((item) => item.id === id ? { ...item, ...changes } : item));
      return;
    }
    setItemOverrides((current) => ({ ...current, [id]: { ...current[id], ...changes } }));
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
    setDiscount(0);
  };

  const handleBillingDetailsChange = useCallback((details: BillDetails) => {
    const previousDetails = billingDetailsRef.current;
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
      hasPeriodicBillingRule,
      billingMonths,
      ruleAmounts,
    });
    if (validationMessages.length > 0) return;
    if (!selectedVehicle || !billingDetails) return;

    const pendingInput: CreateBillInput = {
      vehicle: selectedVehicle,
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
        onCreateAnother={() => {
          setSavedBill(null);
          setSelectedVehicle(null);
          setBillingDetails(null);
          setManualItems([]);
          setItemOverrides({});
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
      <section className="mx-auto max-w-7xl space-y-3 pb-6">
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
              && rule.fiscalYearId === fiscalYearId
              && (rule.scope !== 'COMMON'
                || rule.amount !== 0
                || billingDetails?.allowManualReceiptAmountOverride === true)
              && (rule.scope === 'COMMON'
                || (rule.scope === 'VEHICLE_TYPE' && rule.vehicleCategoryId === mappedCategoryId)),
            );
            const hasPeriodicBillingRule = rules.some((rule) => rule.frequency === 'PERIODIC');
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
            const items = [...ruleItems, ...manualItems.map((item) => ({
              ...item,
              ...itemOverrides[item.id],
            }))];
            const ruleAmounts = Object.fromEntries(rules.map((rule) => [rule.id, rule.amount]));
            const subtotal = items.reduce((sum, item) => sum + Math.max(0, item.amount), 0);
            const saveValidationMessages = getBillValidationMessages({
              vehicle: selectedVehicle,
              details: billingDetails,
              items,
              subtotal,
              discount,
              isLoadingRules: billingRules.isLoading,
              hasPeriodicBillingRule,
              billingMonths,
              ruleAmounts,
            });

            return (
              <div className="space-y-3 pt-1">
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
                />
                <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_250px]">
                  <div className="min-w-0 space-y-3">
                    <BillingItems
                      items={items}
                      feeHeads={billingRules.config.feeHeads}
                      entities={billingEntities}
                      isLoadingRules={billingRules.isLoading}
                      rulesError={billingRules.error}
                      hasPeriodicRule={hasPeriodicBillingRule}
                      billingMonths={billingMonths}
                      onBillingMonthsChange={setBillingMonths}
                      allowManualAmountOverride={billingDetails?.allowManualReceiptAmountOverride ?? false}
                      onChange={updateItem}
                      onAddManualItem={addManualItem}
                      onReloadRules={billingRules.load}
                    />
                    <PaymentSection
                      total={subtotal}
                      discount={discount}
                      onDiscountChange={setDiscount}
                      onSave={(paymentMethod, note) => void handleSaveBill(
                        items,
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
                <MembershipHistory />
              </div>
            );
          }}
        </VehicleCategoryMappingGate>
      )}
      </section>
    </>
  );
}