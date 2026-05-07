export const toMonthly = (amount, frequency) => {
  const numAmount = Number(amount) || 0;
  switch (frequency) {
    case 'Biweekly': return numAmount * (26 / 12);
    case 'Monthly': return numAmount * 1;
    case 'Annual': return numAmount / 12;
    default: return 0;
  }
};

export const toAnnual = (amount, frequency) => {
  const numAmount = Number(amount) || 0;
  switch (frequency) {
    case 'Biweekly': return numAmount * 26;
    case 'Monthly': return numAmount * 12;
    case 'Annual': return numAmount * 1;
    default: return 0;
  }
};

export const toBiweekly = (amount, frequency) => {
  const numAmount = Number(amount) || 0;
  switch (frequency) {
    case 'Biweekly': return numAmount * 1;
    case 'Monthly': return numAmount * (12 / 26);
    case 'Annual': return numAmount / 26;
    default: return 0;
  }
};
