export function ReportMetric({ label, value, description }: { label: string; value: string; description: string }) {
  return (
    <article className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </article>
  );
}
