export function formatCurrency(amount: number, currency: 'IQD' | 'USD' = 'USD'): string {
  if (!amount) amount = 0;
  if (currency === 'USD') {
    return `$${amount.toLocaleString('en-US')}`;
  }
  return `${amount.toLocaleString('ar-EG')} د.ع`;
}
