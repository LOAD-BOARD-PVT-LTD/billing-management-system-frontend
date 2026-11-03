'use client';

import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export type VehicleReconciliationHeaderProps = {
	vehicleNumber: string;
	changedFieldCount: number;
	isSubmitting: boolean;
	onCancel: () => void;
};

export function VehicleReconciliationHeader({
	vehicleNumber,
	changedFieldCount,
	isSubmitting,
	onCancel,
}: VehicleReconciliationHeaderProps) {
	return (
		<div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-3">
			<div className="flex items-center gap-2">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={onCancel}
					disabled={isSubmitting}
					className="h-8 gap-1 px-2 text-xs"
				>
					<ArrowLeft className="size-4" />
					फिर्ता जानुहोस्
				</Button>
				<div className="h-4 w-px bg-border" />
				<h2 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
					सवारी विवरण मेलमिलाप (Vehicle Reconciliation)
				</h2>
			</div>
			<div className="flex items-center gap-2">
				<Badge variant="outline" className="h-6 font-mono text-xs">
					{vehicleNumber}
				</Badge>
				<Badge variant="secondary" className="h-6 gap-1 text-xs">
					<AlertTriangle className="size-3 text-amber-600" />
					{changedFieldCount} विवरण फरक
				</Badge>
			</div>
		</div>
	);
}
