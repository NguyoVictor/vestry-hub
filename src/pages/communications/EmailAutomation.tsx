import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES } from "@/lib/schema";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Settings, Plus, Save, UserPlus, Bell, Gift, Calendar, Heart, Clock, User, MoreVertical, Pencil, Trash2, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// ── Types ─────────────────────────────────────────────────────────────────────
interface EmailAutomation {
  id: string;
  tenant_id: string;
  automation_key: string;
  is_active: boolean;
  template_id: string | null;
  config: Record<string, any>;
  is_system: boolean;
  name: string | null;
  description: string | null;
  frequency: string | null;
  audience: string | null;
}

interface EmailTemplate { id: string; name: string; }

// ── System automation definitions ─────────────────────────────────────────────
const SYSTEM_AUTOMATIONS = [
  { key: "visitor_welcome", name: "Visitor Welcome", icon: UserPlus, iconColor: "text-purple-500 bg-purple-50", description: "Sent immediately when a new visitor registers", frequency: "Immediately", audience: "All Visitors", defaultActive: true, configFields: [] },
  { key: "visitor_service_reminders", name: "Visitor Service Reminders", icon: Bell, iconColor: "text-orange-500 bg-orange-50", description: "Weekly reminders to new visitors about upcoming services", frequency: "Weekly", audience: "New Visitors", defaultActive: true, configFields: [{ key: "duration_weeks", label: "Duration (weeks)", type: "number", default: 4 }] },
  { key: "birthday_greetings", name: "Birthday Greetings", icon: Gift, iconColor: "text-pink-500 bg-pink-50", description: "Sent on member birthdays", frequency: "Daily", audience: "Members Only", defaultActive: true, configFields: [{ key: "audience", label: "Audience", type: "select", options: ["Members Only", "Members & Visitors", "All"], default: "Members Only" }] },
  { key: "event_reminders", name: "Event Reminders", icon: Calendar, iconColor: "text-red-500 bg-red-50", description: "Reminders sent before registered events", frequency: "1 day before", audience: "Registered Attendees", defaultActive: true, configFields: [{ key: "frequency", label: "Frequency", type: "select", options: ["1 day before", "2 days before", "3 days before", "1 week before"], default: "1 day before" }] },
  { key: "new_convert_milestones", name: "New Convert Milestones", icon: Heart, iconColor: "text-red-500 bg-red-50", description: "Congratulations on discipleship milestones", frequency: "Immediately", audience: "New Converts", defaultActive: true, configFields: [] },
  { key: "task_reminders", name: "Task Reminders", icon: Clock, iconColor: "text-orange-500 bg-orange-50", description: "Daily reminders for pending follow-up tasks", frequency: "Daily", audience: "Assigned Workers", defaultActive: true, configFields: [] },
  { key: "ministerial_assignment_reminders", name: "Ministerial Assignment Reminders", icon: User, iconColor: "text-purple-500 bg-purple-50", description: "Reminders sent to ministers before their scheduled events", frequency: "1 day before", audience: "Assigned Ministers", defaultActive: true, configFields: [{ key: "frequency", label: "Frequency", type: "select", options: ["1 day before", "2 days before", "3 days before", "1 week before"], default: "1 day before" }] },
];

const FREQUENCY_OPTIONS = ["Immediately", "Daily", "Weekly", "Monthly", "1 day before event", "2 days before event", "1 week before event", "Custom interval"];
const AUDIENCE_OPTIONS = ["All Visitors", "New Visitors", "All (Members & Visitors)", "Registered Attendees", "New Converts", "Assigned Workers", "Assigned Ministers", "All Workers", "Group Leaders", "Donors", "Pledge Makers", "Counselling Requesters", "Service Requesters", "Group Members", "New Members", "Baptized Members", "Married Members"];

// ── Create/Edit Custom Modal ──────────────────────────────────────────────────
function CustomAutomationModal({ open, onClose, tenantId, editData, onSuccess }: { open: boolean; onClose: () => void; tenantId: string; editData?: EmailAutomation | null; onSuccess: () => void }) {
  const isEdit = !!editData;
  const [name, setName] = useState(editData?.name ?? "");
  const [description, setDescription] = useState(editData?.description ?? "");
  const [frequency, setFrequency] = useState(editData?.frequency ?? "Daily");
  const [audience, setAudience] = useState(editData?.audience ?? "Members Only");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("Email name is required."); return; }
    setSubmitting(true);
    try {
      const payload = {
        tenant_id: tenantId,
        automation_key: isEdit ? editData.automation_key : `custom_${Date.now()}`,
        name: name.trim(),
        description: description.trim() || null,
        frequency,
        audience,
        is_system: false,
        is_active: false,
        config: {},
      };
      if (isEdit) {
        const { error } = await supabase.from(TABLES.EMAIL_AUTOMATIONS).update(payload as any).eq("id", editData.id);
        if (error) throw error;
        toast.success("✅ Custom email type updated.");
      } else {
        const { error } = await supabase.from(TABLES.EMAIL_AUTOMATIONS).insert(payload as any);
        if (error) throw error;
        toast.success("✅ Custom email type created.");
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Failed to save.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50">
              <Sparkles className="h-4 w-4 text-orange-500" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">{isEdit ? "Edit Custom Email Type" : "Create Custom Email Type"}</DialogTitle>
              <p className="text-xs text-slate-400 mt-0.5">Create a new automated email type tailored to your church's needs.</p>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Email Name <span className="text-red-500">*</span></Label>
            <Input placeholder="e.g., Monthly Newsletter, Prayer Request Follow-up" value={name} onChange={e => setName(e.target.value)} className="focus:ring-orange-400 focus:border-orange-400" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Description</Label>
            <Textarea placeholder="Describe when this email should be sent..." value={description} onChange={e => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FREQUENCY_OPTIONS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Audience</Label>
              <Select value={audience} onValueChange={setAudience}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{AUDIENCE_OPTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button className="bg-orange-500 hover:bg-orange-600 text-white gap-1.5" onClick={handleSubmit} disabled={submitting}>
            <Plus className="h-4 w-4" />
            {submitting ? "Saving..." : isEdit ? "Update Email Type" : "Create Email Type"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Automation Card ───────────────────────────────────────────────────────────
function AutomationCard({ automation, templates, isSystem, onToggle, onConfigChange, onEdit, onDelete }: {
  automation: EmailAutomation;
  templates: EmailTemplate[];
  isSystem: boolean;
  onToggle: (id: string, active: boolean) => void;
  onConfigChange: (id: string, key: string, value: any) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const systemDef = SYSTEM_AUTOMATIONS.find(s => s.key === automation.automation_key);
  const Icon = systemDef?.icon ?? Sparkles;
  const iconColor = systemDef?.iconColor ?? "text-orange-500 bg-orange-50";
  const name = automation.name ?? systemDef?.name ?? "Automation";
  const description = automation.description ?? systemDef?.description ?? "";
  const frequency = automation.frequency ?? systemDef?.frequency ?? "Daily";
  const audience = automation.audience ?? systemDef?.audience ?? "All";
  const configFields = systemDef?.configFields ?? [];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-3 mb-2">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg shrink-0 ${iconColor}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{name}</p>
              {automation.is_active && <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">Active</span>}
            </div>
            <p className="text-xs text-slate-500">{description}</p>
          </div>
        </div>

        {/* Config fields */}
        <div className="space-y-3 mt-3">
          {configFields.map(field => (
            <div key={field.key} className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">{field.label}</Label>
                {field.type === "number" ? (
                  <Input
                    type="number"
                    value={automation.config[field.key] ?? field.default}
                    onChange={e => onConfigChange(automation.id, field.key, parseInt(e.target.value) || field.default)}
                    className="h-8 text-sm"
                  />
                ) : field.type === "select" ? (
                  <Select
                    value={automation.config[field.key] ?? field.default}
                    onValueChange={v => onConfigChange(automation.id, field.key, v)}
                  >
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{field.options!.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                  </Select>
                ) : null}
              </div>
            </div>
          ))}

          {/* Template dropdown */}
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">📧 Custom Template</Label>
            <Select
              value={automation.template_id ?? ""}
              onValueChange={v => onConfigChange(automation.id, "template_id", v || null)}
            >
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select a template..." /></SelectTrigger>
              <SelectContent>
                {templates.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-slate-400">No templates available — create one in Email Templates tab</div>
                ) : templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Trigger pills */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-700 px-2.5 py-1 text-[10px] font-medium text-slate-600 dark:text-slate-300">
            🕐 {frequency}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-700 px-2.5 py-1 text-[10px] font-medium text-slate-600 dark:text-slate-300">
            👥 {audience}
          </span>
        </div>
      </div>

      {/* Right side: toggle + menu */}
      <div className="flex items-center gap-2 shrink-0">
        <Switch
          checked={automation.is_active}
          onCheckedChange={v => onToggle(automation.id, v)}
          className="data-[state=checked]:bg-orange-500"
        />
        {!isSystem && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="gap-2 cursor-pointer" onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5" />Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 cursor-pointer text-red-500 focus:text-red-500" onClick={onDelete}>
                <Trash2 className="h-3.5 w-3.5" />Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

// ── Main EmailAutomation component ────────────────────────────────────────────
export function EmailAutomation() {
  const { tenantId } = useChurch();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editAutomation, setEditAutomation] = useState<EmailAutomation | null>(null);
  const [deleteAutomation, setDeleteAutomation] = useState<EmailAutomation | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Map<string, Partial<EmailAutomation>>>(new Map());
  const [saving, setSaving] = useState(false);

  const { data: automations = [], isLoading } = useQuery<EmailAutomation[]>({
    queryKey: ["email-automations", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.EMAIL_AUTOMATIONS).select("*").eq("tenant_id", tenantId).order("is_system", { ascending: false });
      const existing = (data ?? []) as EmailAutomation[];

      // Seed system automations if they don't exist yet
      const existingKeys = new Set(existing.map(a => a.automation_key));
      const missing = SYSTEM_AUTOMATIONS.filter(s => !existingKeys.has(s.key));
      if (missing.length > 0) {
        const rows = missing.map(s => ({
          tenant_id: tenantId,
          automation_key: s.key,
          name: s.name,
          description: s.description,
          frequency: s.frequency,
          audience: s.audience,
          is_active: s.defaultActive,
          is_system: true,
          config: {},
        }));
        await supabase.from(TABLES.EMAIL_AUTOMATIONS).insert(rows as any);
        const { data: fresh } = await supabase.from(TABLES.EMAIL_AUTOMATIONS).select("*").eq("tenant_id", tenantId).order("is_system", { ascending: false });
        return (fresh ?? []) as EmailAutomation[];
      }
      return existing;
    },
    staleTime: 300_000,
  });

  const { data: templates = [] } = useQuery<EmailTemplate[]>({
    queryKey: ["email-templates-automation", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.EMAIL_TEMPLATES).select("id, name").eq("tenant_id", tenantId).eq("is_active", true).order("name");
      return (data ?? []) as EmailTemplate[];
    },
    staleTime: 300_000,
  });

  const handleToggle = (id: string, active: boolean) => {
    setPendingChanges(prev => {
      const next = new Map(prev);
      next.set(id, { ...next.get(id), is_active: active });
      return next;
    });
  };

  const handleConfigChange = (id: string, key: string, value: any) => {
    setPendingChanges(prev => {
      const next = new Map(prev);
      const existing = next.get(id) ?? {};
      if (key === "template_id") {
        next.set(id, { ...existing, template_id: value });
      } else {
        next.set(id, { ...existing, config: { ...(existing.config ?? {}), [key]: value } });
      }
      return next;
    });
  };

  const handleSaveChanges = async () => {
    if (pendingChanges.size === 0) { toast.info("No changes to save."); return; }
    setSaving(true);
    try {
      for (const [id, changes] of pendingChanges.entries()) {
        const { error } = await supabase.from(TABLES.EMAIL_AUTOMATIONS).update(changes as any).eq("id", id);
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ["email-automations", tenantId] });
      setPendingChanges(new Map());
      toast.success("✅ Automation settings saved.");
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLES.EMAIL_AUTOMATIONS).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-automations", tenantId] });
      setDeleteAutomation(null);
      toast.success("Custom email type deleted.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const systemAutomations = automations.filter(a => a.is_system);
  const customAutomations = automations.filter(a => !a.is_system);

  // Merge pending changes into displayed automations so UI is instant
  const mergedAutomations = automations.map(a => {
    const pending = pendingChanges.get(a.id);
    if (!pending) return a;
    return {
      ...a,
      is_active: pending.is_active ?? a.is_active,
      template_id: pending.template_id !== undefined ? pending.template_id : a.template_id,
      config: { ...a.config, ...(pending.config ?? {}) },
    };
  });

  const systemAutomationsMerged = mergedAutomations.filter(a => a.is_system);
  const customAutomationsMerged = mergedAutomations.filter(a => !a.is_system);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 shrink-0">
            <Settings className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Email Automation Settings</h2>
            <p className="text-xs text-slate-500">Configure automated emails for your church</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Create Custom Email
          </Button>
          <Button
            size="sm"
            className="bg-orange-500 hover:bg-orange-600 text-white gap-1.5"
            onClick={handleSaveChanges}
            disabled={saving || pendingChanges.size === 0}
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "💾 Save Changes"}
          </Button>
        </div>
      </div>

      {/* System Email Types */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">System Email Types</p>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
        ) : (
          <div className="space-y-4">
            {systemAutomationsMerged.map(auto => (
              <AutomationCard
                key={auto.id}
                automation={auto}
                templates={templates}
                isSystem
                onToggle={handleToggle}
                onConfigChange={handleConfigChange}
              />
            ))}
          </div>
        )}
      </div>

      {/* Custom Email Types */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Custom Email Types</p>
        {customAutomationsMerged.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-12 text-center">
            <p className="text-sm text-slate-400">No custom email types yet. Click '+ Create Custom Email' to add one.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {customAutomationsMerged.map(auto => (
              <AutomationCard
                key={auto.id}
                automation={auto}
                templates={templates}
                isSystem={false}
                onToggle={handleToggle}
                onConfigChange={handleConfigChange}
                onEdit={() => setEditAutomation(auto)}
                onDelete={() => setDeleteAutomation(auto)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <CustomAutomationModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        tenantId={tenantId}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["email-automations", tenantId] })}
      />
      <CustomAutomationModal
        open={!!editAutomation}
        onClose={() => setEditAutomation(null)}
        tenantId={tenantId}
        editData={editAutomation}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["email-automations", tenantId] })}
      />

      <AlertDialog open={!!deleteAutomation} onOpenChange={v => !v && setDeleteAutomation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this custom email type?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={() => deleteAutomation && deleteMutation.mutate(deleteAutomation.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
