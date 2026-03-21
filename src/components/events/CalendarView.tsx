import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const EVENT_COLORS: Record<string, string> = {
  conference: "bg-violet-500",
  outreach: "bg-emerald-500",
  youth: "bg-amber-500",
  womens: "bg-pink-500",
  mens: "bg-blue-500",
  childrens: "bg-orange-500",
  prayer: "bg-indigo-500",
  social: "bg-cyan-500",
  fundraiser: "bg-emerald-600",
  sunday_service: "bg-indigo-500",
  midweek_service: "bg-teal-500",
  prayer_meeting: "bg-purple-500",
  youth_service: "bg-amber-500",
  children_service: "bg-orange-500",
  special_service: "bg-rose-500",
  other: "bg-slate-500",
};

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type?: string;
  startTime?: string;
}

interface CalendarViewProps {
  events: CalendarEvent[];
  onSelectEvent?: (event: CalendarEvent) => void;
  onSelectDate?: (date: Date) => void;
}

export function CalendarView({ events, onSelectEvent, onSelectDate }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const start = startOfWeek(monthStart);
    const end = endOfWeek(monthEnd);
    const result: Date[] = [];
    let d = start;
    while (d <= end) {
      result.push(d);
      d = addDays(d, 1);
    }
    return result;
  }, [currentMonth]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach(ev => {
      const key = ev.date;
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    });
    return map;
  }, [events]);

  const today = new Date();

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-lg text-foreground">{format(currentMonth, "MMMM yyyy")}</h3>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>Today</Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
          <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground border-b bg-muted/30">{d}</div>
        ))}
        {days.map((day, i) => {
          const key = format(day, "yyyy-MM-dd");
          const dayEvents = eventsByDate[key] || [];
          const isToday = isSameDay(day, today);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          return (
            <div
              key={i}
              className={`min-h-[80px] p-1 border-b border-r cursor-pointer transition-colors hover:bg-muted/50 ${
                !isCurrentMonth ? "bg-muted/20" : ""
              }`}
              onClick={() => onSelectDate?.(day)}
            >
              <div className={`text-xs font-medium mb-0.5 w-6 h-6 flex items-center justify-center rounded-full ${
                isToday ? "bg-primary text-primary-foreground" : isCurrentMonth ? "text-foreground" : "text-muted-foreground"
              }`}>
                {format(day, "d")}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map(ev => {
                  const color = EVENT_COLORS[(ev.type as string) || "other"] || EVENT_COLORS.other;
                  return (
                    <div
                      key={ev.id}
                      className={`${color} text-white text-[10px] rounded px-1 py-0.5 truncate cursor-pointer`}
                      onClick={(e) => { e.stopPropagation(); onSelectEvent?.(ev); }}
                    >
                      {ev.startTime ? `${ev.startTime.slice(0, 5)} ` : ""}{ev.title}
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <Badge variant="secondary" className="text-[9px] h-4">+{dayEvents.length - 3} more</Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
