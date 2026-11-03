import { Card } from '@/components/ui/card';
import type { BillingVehicle } from '@/features/billing/model/types';
import type { VehicleResourceDocument } from '@/features/billing/api/vehicle-resource.api';
import type { ReceiptRecord } from '@/features/receipts/model/receipt';
import { getReceiptVehicleOwners } from '@/features/receipts/utils/receipt-owners';

export type ReconciliationMemberHistoryProps = {
	billingVehicle: BillingVehicle;
	tqmsVehicle: BillingVehicle;
	billingResource: VehicleResourceDocument;
	receipts: ReceiptRecord[];
	isLoading: boolean;
	error: string | null;
};

function normalizeVehicleKey(value: string): string {
	return value.trim().toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

function text(value: unknown): string {
	return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

function getMemberCode(resource: VehicleResourceDocument): string {
	const memberRecords = [resource.innerContent, resource.externalContent].flatMap((content) => {
		const member = content.Member ?? content.member ?? content.Membership ?? content.membership;
		const memberRecord = member && typeof member === 'object' && !Array.isArray(member)
			? member as Record<string, unknown>
			: null;
		return memberRecord ? [content, memberRecord] : [content];
	});
	for (const record of memberRecords) {
		for (const key of [
			'MemberCode',
			'memberCode',
			'MembershipCode',
			'membershipCode',
			'MemberNumber',
			'memberNumber',
			'MemberId',
			'memberId',
			'MembershipId',
			'membershipId',
		]) {
			const value = text(record[key]);
			if (value) return value;
		}
	}
	return '';
}

export function getRelatedMembershipBills(
	receipts: ReceiptRecord[],
	billingVehicle: BillingVehicle,
	billingResource: VehicleResourceDocument,
): ReceiptRecord[] {
	const vehicleIds = new Set([
		billingVehicle.tqmsVehicleId,
		billingVehicle.id,
		billingResource.id,
		text(billingResource.innerContent.VehicleId ?? billingResource.innerContent.vehicleId),
	].filter(Boolean));
	const oldVehicleNumber = normalizeVehicleKey(billingVehicle.vehicleNumber);

	return receipts
		.filter((receipt) => {
			if (receipt.billingType !== 'MEMBERSHIP' || receipt.status !== 'PAID') return false;
			const billVehicleId = receipt.bill.content.vehicle.id.trim();
			if (billVehicleId) return vehicleIds.has(billVehicleId);
			return Boolean(oldVehicleNumber) && normalizeVehicleKey(receipt.vehicleNumber) === oldVehicleNumber;
		})
		.sort((left, right) => {
			const leftDate = Date.parse(left.bill.createdAt);
			const rightDate = Date.parse(right.bill.createdAt);
			return (Number.isNaN(rightDate) ? 0 : rightDate) - (Number.isNaN(leftDate) ? 0 : leftDate);
		});
}

function OwnerDetails({
	title,
	badge,
	vehicle,
	identifierLabel,
	identifierValue,
}: {
	title: string;
	badge: string;
	vehicle: BillingVehicle;
	identifierLabel: string;
	identifierValue: string;
}) {
	const rows = [
		[identifierLabel, identifierValue],
		['धनीको नाम', vehicle.ownerName],
		['फोन नम्बर', vehicle.phone],
		['ठेगाना', vehicle.ownerAddress],
		['सवारी नम्बर', vehicle.vehicleNumber],
	];

	return (
		<Card className="space-y-2 border-border/80 p-3 shadow-none">
			<div className="flex items-start justify-between gap-2">
				<h3 className="text-sm font-semibold text-foreground">{title}</h3>
				<span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
					{badge}
				</span>
			</div>
			<dl className="space-y-1.5">
				{rows.map(([label, value]) => (
					<div key={label} className="grid grid-cols-[7rem_minmax(0,1fr)] gap-2 text-xs">
						<dt className="text-muted-foreground">{label}</dt>
						<dd className="break-words font-medium text-foreground">{value || '—'}</dd>
					</div>
				))}
			</dl>
		</Card>
	);
}

export function ReconciliationMemberHistory({
	billingVehicle,
	tqmsVehicle,
	billingResource,
	receipts,
	isLoading,
	error,
}: ReconciliationMemberHistoryProps) {
	if (isLoading) {
		return (
			<p role="status" className="rounded-md border border-border/70 p-3 text-xs text-muted-foreground">
				बिलिङ अभिलेख जाँच हुँदैछ...
			</p>
		);
	}

	if (error) {
		return (
			<p role="alert" className="rounded-md border border-destructive/30 p-3 text-xs text-destructive">
				बिलिङ अभिलेख जाँच गर्न सकिएन: {error}
			</p>
		);
	}

	const memberCode = getMemberCode(billingResource);
	const history = getRelatedMembershipBills(receipts, billingVehicle, billingResource);
	if (!memberCode || history.length === 0) return null;

	return (
		<section className="space-y-3" aria-label="पुरानो सदस्य तथा बिलिङ विवरण">
			<div className="grid gap-3 md:grid-cols-2">
				<OwnerDetails
					title="हालको बिलिङ सदस्य विवरण"
					badge="बिलिङ स्रोत"
					vehicle={billingVehicle}
					identifierLabel="सदस्य कोड"
					identifierValue={memberCode || '—'}
				/>
				<OwnerDetails
					title="TQMS अनुसार हालको धनी विवरण"
					badge="TQMS स्रोत"
					vehicle={tqmsVehicle}
					identifierLabel="TQMS ID"
					identifierValue={tqmsVehicle.tqmsVehicleId || '—'}
				/>
			</div>

			<Card className="overflow-hidden border-border/80 shadow-none">
				<h3 className="border-b border-border/70 bg-muted/40 px-3 py-2 text-sm font-semibold">
					यस गाडीको पछिल्लो बिलिङ अभिलेख
				</h3>
				<div className="overflow-x-auto">
					<table className="w-full min-w-[640px] text-left text-xs">
						<thead className="bg-muted/30 text-muted-foreground">
							<tr>
								<th className="px-3 py-2 font-medium">रसिद / बिल नं.</th>
								<th className="px-3 py-2 font-medium">जारी मिति</th>
								<th className="px-3 py-2 font-medium">बिलिङ अवधि</th>
								<th className="px-3 py-2 text-right font-medium">रकम</th>
								<th className="px-3 py-2 font-medium">भुक्तानी स्थिति</th>
								<th className="px-3 py-2 font-medium">बिलमा कायम धनी नाम</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{history.map((receipt) => {
								const owners = getReceiptVehicleOwners(
									receipt.bill.content.vehicle.ownerName,
									receipt.bill.content.vehicle.operatorName,
								);
								return (
									<tr key={receipt.id}>
										<td className="px-3 py-2 font-medium">{receipt.receiptNumber}</td>
										<td className="px-3 py-2">{receipt.billingDate || '—'}</td>
										<td className="px-3 py-2">
											{receipt.bill.content.periodStart || '—'} – {receipt.bill.content.periodEnd || '—'}
										</td>
										<td className="px-3 py-2 text-right tabular-nums">रु. {receipt.totalAmount}</td>
										<td className="px-3 py-2">{receipt.status}</td>
										<td className="px-3 py-2">
											{owners.hasMultipleOwners
												? (
													<div className="space-y-0.5">
														<p>सञ्चालक: {owners.sanchalakName}</p>
														<p>धनीको नाम: {owners.dhaniName}</p>
													</div>
												)
												: owners.dhaniName || '—'}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
				{memberCode ? (
					<p className="border-t border-border/70 px-3 py-2 text-xs text-muted-foreground">
						सदस्य कोड: <span className="font-medium text-foreground">{memberCode}</span>
					</p>
				) : null}
			</Card>
		</section>
	);
}

export function hasReconciliationHistory(
	billingVehicle: BillingVehicle,
	billingResource: VehicleResourceDocument,
	receipts: ReceiptRecord[],
): boolean {
	return Boolean(getMemberCode(billingResource))
		&& getRelatedMembershipBills(receipts, billingVehicle, billingResource).length > 0;
}
