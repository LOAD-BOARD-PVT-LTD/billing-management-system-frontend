export type DuplicateLabelSummaryItem = {
  label: string;
  count: number;
};

type DuplicateLabelSource = {
  duplicateLabels: string[];
};

export type DuplicateLabelGroup<T extends DuplicateLabelSource> = DuplicateLabelSummaryItem & {
  matches: T[];
};

function normalizeDuplicateLabel(value: string): string {
  return value.trim().replace(/\s+/gu, ' ').toLocaleLowerCase();
}

export function groupDuplicateMatchesByLabel<T extends DuplicateLabelSource>(
  matches: T[],
): Array<DuplicateLabelGroup<T>> {
  const groups = new Map<string, DuplicateLabelGroup<T>>();

  for (const match of matches) {
    const seenInMatch = new Set<string>();

    for (const rawLabel of match.duplicateLabels) {
      const label = rawLabel.trim().replace(/\s+/gu, ' ');
      const key = normalizeDuplicateLabel(label);
      if (!key || seenInMatch.has(key)) continue;

      seenInMatch.add(key);
      const group = groups.get(key);
      if (group) {
        group.count += 1;
        group.matches.push(match);
      } else {
        groups.set(key, { label, count: 1, matches: [match] });
      }
    }
  }

  return [...groups.values()].sort((a, b) => a.label.localeCompare(b.label));
}

export function summarizeDuplicateLabels(matches: DuplicateLabelSource[]): DuplicateLabelSummaryItem[] {
  return groupDuplicateMatchesByLabel(matches).map(({ label, count }) => ({ label, count }));
}
