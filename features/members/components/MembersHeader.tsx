export function MembersHeader({ fiscalYearName }: { fiscalYearName: string }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-sm text-muted-foreground">सदस्य व्यवस्थापन</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">सदस्य व्यवस्थापन</h1>
      </div>
      <p className="text-sm text-muted-foreground">{fiscalYearName} आर्थिक वर्षका सदस्यहरू</p>
    </header>
  );
}
