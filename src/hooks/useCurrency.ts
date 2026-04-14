import { useChurch } from "@/contexts/ChurchContext";
import { countries } from "@/lib/country-currency";

const CURRENCY_SYMBOLS: Record<string, string> = {
  KES: "KSh", NGN: "₦", ZAR: "R", UGX: "USh", TZS: "TSh",
  GHS: "GH₵", RWF: "RF", USD: "$", GBP: "£", EUR: "€",
  CAD: "C$", AUD: "A$", INR: "₹", PHP: "₱", BRL: "R$",
  KRW: "₩", JPY: "¥", MXN: "MX$", IDR: "Rp", ZMW: "ZK",
  ZWL: "Z$", MWK: "MK", MZN: "MT", XAF: "FCFA", CDF: "FC",
  BWP: "P", NAD: "N$", ETB: "Br",
};

export function useCurrency() {
  const church = useChurch();

  // Prefer explicit currency code stored on tenant, fall back to country lookup
  let code = church.currency || "USD";

  if (!CURRENCY_SYMBOLS[code]) {
    // Try to derive from country
    const countryData = countries.find(
      (c) => c.name === church.country || c.code === church.country
    );
    if (countryData) code = countryData.currency;
    else code = "USD";
  }

  const symbol = CURRENCY_SYMBOLS[code] || code;

  const format = (amount: number | null | undefined): string => {
    if (amount == null) return `${symbol} 0`;
    return `${symbol} ${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  return { symbol, code, format };
}
