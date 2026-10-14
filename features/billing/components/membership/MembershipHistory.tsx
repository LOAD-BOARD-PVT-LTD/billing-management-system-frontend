import { ClipboardList } from 'lucide-react';

export function MembershipHistory() {
	return (
		<section className="overflow-hidden rounded-md border border-border bg-card">
			<h2 className="flex items-center gap-2 border-b border-border px-3 py-3 text-sm font-semibold text-foreground">
				<ClipboardList aria-hidden="true" className="size-4 text-primary" />सदस्यता विवरण
			</h2>
			<p className="px-3 py-5 text-center text-sm text-muted-foreground">
				सदस्यता इतिहास API उपलब्ध भएपछि विवरण यहाँ देखिनेछ।
			</p>
		</section>
	);
}
