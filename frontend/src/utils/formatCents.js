const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

export const fmt = (cents) => usd.format((cents ?? 0) / 100);
export const fmtAbs = (cents) => usd.format(Math.abs(cents ?? 0) / 100);
export const centsToFloat = (cents) => (cents ?? 0) / 100;
export const floatToCents = (n) => Math.round((parseFloat(n) || 0) * 100);
