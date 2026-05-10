/** Format a number as USD with two decimal places (display only). */
export function formatUsd(amount: number): string {
  return Number.isFinite(amount) ? amount.toFixed(2) : '0.00';
}
