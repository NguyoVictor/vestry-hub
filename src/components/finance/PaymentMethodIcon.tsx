import { Banknote, Building2, FileText, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

const METHOD_CONFIG: Record<string, { icon: typeof Banknote; label: string; color: string }> = {
  cash: { icon: Banknote, label: "Cash", color: "text-emerald-600" },
  mpesa: { icon: Circle, label: "M-Pesa", color: "text-emerald-600" },
  bank_transfer: { icon: Building2, label: "Bank Transfer", color: "text-blue-600" },
  cheque: { icon: FileText, label: "Cheque", color: "text-muted-foreground" },
};

export const PaymentMethodIcon = ({ method, showLabel = true }: { method: string; showLabel?: boolean }) => {
  const config = METHOD_CONFIG[method] || { icon: Circle, label: method || "Other", color: "text-muted-foreground" };
  const Icon = config.icon;
  return (
    <div className="flex items-center gap-1.5">
      {method === "mpesa" ? (
        <div className="h-4 w-4 rounded-full bg-emerald-600 flex items-center justify-center"><span className="text-[8px] font-bold text-white">M</span></div>
      ) : (
        <Icon className={cn("h-4 w-4", config.color)} />
      )}
      {showLabel && <span className="text-sm">{config.label}</span>}
    </div>
  );
};
