// T16 — per-area access for a custom role (permission template).
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROLE_AREAS, type RoleLevel, type RolePermissions } from "@/lib/rolePermissions";

export function RolePermissionGrid({ value, onChange }: { value: RolePermissions; onChange: (v: RolePermissions) => void }) {
  return (
    <div className="space-y-2" data-testid="role-permission-grid">
      <p className="text-xs text-slate-500">
        “Not set” leaves the person's normal access. If someone holds several roles, the most generous setting for an area applies.
      </p>
      <div className="divide-y rounded-lg border border-slate-200">
        {ROLE_AREAS.map(a => (
          <div key={a.key} className="flex items-center justify-between gap-3 px-3 py-2">
            <span className="text-sm text-slate-700">{a.label}</span>
            <Select value={value[a.key] ?? "unset"}
              onValueChange={v => {
                const next = { ...value };
                if (v === "unset") delete next[a.key]; else next[a.key] = v as RoleLevel;
                onChange(next);
              }}>
              <SelectTrigger className="h-8 w-36" aria-label={`${a.label} access`}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unset">Not set</SelectItem>
                <SelectItem value="full_access">Full access</SelectItem>
                <SelectItem value="read_only">Read-only</SelectItem>
                <SelectItem value="none">No access</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}
