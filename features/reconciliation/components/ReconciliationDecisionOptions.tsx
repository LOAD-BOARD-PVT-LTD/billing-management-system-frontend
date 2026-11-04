import { Check, Database, RefreshCw, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { ReconciliationOption } from '../types/reconciliation.types';

export type ReconciliationDecisionOptionsProps = {
	selectedOption: ReconciliationOption | null;
	onSelect: (option: ReconciliationOption) => void;
};

const decisionOptions: Array<{
	value: Exclude<ReconciliationOption, 'CREATE_NEW_MEMBER'>;
	title: string;
	description: string;
	Icon: LucideIcon;
	iconClass: string;
	selectedClass: string;
	hoverClass: string;
}> = [
	{
		value: 'KEEP_BILLING',
		title: 'पुरानो बिलिङ कायम',
		description: 'हालको बिलिङ प्रणालीमा रहेको पुरानो सदस्य तथा सवारी विवरण प्रयोग गरी नयाँ बिल सिर्जना गर्नुहोस्।',
		Icon: Database,
		iconClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
		selectedClass: 'border-primary ring-2 ring-primary/20 bg-primary/5',
		hoverClass: 'hover:border-primary/50 hover:bg-muted/30',
	},
	{
		value: 'UPDATE_TQMS',
		title: 'TQMS अनुसार अपडेट',
		description: 'TQMS मा उपलब्ध नयाँ विवरणअनुसार बिलिङ सवारी अपडेट गर्नुहोस्। पुरानो बिल र रसिद इतिहास सुरक्षित रहनेछ।',
		Icon: RefreshCw,
		iconClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
		selectedClass: 'border-emerald-600 ring-2 ring-emerald-600/20 bg-emerald-50/30 dark:bg-emerald-950/10',
		hoverClass: 'hover:border-emerald-600/50 hover:bg-muted/30',
	},
];

export function ReconciliationDecisionOptions({
	selectedOption,
	onSelect,
}: ReconciliationDecisionOptionsProps) {
	return (
		<div className="space-y-2">
			<p className="text-xs font-semibold text-foreground">
				कृपया अगाडि बढ्ने विकल्प छान्नुहोस् (Select Action):
			</p>
			<div className="grid gap-2.5 sm:grid-cols-2">
				{decisionOptions.map(({ value, title, description, Icon, iconClass, selectedClass, hoverClass }) => {
					const isSelected = selectedOption === value;
					return (
						<Card
							key={value}
							role="button"
							tabIndex={0}
							aria-pressed={isSelected}
							onClick={() => onSelect(value)}
							onKeyDown={(event) => {
								if (event.key === 'Enter' || event.key === ' ') {
									event.preventDefault();
									onSelect(value);
								}
							}}
							className={`relative cursor-pointer p-3 transition-all ${
								isSelected ? selectedClass : `border-border/80 ${hoverClass}`
							}`}
						>
							<div className="flex items-start justify-between gap-2">
								<div className="flex items-center gap-2">
									<div className={`grid size-7 place-items-center rounded-md ${iconClass}`}>
										<Icon className="size-4" />
									</div>
									<h3 className="text-xs font-semibold text-foreground">{title}</h3>
								</div>
								<div
									className={`grid size-4 place-items-center rounded-full border ${
										isSelected
											? value === 'KEEP_BILLING'
														? 'border-primary bg-primary text-primary-foreground'
														: 'border-emerald-600 bg-emerald-600 text-white'
											: 'border-muted-foreground/40'
									}`}
								>
									{isSelected && <Check className="size-3" />}
								</div>
							</div>
							<p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
								{description}
							</p>
						</Card>
					);
				})}
			</div>
		</div>
	);
}
