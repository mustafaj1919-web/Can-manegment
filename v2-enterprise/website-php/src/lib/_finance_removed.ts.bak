export interface FinanceInputs {
  price: number;
  downPaymentPct: number;
  termMonths: number;
  annualRatePct: number;
}

export function calculateMonthlyPayment({ price, downPaymentPct, termMonths, annualRatePct }: FinanceInputs) {
  const downPayment = price * (downPaymentPct / 100);
  const principal = Math.max(price - downPayment, 0);
  const monthlyRate = annualRatePct / 100 / 12;

  if (monthlyRate === 0) {
    return { downPayment, principal, monthly: principal / termMonths, totalPayable: principal + downPayment };
  }

  const monthly =
    (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
    (Math.pow(1 + monthlyRate, termMonths) - 1);

  return {
    downPayment,
    principal,
    monthly,
    totalPayable: monthly * termMonths + downPayment,
  };
}
