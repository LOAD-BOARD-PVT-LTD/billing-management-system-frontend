import { memo } from 'react';
import { ExternalLink, LoaderCircle, Truck } from 'lucide-react';
import { useTqmsVehicleDetails } from '@/features/billing/hooks/useTqmsVehicleDetails';
import type { BillingVehicle } from '@/features/billing/model/types';
import { getTqmsUrl } from '@/lib/config/tqms';

function SummaryValue({
	label,
	value,
	href,
	detailsLabel,
}: {
	label: string;
	value: string;
	href?: string;
	detailsLabel: string;
}) {
	return (
		<div className="grid min-w-0 grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)_20px] items-start gap-2 border-b border-border/60 px-2.5 py-2 last:border-b-0 hover:bg-muted/30">
			<dt className="min-w-0 text-xs font-medium leading-5 text-muted-foreground">{label}</dt>
			<dd className="min-w-0 break-words text-xs font-medium leading-5 text-foreground">{value || '-'}</dd>
			{href ? (
				<a
					href={href}
					target="_blank"
					rel="noopener noreferrer"
					aria-label={`${label} ${detailsLabel}`}
					title={`${label} ${detailsLabel}`}
					className="mt-0.5 grid size-5 shrink-0 place-items-center rounded border border-border/70 text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					<ExternalLink aria-hidden="true" className="size-3" />
				</a>
			) : <span aria-hidden="true" />}
		</div>
	);
}

export const VehicleSummary = memo(function VehicleSummary({ vehicle }: { vehicle: BillingVehicle }) {
	const { details, isLoading, error, reload } = useTqmsVehicleDetails(vehicle.vehicleNumber);
	const compliance = details?.Compliance;
	const insurance = compliance?.Insurance;
	const checkPass = compliance?.CheckPass;
	const routePermit = compliance?.RoutePermit;
	const bluebook = compliance?.Bluebook ?? compliance?.BlueBook ?? details?.Bluebook ?? details?.BlueBook;
	const vehicleDetailsUrl = vehicle.tqmsVehicleId
		? getTqmsUrl(`/admin/vehicle/view/${encodeURIComponent(vehicle.tqmsVehicleId)}`)
		: null;
	const formatDate = (bs?: string | number | null, ad?: string | number | null) => {
		for (const value of [bs, ad]) {
			if (value !== null && value !== undefined && String(value).trim() !== '') return String(value);
		}
		return '-';
	};
	const period = (
		startBs?: string | number | null,
		startAd?: string | number | null,
		endBs?: string | number | null,
		endAd?: string | number | null,
	) => `${formatDate(startBs, startAd)} / ${formatDate(endBs, endAd)}`;

	return (
		<aside className="overflow-hidden rounded-lg border border-border/80 bg-card shadow-sm">
			<h2 className="flex min-h-10 items-center gap-2 border-b border-border/70 bg-muted/30 px-3 py-2 text-sm font-semibold leading-5 text-foreground">
				<span className="grid size-6 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
					<Truck aria-hidden="true" className="size-3.5" />
				</span>
				सवारी विवरण
				{isLoading && <LoaderCircle aria-label="TQMS विवरण लोड हुँदैछ" className="ml-auto size-4 animate-spin text-muted-foreground" />}
			</h2>
			{error && (
				<div role="alert" className="border-b border-border px-3 py-2 text-xs leading-5 text-destructive">
					<p>{`TQMS सवारी विवरण लोड गर्न सकिएन: ${error}`}</p>
					<button type="button" onClick={() => void reload()} className="mt-0.5 font-medium underline underline-offset-2">
						पुनः प्रयास गर्नुहोस्
					</button>
				</div>
			)}
			{!vehicle.vehicleNumber && (
				<p role="status" className="border-b border-border px-3 py-2 text-xs leading-5 text-muted-foreground">
					यस सवारीको TQMS विवरण उपलब्ध छैन।
				</p>
			)}
			<dl>
				<SummaryValue
					label="बीमा कम्पनी"
					value={insurance?.Company?.trim() || '-'}
					href={vehicleDetailsUrl ? `${vehicleDetailsUrl}#insurancedetails` : undefined}
					detailsLabel="विवरण हेर्नुहोस्"
				/>
				<SummaryValue
					label="बीमा अवधि (बाट/सम्म)"
					value={period(insurance?.StartBs, insurance?.StartAd, insurance?.ExpiryBs, insurance?.ExpiryAd)}
					href={vehicleDetailsUrl ? `${vehicleDetailsUrl}#insurancedetails` : undefined}
					detailsLabel="विवरण हेर्नुहोस्"
				/>
				<SummaryValue
					label="रुट"
					value={routePermit?.Route?.trim() || '-'}
					href={vehicleDetailsUrl ? `${vehicleDetailsUrl}#routepermitdetails` : undefined}
					detailsLabel="विवरण हेर्नुहोस्"
				/>
				<SummaryValue
					label="रुट परमिट मिति"
					value={formatDate(routePermit?.ExpiryBs, routePermit?.ExpiryAd)}
					href={vehicleDetailsUrl ? `${vehicleDetailsUrl}#routepermitdetails` : undefined}
					detailsLabel="विवरण हेर्नुहोस्"
				/>
				<SummaryValue
					label="चेक पास अवधि (बाट/सम्म)"
					value={period(checkPass?.StartBs, checkPass?.StartAd, checkPass?.ExpiryBs, checkPass?.ExpiryAd)}
					href={vehicleDetailsUrl ? `${vehicleDetailsUrl}#checkpassdetails` : undefined}
					detailsLabel="विवरण हेर्नुहोस्"
				/>
				<SummaryValue
					label="ब्लुबुक अवधि (बाट/सम्म)"
					value={period(bluebook?.StartBs, bluebook?.StartAd, bluebook?.ExpiryBs, bluebook?.ExpiryAd)}
					detailsLabel="विवरण हेर्नुहोस्"
				/>
			</dl>
		</aside>
	);
});
