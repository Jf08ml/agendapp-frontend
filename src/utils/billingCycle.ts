const BILLING_LABELS: Record<string, string> = {
  monthly: "Mensual",
  quarterly: "Trimestral",
  semiannual: "Semestral",
  yearly: "Anual",
  lifetime: "De por vida",
};

const BILLING_SHORT: Record<string, string> = {
  monthly: "mes",
  quarterly: "trimestre",
  semiannual: "semestre",
  yearly: "año",
  lifetime: "único",
};

export const billingLabel = (cycle: string) => BILLING_LABELS[cycle] ?? cycle;
export const billingShort = (cycle: string) => BILLING_SHORT[cycle] ?? cycle;
