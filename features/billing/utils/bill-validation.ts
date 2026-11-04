import type { BillingLine, BillingVehicle } from '../model/types';
import type { BillDetails } from '../model/bill.types';

export function getBillValidationMessages(input: {
  vehicle: BillingVehicle | null;
  details: BillDetails | null;
  items: BillingLine[];
  activeBillingEntityIds: ReadonlySet<string>;
  subtotal: number;
  discount: number;
  isLoadingRules: boolean;
  isLoadingLinkedFeeRules: boolean;
  linkedFeeRulesError: string | null;
  isLoadingVatSettings?: boolean;
  vatSettingsError?: string | null;
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
    activeBillingEntityIds,
    subtotal,
    discount,
    isLoadingRules,
    isLoadingLinkedFeeRules,
    linkedFeeRulesError,
    isLoadingVatSettings = false,
    vatSettingsError = null,
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
  if (isLoadingVatSettings) messages.push('VAT सेटिङ लोड हुँदैछ।');
  if (vatSettingsError) messages.push(`VAT सेटिङ लोड गर्न सकिएन: ${vatSettingsError}`);
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
  if (items.some((item) => item.entityId && !activeBillingEntityIds.has(item.entityId))) {
    messages.push('निष्क्रिय Billing Entity भएको शुल्कमा बिल बनाउन मिल्दैन। सक्रिय Billing Entity चयन गर्नुहोस्।');
  }
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
