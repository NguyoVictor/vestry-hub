import { useChurch } from "@/contexts/ChurchContext";
import { formatCurrencyFull } from "@/lib/format";
import { cn } from "@/lib/utils";

interface CurrencyDisplayProps {
  amount: number;
  currency?: string;
  size?: "sm" | "md" | "lg";
  colorize?: boolean;
  className?: string;
}

const sizeClasses = { sm: "text-sm", md: "text-base", lg: "text-2xl font-bold" };

export const CurrencyDisplay = ({ amount, currency, size = "md", colorize = false, className }: CurrencyDisplayProps) => {
  const { currency: churchCurrency } = useChurch();
  const cur = currency || churchCurrency || "KES";
  return (
    <span className={cn(sizeClasses[size], colorize && amount < 0 && "text-destructive", colorize && amount > 0 && "text-emerald-600", className)}>
      {formatCurrencyFull(amount, cur)}
    </span>
  );
};
