/** Client-side currency/count formatting, mirroring the server's num.js. */

export function formatCurrency(amount, currency = 'PHP') {
  const value = Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol', // "$1,234" for USD
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
      .format(value)
      .replace(/\u00A0/g, ' '); // normalize non-breaking spaces to plain spaces
  } catch {
    return `${currency} ${new Intl.NumberFormat('en-US').format(value)}`;
  }
}

export function formatCount(n) {
  return new Intl.NumberFormat('en-US').format(Math.round(n || 0));
}
