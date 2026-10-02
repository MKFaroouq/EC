export function StatusBadge({ tone, children }: { tone: "success" | "warning" | "danger" | "info" | "neutral"; children: React.ReactNode }) {
  return <span className={`status-badge ${tone}`}>{children}</span>;
}
