'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { AlertCircle, Flag, Shield, ShieldAlert, ShieldOff, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import type { MemberListRecord } from '@/features/members/model/member';
import { MemberStatusBadge } from '@/features/members/components/MemberStatusBadge';
import { formatDocumentNepaliDate } from '@/shared/document-generation/utils/format-date';
import { toNepaliDigits } from '@/utils/numbers';
import { useTqmsVehicleDetails } from '@/features/billing/hooks/useTqmsVehicleDetails';
import { formatFiscalYearForDisplay } from '@/utils/nepali-calender-dates/nepali-fiscal-year';

type MembersDialogsProps = {
  detail: MemberListRecord | null;
  tagTarget: MemberListRecord | null;
  blacklistTarget: MemberListRecord | null;
  removeTarget: MemberListRecord | null;
  isSaving: boolean;
  onCloseDetail: () => void;
  onCloseTag: () => void;
  onCloseBlacklist: () => void;
  onCloseRemove: () => void;
  onConfirmTag: (record: MemberListRecord, reason: string) => Promise<void>;
  onConfirmBlacklist: (record: MemberListRecord, reason: string) => Promise<void>;
  onConfirmRemove: (record: MemberListRecord) => Promise<void>;
  onOpenBlacklist: () => void;
};

export function MembersDialogs({
  detail,
  tagTarget,
  blacklistTarget,
  removeTarget,
  isSaving,
  onCloseDetail,
  onCloseTag,
  onCloseBlacklist,
  onCloseRemove,
  onConfirmTag,
  onConfirmBlacklist,
  onConfirmRemove,
  onOpenBlacklist,
}: MembersDialogsProps) {
  const [reason, setReason] = useState('');
  const [blacklistReason, setBlacklistReason] = useState('');
  const {
    details: vehicleDetails,
    isLoading: vehicleDetailsLoading,
    error: vehicleDetailsError,
    reload: reloadVehicleDetails,
  } = useTqmsVehicleDetails(detail?.vehicleNumber ?? '');
  const compliance = vehicleDetails?.Compliance;
  const insurance = compliance?.Insurance;
  const routePermit = compliance?.RoutePermit;
  const checkPass = compliance?.CheckPass;
  const bluebook = compliance?.Bluebook ?? compliance?.BlueBook ?? vehicleDetails?.Bluebook ?? vehicleDetails?.BlueBook;

  return (
    <>
      <Dialog open={detail !== null} onOpenChange={(open) => { if (!open) onCloseDetail(); }}>
        <DialogContent className="max-h-[88vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>सदस्य / सवारी विवरण</DialogTitle>
            <DialogDescription>{detail?.memberNumber}</DialogDescription>
          </DialogHeader>
          {detail ? (
            <div className="space-y-4">
              <DetailSection title="सवारी विवरण">
                <div className="col-span-full flex items-center justify-between gap-3 rounded-lg border p-2.5">
                  <div className="flex items-center gap-2 text-sm">
                    {detail.isBlacklisted
                      ? <Shield className="size-4 text-destructive" aria-hidden="true" />
                      : <ShieldOff className="size-4 text-muted-foreground" aria-hidden="true" />}
                    <span>{detail.isBlacklisted ? 'कालोसूचीमा रहेको' : 'कालोसूचीमा नरहेको'}</span>
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={onOpenBlacklist}>
                    कालोसूची व्यवस्थापन
                  </Button>
                </div>
                <DetailItem label="सवारी नं." value={detail.vehicleNumber} />
                <DetailItem label="बिलिङ सवारी ID" value={detail.vehicleId} />
                <DetailItem label="TQMS सवारी प्रकार" value={detail.tqmsVehicleType} />
                <DetailItem label="बिलिङ सवारी प्रकार" value={detail.vehicleType} />
                {detail.ownerCount > 1 ? (
                  <>
                    <DetailItem label="सञ्चालक:" value={detail.sanchalakName} />
                    <DetailItem label="धनीको नाम:" value={detail.sawariDhaniName} />
                  </>
                ) : (
                  <DetailItem label="नाम" value={detail.sawariDhaniName || detail.ownerName} />
                )}
                <DetailItem label="फोन नम्बर" value={detail.phone} />
                <DetailItem label="ठेगाना" value={detail.address} />
                <DetailItem label="शाखा" value={detail.branchName} />
                <DetailItem
                  label="सदस्यता अवस्था"
                  value={(
                    <MemberStatusBadge
                      status={detail.status}
                      billingStatus={detail.billingStatus}
                      isDisplaced={detail.isDisplaced}
                      isBlacklisted={detail.isBlacklisted}
                    />
                  )}
                />
              </DetailSection>

              <DetailSection title="कागजात विवरण">
                {vehicleDetailsLoading ? (
                  <p className="col-span-full text-xs text-muted-foreground">कागजात विवरण लोड हुँदैछ...</p>
                ) : null}
                {vehicleDetailsError ? (
                  <div role="alert" className="col-span-full flex items-center justify-between gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
                    <span className="flex items-center gap-1"><AlertCircle className="size-3.5" />{vehicleDetailsError}</span>
                    <Button type="button" variant="outline" size="sm" onClick={() => void reloadVehicleDetails()}>फेरि प्रयास</Button>
                  </div>
                ) : null}
                <DetailItem label="बीमा कम्पनी" value={insurance?.Company} />
                <DetailItem label="बीमा मिति" value={dateRange(insurance?.StartBs, insurance?.StartAd, insurance?.ExpiryBs, insurance?.ExpiryAd)} />
                <DetailItem label="बीमा प्रकार" value={insurance?.PolicyType} />
                <DetailItem label="ब्लुबुक" value={dateRange(bluebook?.StartBs, bluebook?.StartAd, bluebook?.ExpiryBs, bluebook?.ExpiryAd)} />
                <DetailItem label="रुट" value={routePermit?.Route} />
                <DetailItem label="रुट परमिट मिति" value={dateRange(routePermit?.StartBs, routePermit?.StartAd, routePermit?.ExpiryBs, routePermit?.ExpiryAd)} />
                <DetailItem label="चेक पास" value={dateRange(checkPass?.StartBs, checkPass?.StartAd, checkPass?.ExpiryBs, checkPass?.ExpiryAd)} />
              </DetailSection>

              <DetailSection title="अन्तिम रसिद विवरण">
                <DetailItem label="बिल नं." value={detail.billNumber} />
                <DetailItem label="अन्तिम मिति" value={toNepaliDigits(formatDocumentNepaliDate(detail.billingDate).replaceAll('/', '-'))} />
                <DetailItem label="देखि" value={toNepaliDigits(formatDocumentNepaliDate(detail.periodStart).replaceAll('/', '-'))} />
                <DetailItem label="सम्म" value={expiryLabel(detail.expiryDate)} />
                <DetailItem label="जारी गर्ने" value={detail.billIssuer} />
                <DetailItem label="आर्थिक वर्ष" value={formatFiscalYearForDisplay(detail.fiscalYearName)} />
              </DetailSection>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={tagTarget !== null} onOpenChange={(open) => { if (!open && !isSaving) onCloseTag(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>विस्थापित ट्याग लगाउनुहोस्</DialogTitle>
            <DialogDescription>
              {tagTarget?.ownerName} · {tagTarget?.vehicleNumber} · ID {tagTarget?.vehicleId}
            </DialogDescription>
          </DialogHeader>
          <label htmlFor="member-displaced-reason" className="text-sm font-medium">विस्थापितको कारण</label>
          <Textarea
            id="member-displaced-reason"
            value={reason}
            maxLength={300}
            onChange={(event) => setReason(event.target.value)}
            placeholder="विस्थापितमा राख्ने कारण लेख्नुहोस्"
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCloseTag} disabled={isSaving}>रद्द गर्नुहोस्</Button>
            <Button
              type="button"
              onClick={() => { if (tagTarget) void onConfirmTag(tagTarget, reason); }}
              disabled={isSaving || !reason.trim()}
            >
              <Users className="mr-2 size-4" aria-hidden="true" />ट्याग लगाउनुहोस्
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={removeTarget !== null} onOpenChange={(open) => { if (!open && !isSaving) onCloseRemove(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>विस्थापित ट्याग हटाउनुहोस्</DialogTitle>
            <DialogDescription>
              {removeTarget?.ownerName} ({removeTarget?.vehicleNumber}) को विस्थापित ट्याग हटेपछि सदस्यता बिलिङ इतिहासअनुसार पुनः गणना हुनेछ।
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCloseRemove} disabled={isSaving}>रद्द गर्नुहोस्</Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => { if (removeTarget) void onConfirmRemove(removeTarget); }}
              disabled={isSaving}
            >
              <Flag className="mr-2 size-4" aria-hidden="true" />ट्याग हटाउनुहोस्
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={blacklistTarget !== null} onOpenChange={(open) => { if (!open && !isSaving) onCloseBlacklist(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>सदस्य सवारीलाई कालोसूचीमा राख्नुहोस्</DialogTitle>
            <DialogDescription>
              {blacklistTarget?.ownerName} · {blacklistTarget?.vehicleNumber} · ID {blacklistTarget?.vehicleId}
            </DialogDescription>
          </DialogHeader>
          <label htmlFor="member-blacklist-reason" className="text-sm font-medium">कालोसूचीको कारण</label>
          <Textarea
            id="member-blacklist-reason"
            value={blacklistReason}
            maxLength={300}
            onChange={(event) => setBlacklistReason(event.target.value)}
            placeholder="कालोसूचीमा राख्ने कारण लेख्नुहोस्"
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCloseBlacklist} disabled={isSaving}>रद्द गर्नुहोस्</Button>
            <Button
              type="button"
              variant="destructive"
              loading={isSaving}
              onClick={() => { if (blacklistTarget) void onConfirmBlacklist(blacklistTarget, blacklistReason); }}
              disabled={isSaving || !blacklistReason.trim()}
            >
              <ShieldAlert className="mr-2 size-4" aria-hidden="true" />कालोसूचीमा राख्नुहोस्
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="border-b pb-1 text-xs font-semibold text-muted-foreground">{title}</h3>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border p-3 sm:gap-x-6">
        {children}
      </dl>
    </section>
  );
}

function DetailItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words text-xs font-medium">{value || '—'}</dd>
    </div>
  );
}

function dateRange(
  startBs: string | number | null | undefined,
  startAd: string | number | null | undefined,
  endBs: string | number | null | undefined,
  endAd: string | number | null | undefined,
): string {
  const start = startBs ?? startAd;
  const end = endBs ?? endAd;
  const startDate = start ? toNepaliDigits(String(start)) : '';
  const endDate = end ? toNepaliDigits(String(end)) : '';
  return [startDate, endDate].filter(Boolean).join(' / ') || '—';
}

function expiryLabel(value: string): string {
  const formatted = toNepaliDigits(formatDocumentNepaliDate(value).replaceAll('/', '-'));
  const [year, month] = formatted.split('-');
  const months = ['', 'बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज', 'कार्तिक', 'मंसिर', 'पुष', 'माघ', 'फागुन', 'चैत'];
  const monthNumber = Number(month?.replace(/[०-९]/gu, (digit) => String('०१२३४५६७८९'.indexOf(digit))));
  return `${months[monthNumber] ? `${months[monthNumber]} ${year} · ` : ''}${formatted || '—'}`;
}
