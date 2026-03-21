import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";

interface TimeSlotValue {
  date: string;
  startTime: string;
  endTime: string;
}

interface TimeSlotPickerProps {
  value: TimeSlotValue;
  onChange: (val: TimeSlotValue) => void;
  conflicts?: { start: string; end: string; name: string }[];
}

function calcDuration(start: string, end: string): string {
  if (!start || !end) return "";
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff <= 0) return "";
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  const parts = [];
  if (hours > 0) parts.push(`${hours} hour${hours > 1 ? "s" : ""}`);
  if (mins > 0) parts.push(`${mins} min${mins > 1 ? "s" : ""}`);
  return parts.join(" ");
}

export function TimeSlotPicker({ value, onChange, conflicts = [] }: TimeSlotPickerProps) {
  const duration = calcDuration(value.startTime, value.endTime);

  const hasConflict = conflicts.some(c => {
    if (!value.startTime || !value.endTime) return false;
    return value.startTime < c.end && value.endTime > c.start;
  });

  return (
    <div className="space-y-3">
      <div>
        <Label>Date</Label>
        <Input type="date" value={value.date} onChange={e => onChange({ ...value, date: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Start Time</Label>
          <Input type="time" value={value.startTime} onChange={e => onChange({ ...value, startTime: e.target.value })} />
        </div>
        <div>
          <Label>End Time</Label>
          <Input type="time" value={value.endTime} onChange={e => onChange({ ...value, endTime: e.target.value })} />
        </div>
      </div>
      {duration && <p className="text-xs text-muted-foreground">Duration: {duration}</p>}
      {hasConflict && (
        <div className="flex items-center gap-2 p-2 rounded-md bg-destructive/10 text-destructive text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>This time slot conflicts with an existing booking.</span>
        </div>
      )}
    </div>
  );
}
