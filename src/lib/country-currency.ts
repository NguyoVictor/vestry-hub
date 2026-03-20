export interface CountryData {
  name: string;
  code: string;
  dialCode: string;
  currency: string;
  currencySymbol: string;
}

export const countries: CountryData[] = [
  { name: "United States", code: "US", dialCode: "+1", currency: "USD", currencySymbol: "$" },
  { name: "United Kingdom", code: "GB", dialCode: "+44", currency: "GBP", currencySymbol: "£" },
  { name: "Canada", code: "CA", dialCode: "+1", currency: "CAD", currencySymbol: "C$" },
  { name: "Australia", code: "AU", dialCode: "+61", currency: "AUD", currencySymbol: "A$" },
  { name: "Kenya", code: "KE", dialCode: "+254", currency: "KES", currencySymbol: "KSh" },
  { name: "Nigeria", code: "NG", dialCode: "+234", currency: "NGN", currencySymbol: "₦" },
  { name: "South Africa", code: "ZA", dialCode: "+27", currency: "ZAR", currencySymbol: "R" },
  { name: "Ghana", code: "GH", dialCode: "+233", currency: "GHS", currencySymbol: "GH₵" },
  { name: "Tanzania", code: "TZ", dialCode: "+255", currency: "TZS", currencySymbol: "TSh" },
  { name: "Uganda", code: "UG", dialCode: "+256", currency: "UGX", currencySymbol: "USh" },
  { name: "Rwanda", code: "RW", dialCode: "+250", currency: "RWF", currencySymbol: "RF" },
  { name: "Ethiopia", code: "ET", dialCode: "+251", currency: "ETB", currencySymbol: "Br" },
  { name: "India", code: "IN", dialCode: "+91", currency: "INR", currencySymbol: "₹" },
  { name: "Philippines", code: "PH", dialCode: "+63", currency: "PHP", currencySymbol: "₱" },
  { name: "Brazil", code: "BR", dialCode: "+55", currency: "BRL", currencySymbol: "R$" },
  { name: "Germany", code: "DE", dialCode: "+49", currency: "EUR", currencySymbol: "€" },
  { name: "France", code: "FR", dialCode: "+33", currency: "EUR", currencySymbol: "€" },
  { name: "Netherlands", code: "NL", dialCode: "+31", currency: "EUR", currencySymbol: "€" },
  { name: "South Korea", code: "KR", dialCode: "+82", currency: "KRW", currencySymbol: "₩" },
  { name: "Japan", code: "JP", dialCode: "+81", currency: "JPY", currencySymbol: "¥" },
  { name: "Mexico", code: "MX", dialCode: "+52", currency: "MXN", currencySymbol: "MX$" },
  { name: "Indonesia", code: "ID", dialCode: "+62", currency: "IDR", currencySymbol: "Rp" },
  { name: "Zambia", code: "ZM", dialCode: "+260", currency: "ZMW", currencySymbol: "ZK" },
  { name: "Zimbabwe", code: "ZW", dialCode: "+263", currency: "ZWL", currencySymbol: "Z$" },
  { name: "Malawi", code: "MW", dialCode: "+265", currency: "MWK", currencySymbol: "MK" },
  { name: "Mozambique", code: "MZ", dialCode: "+258", currency: "MZN", currencySymbol: "MT" },
  { name: "Cameroon", code: "CM", dialCode: "+237", currency: "XAF", currencySymbol: "FCFA" },
  { name: "Democratic Republic of Congo", code: "CD", dialCode: "+243", currency: "CDF", currencySymbol: "FC" },
  { name: "Botswana", code: "BW", dialCode: "+267", currency: "BWP", currencySymbol: "P" },
  { name: "Namibia", code: "NA", dialCode: "+264", currency: "NAD", currencySymbol: "N$" },
];

export const getCountryByCode = (code: string) =>
  countries.find((c) => c.code === code);

export const getCurrencyByCountry = (countryName: string) => {
  const country = countries.find((c) => c.name === countryName);
  return country ? country.currency : "USD";
};
