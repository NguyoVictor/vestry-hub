import { useState, useMemo } from "react";
import { Search, CheckSquare, XSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { MemberAvatar } from "@/components/shared/MemberAvatar";
import { Progress } from "@/components/ui/progress";

interface Member {
  id: string;
  first_name?: string;
  last_name?: string;
}

interface AttendanceChecklistProps {
  members: Member[];
  attendance: Record<string, boolean>;
  onToggle: (memberId: string, present: boolean) => void;
  readOnly?: boolean;
}

export function AttendanceChecklist({ members, attendance, onToggle, readOnly = false }: AttendanceChecklistProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return members;
    const q = search.toLowerCase();
    return members.filter(m => {
      const name = `${m.first_name || ""} ${m.last_name || ""}`.toLowerCase();
      return name.includes(q);
    });
  }, [members, search]);

  const presentCount = Object.values(attendance).filter(Boolean).length;
  const total = members.length;
  const pct = total > 0 ? Math.round((presentCount / total) * 100) : 0;

  const markAll = (present: boolean) => {
    members.forEach(m => onToggle(m.id, present));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm font-medium text-foreground">
          {presentCount} / {total} present ({pct}%)
        </div>
        {!readOnly && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => markAll(true)}>
              <CheckSquare className="h-3.5 w-3.5 mr-1" />
              All Present
            </Button>
            <Button variant="outline" size="sm" onClick={() => markAll(false)}>
              <XSquare className="h-3.5 w-3.5 mr-1" />
              Clear
            </Button>
          </div>
        )}
      </div>
      <Progress value={pct} className="h-2" />
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search members..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>
      <div className="max-h-[400px] overflow-y-auto space-y-1 border rounded-md p-2">
        {filtered.map(member => {
          const name = `${member.first_name || ""} ${member.last_name || ""}`.trim();
          const isPresent = attendance[member.id] ?? false;
          return (
            <label
              key={member.id}
              className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                isPresent ? "bg-emerald-50 dark:bg-emerald-950/30" : "hover:bg-muted"
              } ${readOnly ? "cursor-default" : ""}`}
            >
              <Checkbox
                checked={isPresent}
                onCheckedChange={(c) => !readOnly && onToggle(member.id, !!c)}
                disabled={readOnly}
              />
              <MemberAvatar name={name} size="sm" />
              <span className="text-sm font-medium text-foreground">{name || "Unknown"}</span>
            </label>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-6 text-sm text-muted-foreground">No members found</div>
        )}
      </div>
    </div>
  );
}
