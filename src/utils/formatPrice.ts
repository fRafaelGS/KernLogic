/**
 * Format a number as USD with German (de-DE) locale rules.
 * Example: 1234.5 → "1.234,50 $"
 */
export function formatPrice(n: number): string {
    return Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(n);
  }
  