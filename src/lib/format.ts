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

/**
 * Format duration from seconds to MM:SS format
 * @param seconds - Duration in seconds
 * @returns Formatted duration string (e.g., "05:30", "125:45")
 */
export const formatDuration = (seconds: number): string => {
  if (!seconds || seconds < 0) return "00:00";
  
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};
