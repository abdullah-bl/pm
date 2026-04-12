export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "— SAR";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount) + " SAR";
}

export function formatDate(date: string | number | Date | null | undefined): string {
  if (date == null) return "—";
  const d = typeof date === "number" ? new Date(date) : new Date(date);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(date: string | number | Date | null | undefined): string {
  if (date == null) return "—";
  const d = typeof date === "number" ? new Date(date) : new Date(date);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
