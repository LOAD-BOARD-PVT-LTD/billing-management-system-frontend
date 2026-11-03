import { AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';

export function VehicleReconciliationWarning() {
	return (
		<Card className="border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-950 shadow-none dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
			<div className="flex items-start gap-2.5">
				<AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
				<div className="space-y-1">
					<p className="font-semibold text-amber-900 dark:text-amber-200">
						यो सवारीको विवरण TQMS र बिलिङ प्रणालीमा फरक रहेको छ।
					</p>
					<p className="text-[11.5px] leading-relaxed text-amber-800 dark:text-amber-300">
						बिलिङ प्रणालीमा रहेको पुरानो विवरण र TQMS मा रहेको नयाँ विवरण तुलना गरी अगाडि बढ्ने विकल्प छान्नुहोस्।
						पुरानो रसिद तथा बिलको इतिहास सुरक्षित रहनेछ।
					</p>
				</div>
			</div>
		</Card>
	);
}
