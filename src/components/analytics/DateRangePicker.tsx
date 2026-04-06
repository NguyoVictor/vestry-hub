import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear, subYears } from "date-fns";

export interface DateRange { from: Date; to: Date; }

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  presets?: boolean;
}

const PRESETS = [
  { label: "This Week", fn: () => ({ from: subDays(new Date(), 6), to: new Date() }) },
  { label: "This Month", fn: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
  { label: "Last Month", fn: () => { const d = subMonths(new Date(), 1); return { from: startOfMonth(d), to: endOfMonth(d) }; } },
  { label: "Last 3 Months", fn: () => ({ from: subMonths(new Date(), 3), to: new Date() }) },
  { label: "Last 6 Months", fn: () => ({ from: subMonths(new Date(), 6), to: new Date() }) },
  { label: "This Year", fn: () => ({ from: startOfYear(new Date()), to: new Date() }) },
  { label: "Last Year", fn: () => { const d = subYears(new Date(), 1); return { from: startOfYear(d), to: endOfYear(d) }; } },
  { label: "All Time", fn: () => ({ from: new Date("2020-01-01"), to: new Date() }) },
];

export function DateRangePicker({ value, onChange, presets }: DateRangePickerProps) {
  return (
    <div className="space-y-2">
      {presets && (
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => onChange(p.fn())}
              className="px-2.5 py-1 text-xs rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <Label className="text-xs text-muted-foreground shrink-0">From</Label>
          <Input
            type="date"
            value={format(value.from, "yyyy-MM-dd")}
            onChange={e => onChange({ ...value, from: new Date(e.target.value) })}
            className="h-8 text-sm w-36"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Label className="text-xs text-muted-foreground shrink-0">To</Label>
          <Input
            type="date"
            value={format(value.to, "yyyy-MM-dd")}
            onChange={e => onChange({ ...value, to: new Date(e.target.value) })}
            className="h-8 text-sm w-36"
          />
        </div>
      </div>
    </div>
  );
}
