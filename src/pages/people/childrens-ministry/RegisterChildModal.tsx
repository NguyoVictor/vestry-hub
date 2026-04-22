import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES } from "@/lib/schema";
import { toast } from "sonner";
import { calcAge, suggestClass } from "./types";
import type { ChildClass } from "./types";
import { Loader2, Baby } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function RegisterChildModal({ open, onClose, onSuccess }: Props) {
  const { tenantId } = useChurch();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    first_name: "", last_name: "", date_of_birth: "", gender: "",
    class_id: "", guardian_primary_id: "", guardian_secondary_id: "",
    special_needs_notes: "", active: true,
  });
  const [ageDisplay, setAgeDisplay] = useState("");

  const { data: classes = [] } = useQuery<ChildClass[]>({
    queryKey: ["children-classes", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.CHILDREN_CLASSES).select("*").eq("tenant_id", tenantId!).eq("active", true).order("min_age");
      return (data ?? []) as ChildClass[];
    },
    enabled: !!tenantId && open,
    staleTime: 300_000,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["members-search", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.MEMBERS).select("id, first_name, last_name").eq("tenant_id", tenantId!).eq("status", "active").order("first_name").limit(200);
      return data ?? [];
    },
    enabled: !!tenantId && open,
    staleTime: 300_000,
  });

  // Auto-calculate age and suggest class when DOB changes
  useEffect(() => {
    if (!form.date_of_birth) { setAgeDisplay(""); return; }
    const age = calcAge(form.date_of_birth);
    const months = Math.floor((new Date().getTime() - new Date(form.date_of_birth).getTime()) / (1000 * 60 * 60 * 24 * 30.44));
    if (age < 1) setAgeDisplay(`${months} months`);
    else setAgeDisplay(`${age} year${age !== 1 ? "s" : ""}`);
    // Auto-suggest class
    const suggested = suggestClass(age, classes);
    if (suggested && !form.class_id) setForm(f => ({ ...f, class_id: suggested.id }));
  }, [form.date_of_birth, classes]);

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from(TABLES.CHILDREN).insert({
        tenant_id: tenantId!,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        date_of_birth: form.date_of_birth,
        gender: form.gender || null,
        class_id: form.class_id || null,
        guardian_primary_id: form.guardian_primary_id || null,
        guardian_secondary_id: form.guardian_secondary_id || null,
        special_needs_notes: form.special_needs_notes.trim() || null,
        active: form.active,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cm-stats"] });
      qc.invalidateQueries({ queryKey: ["children-list"] });
      toast.success(`${form.first_name} ${form.last_name} registered successfully`);
      setForm({ first_name: "", last_name: "", date_of_birth: "", gender: "", class_id: "", guardian_primary_id: "", guardian_secondary_id: "", special_needs_notes: "", active: true });
      onSuccess?.();
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const valid = form.first_name && form.last_name && form.date_of_birth;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto font-jakarta rounded-2xl p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Baby className="h-5 w-5 text-orange-500" />Register Child
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">First Name *</Label>
              <Input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} className="h-10 border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 text-sm" placeholder="First name" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Last Name *</Label>
              <Input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} className="h-10 border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 text-sm" placeholder="Last name" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Date of Birth *</Label>
              <Input type="date" value={form.date_of_birth} onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} className="h-10 border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 text-sm" />
              {ageDisplay && <p className="text-xs text-orange-600 font-medium">Age: {ageDisplay}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Gender</Label>
              <Select value={form.gender || undefined} onValueChange={v => setForm(f => ({ ...f, gender: v }))}>
                <SelectTrigger className="h-10 border-slate-200 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Class *</Label>
            <Select value={form.class_id || undefined} onValueChange={v => setForm(f => ({ ...f, class_id: v }))}>
              <SelectTrigger className="h-10 border-slate-200 text-sm"><SelectValue placeholder="Select class" /></SelectTrigger>
              <SelectContent>
                {classes.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name} (Ages {c.min_age}–{c.max_age})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Primary Guardian *</Label>
            <Select value={form.guardian_primary_id || undefined} onValueChange={v => setForm(f => ({ ...f, guardian_primary_id: v }))}>
              <SelectTrigger className="h-10 border-slate-200 text-sm"><SelectValue placeholder="Search members..." /></SelectTrigger>
              <SelectContent>
                {members.map((m: any) => (
                  <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Secondary Guardian <span className="text-slate-400">(optional)</span></Label>
            <Select value={form.guardian_secondary_id || undefined} onValueChange={v => setForm(f => ({ ...f, guardian_secondary_id: v }))}>
              <SelectTrigger className="h-10 border-slate-200 text-sm"><SelectValue placeholder="Select (optional)" /></SelectTrigger>
              <SelectContent>
                {members.map((m: any) => (
                  <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Special Needs / Notes <span className="text-slate-400">(internal only)</span></Label>
            <Textarea value={form.special_needs_notes} onChange={e => setForm(f => ({ ...f, special_needs_notes: e.target.value }))} rows={3} placeholder="Any notes for ministry staff..." className="border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 text-sm resize-none" />
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} />
            <Label className="text-sm text-slate-700">Active</Label>
          </div>
        </div>

        <div className="px-6 pb-6 pt-4 border-t border-slate-100 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} className="border-slate-200">Cancel</Button>
          <Button className="bg-orange-500 hover:bg-orange-600 text-white font-semibold" disabled={!valid || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Registering...</> : "Register Child"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
