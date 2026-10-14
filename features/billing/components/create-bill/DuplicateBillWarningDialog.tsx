'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { DuplicateBillMatch } from '@/features/billing/utils/duplicate-bill-check';
import { formatCurrency } from '@/utils/numbers';

export type DuplicateBillWarningDialogProps = {
  open: boolean;
  matches: DuplicateBillMatch[];
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DuplicateBillWarningDialog({
  open,
  matches,
  isSubmitting,
  onCancel,
  onConfirm,
}: DuplicateBillWarningDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!nextOpen) onCancel();
    }}>
      <DialogContent className="max-w-5xl rounded-xl border border-border bg-[#f5f3ee] p-0 shadow-2xl" showCloseButton={false}>
        <div className="p-5 pb-4">
          <DialogHeader className="mb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <DialogTitle className="text-3xl font-bold tracking-tight text-foreground">
                  यही शुल्क यही अवधिमा पहिले नै रेकर्ड छ
                </DialogTitle>
                <DialogDescription className="text-base text-foreground/80">
                  तल देखिएका शुल्क यही अवधिमा पहिले नै रेकर्ड भएका छन्। कृपया जाँच गर्नुहोस्।
                </DialogDescription>
              </div>
              <button
                type="button"
                onClick={onCancel}
                aria-label="Close duplicate warning"
                className="rounded-md border border-border bg-background px-2 py-1 text-lg text-foreground/70 transition hover:text-foreground"
              >
                ×
              </button>
            </div>
          </DialogHeader>

          <div className="mb-4 rounded-md border border-[#e7d9bd] bg-[#f2e6c7] px-4 py-3 text-base text-[#4e3d2c]">
            Continue गरेपछि पुरानो invoice परिवर्तन हुँदैन। नयाँ invoice छुट्टै रेकर्डको रूपमा फेरि बन्नेछ।
          </div>

          <div className="rounded-md border border-border bg-background/80 p-3">
            <div className="mb-2 text-sm font-semibold text-foreground/80">
              मिल्ने दावीहरू ({matches.length})
            </div>
            <div className="max-h-[360px] space-y-3 overflow-auto pr-1">
              {matches.map((match, index) => (
                <div key={`${match.existingBillId}-${match.feeHeadId}-${match.ruleId ?? 'no-rule'}-${index}`} className="rounded-md border border-border bg-card p-3">
                  <div className="mb-3 flex items-center justify-between gap-4 border-b border-border pb-2 text-sm font-semibold text-foreground">
                    <span>{match.feeTitle || 'शुल्क शीर्षक'} ({match.feeHeadId || '—'})</span>
                    <span className="text-muted-foreground">{match.status || 'PAID'}</span>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <p className="text-xs text-muted-foreground">रसिद नं.</p>
                      <p className="font-medium text-foreground">{match.receiptNumber || match.existingBillId || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">सवारी नम्बर</p>
                      <p className="font-medium text-foreground">{match.vehicleNumber || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">शाखा</p>
                      <p className="font-medium text-foreground">{match.branchName || '—'}</p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">भुक्तानी मिति</p>
                      <p className="font-medium text-foreground">{match.paymentDate || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">अवधि</p>
                      <p className="font-medium text-foreground">{match.periodStart || '—'} — {match.periodEnd || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">रकम</p>
                      <p className="font-medium text-foreground">{formatCurrency(match.existingAmount)}</p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">Billing Entity</p>
                      <p className="font-medium text-foreground">{match.billingEntity || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Rule ID</p>
                      <p className="font-medium text-foreground">{match.ruleId || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Amount</p>
                      <p className="font-medium text-foreground">{formatCurrency(match.existingAmount)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border bg-background/60 px-5 py-4">
          <Button type="button" variant="outline" onClick={onCancel} className="min-w-[140px]">
            रद्द गर्नुहोस्
          </Button>
          <Button type="button" variant="destructive" loading={isSubmitting} onClick={onConfirm} className="min-w-[180px]">
            फेरि पनि सेभ गर्ने
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
