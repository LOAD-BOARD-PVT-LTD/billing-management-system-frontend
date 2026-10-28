export function PageNumber({ value }: { value: string }) {
  if (!value.trim()) return null;
  return <span className="document-reference">द.नं. {value}</span>;
}
