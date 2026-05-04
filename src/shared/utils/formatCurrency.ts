export function formatCurrency(amount: number, currency: string | null | undefined): string {
  const safeCurrency = currency?.trim() || '';

  if (!safeCurrency) {
    return String(amount);
  }

  return `${amount} ${safeCurrency}`;
}