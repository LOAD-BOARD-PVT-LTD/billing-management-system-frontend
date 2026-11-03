import { Textarea } from '@/components/ui/textarea';

export type ReconciliationReasonFieldProps = {
	reason: string;
	onReasonChange: (reason: string) => void;
};

export function ReconciliationReasonField({ reason, onReasonChange }: ReconciliationReasonFieldProps) {
	return (
		<div className="space-y-1.5 rounded-md border border-border/80 bg-muted/20 p-3">
			<label htmlFor="reconciliation-reason" className="text-xs font-semibold text-foreground">
				परिवर्तनको कारण वा कैफियत (Audit Reason) <span className="text-destructive">*</span>
			</label>
			<Textarea
				id="reconciliation-reason"
				value={reason}
				onChange={(event) => onReasonChange(event.target.value)}
				placeholder="उदा: TQMS मा सवारी नामसारी भई नयाँ धनी दर्ता भएको..."
				className="min-h-[70px] resize-none text-xs"
			/>
			<p className="text-[11px] text-muted-foreground">
				यो कैफियत सवारीको अद्यावधिक इतिहास (Audit Trail) मा सुरक्षित राखिनेछ।
			</p>
		</div>
	);
}
