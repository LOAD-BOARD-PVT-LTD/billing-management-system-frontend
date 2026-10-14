type RuleOptionLike = {
  ruleType?: string | null;
  kind?: string | null;
  label?: string | null;
};

type RuleOptionLabelLike = {
  displayLabel?: string | null;
  label?: string | null;
};

type VehicleRuleLabelLike = {
  ruleType?: string | null;
  displayLabel?: string | null;
  vehicleCategory?: string | null;
};

type VehicleRuleScope = {
  vehicleCategory?: string | null;
  vehicleSubcategory?: string | null;
};

type VehicleScopedRuleOption = RuleOptionLike & {
  vehicleCategory?: string | null;
  vehicleSubcategory?: string | null;
};

function normalizeText(value: string | null | undefined): string {
  return String(value ?? '').trim().replace(/\s+/gu, ' ');
}

function normalizeRuleType(value: string | null | undefined): string {
  const normalized = normalizeText(value);
  return normalized ? normalized : 'RULE';
}

function normalizeKind(value: string | null | undefined): string {
  return normalizeText(value);
}

export function resolveRuleOptionLabel(value: RuleOptionLabelLike): string {
  const displayLabel = normalizeText(value.displayLabel);
  if (displayLabel) return displayLabel;
  return normalizeText(value.label);
}

export function buildRuleOptionDedupeKey(value: RuleOptionLike): string {
  const ruleType = normalizeRuleType(value.ruleType);
  const kind = normalizeKind(value.kind);
  const label = normalizeText(value.label).toLocaleLowerCase();
  return `${ruleType}::${kind}::${label}`;
}

export function dedupeRuleOptions<T extends RuleOptionLike>(values: T[]): T[] {
  const seen = new Set<string>();
  const deduped: T[] = [];

  for (const value of values) {
    const key = buildRuleOptionDedupeKey(value);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(value);
  }

  return deduped;
}

export function isVehicleTypeRule(ruleType: string | null | undefined): boolean {
  return normalizeRuleType(ruleType) === 'VEHICLE_FEE';
}

export function isVehicleCategoryEchoLabel(value: VehicleRuleLabelLike): boolean {
  if (!isVehicleTypeRule(value.ruleType)) return false;
  const displayLabel = normalizeText(value.displayLabel);
  const category = normalizeText(value.vehicleCategory);
  if (!displayLabel || !category) return false;
  return displayLabel.toLocaleLowerCase() === category.toLocaleLowerCase();
}

function normalizedVehicleScopeCandidates(value: VehicleRuleScope): string[] {
  return [value.vehicleSubcategory, value.vehicleCategory]
    .map((candidate) => normalizeText(candidate).toLocaleLowerCase())
    .filter((candidate) => candidate.length > 0);
}

export function ruleOptionMatchesVehicleScope(value: VehicleScopedRuleOption, scope: VehicleRuleScope): boolean {
  if (!isVehicleTypeRule(value.ruleType)) return true;

  const expected = normalizedVehicleScopeCandidates(scope);
  if (expected.length === 0) return true;

  const actual = normalizedVehicleScopeCandidates(value);
  if (actual.length === 0) return true;

  return actual.some((candidate) => expected.includes(candidate));
}

export function filterVehicleScopedRuleOptions<T extends VehicleScopedRuleOption>(
  values: T[],
  scope: VehicleRuleScope,
): T[] {
  return values.filter((value) => ruleOptionMatchesVehicleScope(value, scope));
}

export function partitionRuleOptionsByType<T extends { ruleType?: string | null }>(values: T[]): {
  vehicleTypeRules: T[];
  commonRules: T[];
} {
  const vehicleTypeRules: T[] = [];
  const commonRules: T[] = [];

  for (const value of values) {
    if (isVehicleTypeRule(value.ruleType)) {
      vehicleTypeRules.push(value);
      continue;
    }
    commonRules.push(value);
  }

  return { vehicleTypeRules, commonRules };
}
