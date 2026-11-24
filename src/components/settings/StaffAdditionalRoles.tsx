// T5 — additional roles for a staff member (built-in non-admin roles and
// custom roles). Each tick saves immediately; the database only lets church
// admins assign roles and refuses admin roles here (admin stays the main role).
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { toUserFacingError } from "@/lib/userFacingError";

interface Assignment { id: string; role: string | null; custom_role_id: string | null }
interface Props {
  tenantId: string;
  userId: string;
  mainRole: string;
  builtInOptions: ReadonlyArray<{ value: string; label: string }>;
}

const NOT_ASSIGNABLE = new Set(["super_admin", "church_admin", "member", "guest"]);

export function StaffAdditionalRoles({ tenantId, userId, mainRole, builtInOptions }: Props) {
  const qc = useQueryClient();
  const key = ["staff-role-assignments", tenantId, userId];
  // Show the tick immediately; revert if the server refuses.
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const { data: assignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from("staff_role_assignments")
        .select("id, role, custom_role_id").eq("tenant_id", tenantId).eq("user_id", userId);
      if (error) throw error;
      return (data ?? []) as Assignment[];
    },
  });
  const { data: customRoles = [] } = useQuery({
    queryKey: ["custom-roles-full", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("custom_roles")
        .select("id, name, description, permissions").eq("tenant_id", tenantId).eq("is_active", true).order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const toggle = useMutation({
    onMutate: (v: { role?: string; customRoleId?: string; on: boolean }) =>
      setPending(p => ({ ...p, [v.role ? `r:${v.role}` : `c:${v.customRoleId}`]: v.on })),
    mutationFn: async (v: { role?: string; customRoleId?: string; on: boolean }) => {
      if (v.on) {
        const { error } = await supabase.from("staff_role_assignments").insert({
          tenant_id: tenantId, user_id: userId, role: v.role ?? null, custom_role_id: v.customRoleId ?? null,
        });
        if (error) throw error;
      } else {
        const existing = assignments.find(a => (v.role ? a.role === v.role : a.custom_role_id === v.customRoleId));
        if (!existing) return;
        const { data, error } = await supabase.from("staff_role_assignments").delete().eq("id", existing.id).select("id");
        if (error) throw error;
        if (!data?.length) throw new Error("The role was not removed (no permission).");
      }
    },
    onSettled: async (_d, _e, v) => {
      await qc.invalidateQueries({ queryKey: key });
      setPending(p => { const n = { ...p }; delete n[v.role ? `r:${v.role}` : `c:${v.customRoleId}`]; return n; });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff-role-assignments-all", tenantId] });
      toast.success("Roles updated");
    },
    onError: (e: Error) => toast.error(toUserFacingError(e, e.message)),
  });

  const builtIns = builtInOptions.filter(o => !NOT_ASSIGNABLE.has(o.value) && o.value !== mainRole);
  const hasRole = (role: string) => pending[`r:${role}`] ?? assignments.some(a => a.role === role);
  const hasCustom = (id: string) => pending[`c:${id}`] ?? assignments.some(a => a.custom_role_id === id);

  return (
    <div className="space-y-1.5" data-testid="additional-roles">
      <Label className="text-sm font-medium">Additional roles</Label>
      <p className="text-xs text-slate-500">A person can hold several roles. Custom roles set access per area; the most generous one applies.</p>
      <div className="rounded-lg border border-slate-200 p-3 space-y-3">
        {customRoles.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Custom roles</p>
            {customRoles.map(r => (
              <label key={r.id} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="accent-orange-500" checked={hasCustom(r.id)} disabled={toggle.isPending || loadingAssignments}
                  onChange={e => toggle.mutate({ customRoleId: r.id, on: e.target.checked })} aria-label={`Custom role ${r.name}`} />
                <span className="text-sm text-slate-700">{r.name}</span>
              </label>
            ))}
          </div>
        )}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Built-in roles</p>
          <div className="grid grid-cols-2 gap-1.5">
            {builtIns.map(o => (
              <label key={o.value} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="accent-orange-500" checked={hasRole(o.value)} disabled={toggle.isPending || loadingAssignments}
                  onChange={e => toggle.mutate({ role: o.value, on: e.target.checked })} aria-label={`Role ${o.label}`} />
                <span className="text-sm text-slate-700">{o.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
