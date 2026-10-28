import { ExternalLink, LoaderCircle, Truck } from 'lucide-react';
import { useTqmsVehicleDetails } from '@/features/billing/hooks/useTqmsVehicleDetails';
import type { BillingVehicle } from '@/features/billing/model/types';

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
		<div className="grid min-w-0 grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)_18px] items-center gap-1 border-b border-border/60 px-1.5 py-0 last:border-b-0">
			<p className="min-w-0 text-xs leading-4 text-muted-foreground">{label}</p>
			<p className="min-w-0 break-words text-sm font-medium leading-4 text-foreground">{value || '-'}</p>
			{href ? (
				<a
					href={href}
					target="_blank"
					rel="noreferrer"
					aria-label={`${label} ${detailsLabel}`}
					title={`${label} ${detailsLabel}`}
					className="grid size-[18px] shrink-0 place-items-center rounded-sm border border-border text-muted-foreground hover:bg-muted"
				>
					<ExternalLink aria-hidden="true" className="size-3" />
				</a>
			) : null}
		</div>
	);
}

export function VehicleSummary({ vehicle }: { vehicle: BillingVehicle }) {
	const { details, isLoading, error, reload } = useTqmsVehicleDetails(vehicle.vehicleNumber);
	const compliance = details?.Compliance;
	const insurance = compliance?.Insurance;
	const checkPass = compliance?.CheckPass;
	const routePermit = compliance?.RoutePermit;
	const bluebook = compliance?.Bluebook ?? compliance?.BlueBook ?? details?.Bluebook ?? details?.BlueBook;
	const vehicleDetailsUrl = vehicle.tqmsVehicleId
		? `https://tqms.bitspanda.com/admin/vehicle/view/${encodeURIComponent(vehicle.tqmsVehicleId)}`
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
		<aside className="overflow-hidden rounded-md border border-border bg-card">
			<h2 className="flex items-center gap-1 border-b border-border px-1.5 py-1 text-sm font-semibold text-foreground">
				<Truck aria-hidden="true" className="size-4 text-primary" />
				सवारी विवरण
				{isLoading && <LoaderCircle aria-label="TQMS विवरण लोड हुँदैछ" className="ml-auto size-4 animate-spin text-muted-foreground" />}
			</h2>
			{error && (
				<div role="alert" className="border-b border-border px-2 py-1.5 text-xs text-destructive">
					<p>TQMS सवारी विवरण लोड गर्न सकिएन: {error}</p>
					<button type="button" onClick={() => void reload()} className="font-medium underline underline-offset-2">
						पुनः प्रयास गर्नुहोस्
					</button>
				</div>
			)}
			{!vehicle.vehicleNumber && (
				<p role="status" className="border-b border-border px-2 py-1.5 text-xs text-muted-foreground">
					यस सवारीको TQMS विवरण उपलब्ध छैन।
				</p>
			)}
			<div className="px-1 py-0">
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
			</div>
		</aside>
	);
}
