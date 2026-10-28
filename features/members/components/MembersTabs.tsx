'use client';

import { Button } from '@/components/ui/button';
import type { MemberCounts } from '@/features/members/utils/member-calculations';
import { toNepaliDigits } from '@/utils/numbers';

export type MemberTab = 'all' | 'active' | 'new' | 'inactive' | 'displaced' | 'blacklisted';

const TABS: Array<{ id: MemberTab; label: string; count: keyof MemberCounts }> = [
  { id: 'all', label: 'सदस्य सूची', count: 'total' },
  { id: 'active', label: 'सक्रिय सदस्यहरू', count: 'active' },
  { id: 'new', label: 'नयाँ सदस्यता', count: 'new' },
  { id: 'inactive', label: 'निष्क्रिय सदस्यहरू', count: 'inactive' },
  { id: 'displaced', label: 'विस्थापित सूची', count: 'displaced' },
  { id: 'blacklisted', label: 'कालोसूची सदस्य', count: 'blacklisted' },
];

type MembersTabsProps = {
  counts: MemberCounts;
  selected: MemberTab;
  onSelect: (tab: MemberTab) => void;
};

export function MembersTabs({ counts, selected, onSelect }: MembersTabsProps) {
  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max gap-2 pb-1 sm:min-w-0 sm:grid sm:grid-cols-3 lg:grid-cols-6">
        {TABS.map((tab) => (
          <Button
            key={tab.id}
            type="button"
            variant="ghost"
            className={`h-auto min-w-24 flex-col gap-1 rounded-lg border px-3 py-2 text-center sm:min-w-0 ${selected === tab.id ? 'border-primary bg-primary/5 text-primary shadow-sm' : 'border-border/70 text-muted-foreground hover:bg-muted/60'}`}
            onClick={() => onSelect(tab.id)}
            aria-pressed={selected === tab.id}
          >
            <span className="text-xs font-medium leading-tight sm:text-sm">{tab.label}</span>
            <span className={`text-lg font-semibold leading-none ${selected === tab.id ? 'text-primary' : 'text-foreground'}`}>
              {toNepaliDigits(counts[tab.count])}
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
}
