import { ClipboardCheck } from "lucide-react";

interface ResourceTypeCardProps {
  icon: string;
  title: string;
  subtitle: string;
  color: "emerald" | "orange" | "pink" | "blue" | "purple";
  onClick?: () => void;
  disabled?: boolean;
}

const COLOR_MAP: Record<string, string> = {
  emerald: "bg-emerald-500",
  orange:  "bg-orange-500",
  pink:    "bg-pink-500",
  blue:    "bg-blue-500",
  purple:  "bg-purple-500",
};

export default function ResourceTypeCard({ icon, title, subtitle, color, onClick, disabled }: ResourceTypeCardProps) {
  const bgClass = COLOR_MAP[color] || "bg-slate-500";

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`
        flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-slate-200 dark:border-slate-700
        bg-white dark:bg-slate-800 text-center transition-all
        ${disabled
          ? "opacity-40 cursor-not-allowed"
          : "hover:border-indigo-400 hover:shadow-md hover:scale-105 cursor-pointer"
        }
      `}
    >
      {/* Icon bubble */}
      <div className={`${bgClass} h-16 w-16 rounded-2xl flex items-center justify-center shadow-md`}>
        <ClipboardCheck className="h-8 w-8 text-white" />
      </div>
      <div>
        <p className="font-semibold text-slate-800 dark:text-slate-100">{title}</p>
        <p className="text-xs text-slate-500 mt-0.5 leading-snug">{subtitle}</p>
      </div>
    </button>
  );
}
