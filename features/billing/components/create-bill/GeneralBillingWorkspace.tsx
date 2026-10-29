'use client';

import { useMemo, useState } from 'react';
import { FileText, Plus, Trash2 } from 'lucide-react';

import { SearchableCombobox } from '@/components/ui/SearchableCombobox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NepaliDatePicker } from '@/components/ui/nepali-date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/auth-context';
import { useBranches } from '@/features/administration/branches/hooks/useBranches';
import { useBillingEntities } from '@/features/administration/billing-entities/hooks/useBillingEntities';
import { useUsers } from '@/features/administration/users/hooks/useUsers';
import { useBillingRules } from '@/features/billing-rules/hooks/useBillingRules';
import { useCreateBill } from '@/features/billing/hooks/useCreateBill';
import type { BillCustomer, BillDetails, SavedBill } from '@/features/billing/model/bill.types';
import { PrintableBillReceipt } from '@/features/receipts/components/PrintableBillReceipt';
import { useReceipts } from '@/features/receipts/hooks/use-receipts';
import type { ReceiptRecord } from '@/features/receipts/model/receipt';
import { resolveBillBranding } from '@/shared/document-generation/utils/resolve-bill-branding';
import { formatCurrency } from '@/utils/numbers';

type ChargeDraft = {
  id: string;
  description: string;
  amount: string;
};

function dateToIso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function GeneralBillingWorkspace() {
  const { user: authUser } = useAuth();
  const { records: users } = useUsers();
  const billingRules = useBillingRules();
  const { records: branches, isLoading: isLoadingBranches, loadError: branchError } = useBranches();
  const { records: billingEntities, isLoading: isLoadingEntities, error: entityError } = useBillingEntities();
  const createBill = useCreateBill();
  const { records: receiptRecords, isLoading: isLoadingReceipts, error: receiptError } = useReceipts();

  const activeBranches = branches.filter((branch) => branch.status === 'ACTIVE');
  const activeEntities = billingEntities.filter((entity) => entity.status === 'ACTIVE');
  const activeFiscalYears = billingRules.config.fiscalYears.filter((year) => year.status === 'ACTIVE');
  const defaultFiscalYear = activeFiscalYears.find((year) => year.isDefault) ?? activeFiscalYears[0];
  const currentUser = users.find((item) => item.email.toLowerCase() === authUser?.email.toLowerCase());

  const [customer, setCustomer] = useState<BillCustomer>({
    name: '',
    phone: '',
    address: '',
    panNumber: '',
  });
  const [customerSearch, setCustomerSearch] = useState('');
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedEntityId, setSelectedEntityId] = useState('');
  const [billingDate, setBillingDate] = useState<Date>(new Date());
  const [charges, setCharges] = useState<ChargeDraft[]>([
    { id: 'general-charge-1', description: '', amount: '' },
  ]);
  const [paymentMethod, setPaymentMethod] = useState('नगद');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [savedBill, setSavedBill] = useState<SavedBill | null>(null);

  const selectedBranch = activeBranches.find((branch) => branch.id === selectedBranchId);
  const availableEntities = selectedBranch?.billingEntityIds.length
    ? activeEntities.filter((entity) => selectedBranch.billingEntityIds.includes(entity.id))
    : activeEntities;
  const resolvedEntityId = availableEntities.some((entity) => entity.id === selectedEntityId)
    ? selectedEntityId
    : availableEntities.length === 1 ? availableEntities[0].id : '';
  const subtotal = charges.reduce((sum, charge) => sum + (Number(charge.amount) || 0), 0);

  const branding = useMemo(
    () => savedBill ? resolveBillBranding(savedBill, billingEntities) : {},
    [savedBill, billingEntities],
  );

  if (savedBill) {
    return (
      <PrintableBillReceipt
        bill={savedBill}
        branding={branding}
        backLabel="अर्को सामान्य बिल"
        onBack={() => {
          setSavedBill(null);
          setCustomer({ name: '', phone: '', address: '', panNumber: '' });
          setCustomerSearch('');
          setCharges([{ id: 'general-charge-1', description: '', amount: '' }]);
          setNote('');
          setFormError(null);
        }}
      />
    );
  }

  const updateCustomer = (field: keyof BillCustomer, value: string) => {
    setCustomer((current) => ({ ...current, [field]: value }));
    setFormError(null);
  };

  const selectPreviousCustomer = (receipt: ReceiptRecord) => {
    setCustomer({
      name: receipt.customerName === '—' ? '' : receipt.customerName,
      phone: receipt.customerPhone ?? receipt.bill.content.vehicle.phone,
      address: receipt.bill.content.customer?.address ?? receipt.bill.content.vehicle.address,
      panNumber: receipt.customerPanNumber ?? '',
    });
    setCustomerSearch(receipt.customerName);
    setIsCustomerSearchOpen(false);
    setFormError(null);
  };

  const updateCharge = (id: string, changes: Partial<ChargeDraft>) => {
    setCharges((current) => current.map((charge) => charge.id === id ? { ...charge, ...changes } : charge));
    setFormError(null);
  };

  const handleCreateBill = async () => {
    const name = customer.name.trim();
    const branch = activeBranches.find((item) => item.id === selectedBranchId);
    const entity = availableEntities.find((item) => item.id === resolvedEntityId);
    const validCharges = charges.map((charge) => ({
      ...charge,
      description: charge.description.trim(),
      amount: Number(charge.amount),
    }));

    if (!name) {
      setFormError('ग्राहकको नाम आवश्यक छ।');
      return;
    }
    if (!branch?.code.trim()) {
      setFormError(branch ? 'चयन गरिएको शाखाको कोड उपलब्ध छैन।' : 'बिलिङ शाखा छान्नुहोस्।');
      return;
    }
    if (!entity) {
      setFormError(entityError ?? 'बिलिङ इकाइ छान्नुहोस्।');
      return;
    }
    if (!defaultFiscalYear) {
      setFormError(billingRules.error ?? 'सक्रिय आर्थिक वर्ष उपलब्ध छैन।');
      return;
    }
    if (validCharges.length === 0 || validCharges.some((charge) => (
      !charge.description || !Number.isFinite(charge.amount) || charge.amount < 0
    )) || charges.some((charge) => !charge.amount.trim())) {
      setFormError('हरेक शुल्क विवरण लेख्नुहोस् र मान्य रकम प्रविष्ट गर्नुहोस्।');
      return;
    }

    const billingDateValue = dateToIso(billingDate);
    const details: BillDetails = {
      branchId: branch.id,
      branchName: branch.name,
      branchCode: branch.code,
      branchAddress: branch.address,
      branchPhone: branch.phone,
      branchContactPerson: branch.contactPerson,
      allowManualReceiptAmountOverride: false,
      fiscalYearId: defaultFiscalYear.id,
      fiscalYearName: defaultFiscalYear.name,
      billingDate: billingDateValue,
      periodStart: '',
      periodEnd: '',
      billingMonths: 0,
    };
    const billCustomer = { ...customer, name };
    try {
      const bill = await createBill.create({
        billingType: 'GENERAL',
        customer: billCustomer,
        ...(authUser ? {
          createdBy: {
            id: currentUser?.id ?? authUser.id,
            name: currentUser?.name.trim() || authUser.name?.trim() || authUser.email,
            username: currentUser?.email || authUser.email,
          },
        } : {}),
        details,
        items: validCharges.map((charge) => ({
          id: charge.id,
          title: charge.description,
          amount: charge.amount,
          entity: entity.entity,
          entityId: entity.id,
          feeHeadId: '',
          isManual: true,
        })),
        subtotal,
        discount: 0,
        paymentMethod,
        note,
      });
      setSavedBill(bill);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'सामान्य बिल बनाउन सकिएन।');
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-10">
      <header className="flex items-center gap-4">
        <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
          <FileText aria-hidden="true" className="size-6" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold">सामान्य नगद बिलिङ</h1>
          <p className="text-sm text-muted-foreground">ग्राहक विवरण र शुल्क प्रविष्ट गरी बिल बनाउनुहोस्।</p>
        </div>
      </header>

      <section className="space-y-5 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <div className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-4">
          <h2 className="text-base font-semibold">ग्राहक विवरण</h2>
          <label htmlFor="general-billing-customer-search" className="block space-y-1 text-sm font-medium">
            ग्राहक खोज्नुहोस्
            <SearchableCombobox
              id="general-billing-customer-search"
              value={customerSearch}
              open={isCustomerSearchOpen}
              items={receiptRecords}
              isLoading={isLoadingReceipts}
              errorMessage={receiptError}
              filterItems
              placeholder="नाम, सम्पर्क वा PAN बाट खोज्नुहोस्..."
              emptyMessage="अघिल्लो रसिदमा ग्राहक भेटिएन। तल नयाँ ग्राहक विवरण भर्नुहोस्।"
              getKey={(receipt) => receipt.id}
              getSearchText={(receipt) => `${receipt.customerName} ${receipt.customerPhone ?? ''} ${receipt.customerPanNumber ?? ''}`}
              onValueChange={(value) => {
                setCustomerSearch(value);
                setIsCustomerSearchOpen(true);
              }}
              onOpenChange={setIsCustomerSearchOpen}
              onSelect={selectPreviousCustomer}
              renderItem={(receipt) => (
                <span className="min-w-0">
                  <span className="block truncate font-medium">{receipt.customerName}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {[receipt.customerPhone, receipt.customerPanNumber].filter(Boolean).join(' · ') || receipt.organizationName}
                  </span>
                </span>
              )}
            />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm font-medium">
              ग्राहकको नाम <span className="text-destructive">*</span>
              <Input value={customer.name} onChange={(event) => updateCustomer('name', event.target.value)} placeholder="ग्राहकको नाम लेख्नुहोस्" maxLength={150} />
            </label>
            <label className="space-y-1 text-sm font-medium">
              सम्पर्क नम्बर
              <Input value={customer.phone} onChange={(event) => updateCustomer('phone', event.target.value)} placeholder="सम्पर्क नम्बर" maxLength={30} />
            </label>
            <label className="space-y-1 text-sm font-medium">
              पान नम्बर
              <Input value={customer.panNumber} onChange={(event) => updateCustomer('panNumber', event.target.value)} placeholder="पान नम्बर (ऐच्छिक)" maxLength={30} />
            </label>
            <label className="space-y-1 text-sm font-medium">
              ठेगाना
              <Input value={customer.address} onChange={(event) => updateCustomer('address', event.target.value)} placeholder="ठेगाना (ऐच्छिक)" maxLength={250} />
            </label>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm font-medium">
            शाखा <span className="text-destructive">*</span>
            <Select value={selectedBranchId} onValueChange={(value) => { setSelectedBranchId(value); setSelectedEntityId(''); setFormError(null); }} disabled={isLoadingBranches || Boolean(branchError)}>
              <SelectTrigger><SelectValue placeholder={isLoadingBranches ? 'शाखा लोड हुँदैछ...' : 'बिलिङ शाखा छान्नुहोस्'} /></SelectTrigger>
              <SelectContent>
                {activeBranches.map((branch) => <SelectItem key={branch.id} value={branch.id}>{branch.name} ({branch.code})</SelectItem>)}
              </SelectContent>
            </Select>
            {branchError ? <span role="alert" className="block text-xs text-destructive">{branchError}</span> : null}
          </label>
          <label className="space-y-1 text-sm font-medium">
            भुक्तानी मिति <span className="text-destructive">*</span>
            <NepaliDatePicker value={billingDate} onChange={(date) => { if (date) setBillingDate(date); }} />
          </label>
        </div>

        <div className="space-y-4 rounded-lg border border-border/70 p-4">
          <label className="block max-w-xl space-y-1 text-sm font-medium">
            बिलिङ इकाइ <span className="text-destructive">*</span>
            <Select value={resolvedEntityId} onValueChange={(value) => { setSelectedEntityId(value); setFormError(null); }} disabled={isLoadingEntities || Boolean(entityError) || availableEntities.length === 0}>
              <SelectTrigger><SelectValue placeholder={isLoadingEntities ? 'बिलिङ इकाइ लोड हुँदैछ...' : 'बिलिङ इकाइ छान्नुहोस्'} /></SelectTrigger>
              <SelectContent>
                {availableEntities.map((entity) => <SelectItem key={entity.id} value={entity.id}>{entity.entity}</SelectItem>)}
              </SelectContent>
            </Select>
            {entityError ? <span role="alert" className="block text-xs text-destructive">{entityError}</span> : null}
          </label>

          <div className="space-y-3">
            <div className="grid gap-2 text-sm font-medium text-muted-foreground md:grid-cols-[minmax(0,1.3fr)_minmax(10rem,0.7fr)_auto]">
              <span>शुल्क विवरण</span><span>रकम (रु.)</span><span className="sr-only">कार्य</span>
            </div>
            {charges.map((charge) => (
              <div key={charge.id} className="grid items-start gap-2 md:grid-cols-[minmax(0,1.3fr)_minmax(10rem,0.7fr)_auto]">
                <Input aria-label="शुल्क विवरण" value={charge.description} onChange={(event) => updateCharge(charge.id, { description: event.target.value })} placeholder="शुल्क विवरण लेख्नुहोस्" maxLength={200} />
                <Input aria-label="शुल्क रकम" type="number" min="0" step="0.01" value={charge.amount} onChange={(event) => updateCharge(charge.id, { amount: event.target.value })} placeholder="रकम लेख्नुहोस्" />
                <Button type="button" variant="outline" size="icon" aria-label="शुल्क हटाउनुहोस्" disabled={charges.length === 1} onClick={() => setCharges((current) => current.filter((item) => item.id !== charge.id))}>
                  <Trash2 aria-hidden="true" className="size-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={() => setCharges((current) => [
              ...current,
              { id: crypto.randomUUID(), description: '', amount: '' },
            ])} leftIcon={<Plus className="size-4" />}>
              शुल्क थप्नुहोस्
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(12rem,0.4fr)]">
          <label className="space-y-1 text-sm font-medium">
            कैफियत
            <Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="कैफियत (ऐच्छिक)" maxLength={500} />
          </label>
          <label className="space-y-1 text-sm font-medium">
            भुक्तानी विधि
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="नगद">नगद</SelectItem>
                <SelectItem value="बैंक">बैंक</SelectItem>
                <SelectItem value="अनलाइन">अनलाइन</SelectItem>
              </SelectContent>
            </Select>
          </label>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-base font-semibold">जम्मा: रु. {formatCurrency(subtotal)}</p>
          <Button type="button" onClick={() => void handleCreateBill()} disabled={createBill.isSaving || isLoadingBranches || isLoadingEntities || billingRules.isLoading} loading={createBill.isSaving} leftIcon={<FileText className="size-4" />}>
            बिल बनाउनुहोस्
          </Button>
        </footer>
        {formError ? <p role="alert" className="text-sm text-destructive">{formError}</p> : null}
      </section>
    </div>
  );
}
