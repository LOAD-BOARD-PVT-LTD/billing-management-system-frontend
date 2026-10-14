type DashboardWelcomeProps = {
  displayName: string;
  roleLabel: string;
};

export function DashboardWelcome({ displayName, roleLabel }: DashboardWelcomeProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border/70 pb-4">
      <div className="min-w-0">
        <p className="mb-1 text-sm font-medium text-muted-foreground">सदस्यता शुल्क व्यवस्थापन प्रणाली</p>
        <h1 className="truncate text-xl font-semibold text-foreground sm:text-2xl">नमस्कार, {displayName}!</h1>
        <p className="mt-1 text-sm text-muted-foreground">तपाईंको संस्थाको आजको समग्र अवस्था</p>
      </div>
      <span className="rounded-md border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground">
        {roleLabel}
      </span>
    </header>
  );
}