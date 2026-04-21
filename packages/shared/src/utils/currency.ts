/**
 * Format a numeric amount to a currency string.
 * e.g. formatCurrency(1234.5, 'USD') → '$1,234.50'
 */
export function formatCurrency(amount: number | string, currency = 'USD'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(num);
}

/**
 * Convert dollars to cents (Stripe uses smallest currency unit).
 */
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Convert cents back to dollars.
 */
export function fromCents(cents: number): number {
  return cents / 100;
}

/**
 * Calculate platform fee for a transfer amount.
 * Fee is 0.5%, minimum $0.10.
 */
export function calculateFee(amount: number, feePercent = 0.5): number {
  const fee = (amount * feePercent) / 100;
  return Math.max(parseFloat(fee.toFixed(2)), 0.1);
}
