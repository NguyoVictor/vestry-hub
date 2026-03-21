const CURRENCY_SYMBOLS: Record<string, string> = {
  KES: "KSh", NGN: "₦", ZAR: "R", UGX: "USh", TZS: "TSh",
  GHS: "GH₵", RWF: "RF", USD: "$", GBP: "£", EUR: "€",
};

export const formatCurrencyFull = (amount: number, currencyCode = "KES") => {
  const sym = CURRENCY_SYMBOLS[currencyCode] || currencyCode;
  return `${sym} ${amount.toLocaleString()}`;
};

export const formatCurrencyShort = (amount: number, currencyCode = "KES") => {
  const sym = CURRENCY_SYMBOLS[currencyCode] || currencyCode;
  if (amount >= 1_000_000) return `${sym} ${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${sym} ${(amount / 1_000).toFixed(1)}K`;
  return `${sym} ${amount.toLocaleString()}`;
};
