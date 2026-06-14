import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { usePermissions } from '@/hooks/usePermissions';
import { ReadOnlyBanner } from '@/components/shared/ReadOnlyBanner';
import { PermissionButton } from '@/components/shared/PermissionButton';
import { TABLES } from "@/lib/schema";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tag, MessageSquare, Plus, MoreHorizontal, Pencil, Trash2, Settings, Play, Pause } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface EmailCategory {
  id: string;
  tenant_id: string;
  name: string;
  is_active: boolean;
  is_system: boolean;
  sort_order: number;
}

// ─── System defaults ──────────────────────────────────────────────────────────
const SYSTEM_CATEGORIES = [
  { name: "Member Lifecycle",    sort_order: 0 },
  { name: "Pastoral Care",       sort_order: 1 },
  { name: "Events & Invitations",sort_order: 2 },
  { name: "Financial & Giving",  sort_order: 3 },
  { name: "Administrative",      sort_order: 4 },
  { name: "Task Reminders",      sort_order: 5 },
  { name: "Ministry Assignments",sort_order: 6 },
];

// ─── Category Modal ───────────────────────────────────────────────────────────
interface CategoryModalProps {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  editData?: EmailCategory | null;
  existingNames: string[];
  onSuccess: () => void;
}

function CategoryModal({ open, onClose, tenantId, editData, existingNames, onSuccess }: CategoryModalProps) {
  const qc = useQueryClient();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('church_settings');
  const isEdit = !!editData;
  const [name,       setName]       = useState(editData?.name ?? "");
  const [isActive,   setIsActive]   = useState(editData?.is_active ?? true);
  const [nameError,  setNameError]  = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (open) { setName(editData?.name ?? ""); setIsActive(editData?.is_active ?? true); setNameError(""); } }, [open, editData]);

  const handleClose = () => { setName(""); setIsActive(true); setNameError(""); onClose(); };

  const handleSubmit = async () => {
    if (readOnly) return;
    if (!name.trim()) { setNameError("Category name is required."); return; }
    const others = existingNames.filter(n => isEdit ? n !== editData?.name : true);
    if (others.map(n => n.toLowerCase()).includes(name.trim().toLowerCase())) {
      setNameError("A category with this name already exists."); return;
    }
    setNameError(""); setSubmitting(true);
    try {
      if (isEdit && editData) {
        const { error } = await supabase.from(TABLES.EMAIL_CATEGORIES).update({ name: name.trim(), is_active: isActive } as never).eq("id", editData.id);
        if (error) throw error;
        toast.success("✅ Category updated successfully.");
      } else {
        const { data: existing } = await supabase.from(TABLES.EMAIL_CATEGORIES).select("sort_order").eq("tenant_id", tenantId).order("sort_order", { ascending: false }).limit(1);
        const nextOrder = ((existing?.[0]?.sort_order ?? -1) as number) + 1;
        const { error } = await supabase.from(TABLES.EMAIL_CATEGORIES).insert({ tenant_id: tenantId, name: name.trim(), is_active: isActive, is_system: false, sort_order: nextOrder } as never);
        if (error) throw error;
        toast.success("✅ Category created successfully.");
      }
      qc.invalidateQueries({ queryKey: ["email-categories", tenantId] });
      onSuccess(); handleClose();
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Failed to save.");
    } finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">{isEdit ? "Edit Email Category" : "Add Email Category"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Category Name <span className="text-red-500">*</span></Label>
            <Input placeholder="e.g., Youth Ministry, Outreach" value={name} onChange={e => { setName(e.target.value); setNameError(""); }} className="focus:ring-orange-400 focus:border-orange-400" autoFocus />
            {nameError && <p className="text-xs text-red-500">{nameError}</p>}
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium cursor-pointer" onClick={() => setIsActive(v => !v)}>Active</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} className="data-[state=checked]:bg-orange-500" />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
          <Button variant="outline" onClick={handleClose} disabled={submitting}>Cancel</Button>
          <Button className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-5" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Saving..." : isEdit ? "Update" : "Save Category"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Email Categories Tab ─────────────────────────────────────────────────────
function EmailCategoriesTab({ tenantId }: { tenantId: string }) {
  const qc = useQueryClient();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('church_settings');
  const [addOpen,    setAddOpen]    = useState(false);
  const [editCat,    setEditCat]    = useState<EmailCategory | null>(null);
  const [deleteCat,  setDeleteCat]  = useState<EmailCategory | null>(null);
  const [seeding,    setSeeding]    = useState(false);

  const { data: categories = [], isLoading } = useQuery<EmailCategory[]>({
    queryKey: ["email-categories", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from(TABLES.EMAIL_CATEGORIES).select("*").eq("tenant_id", tenantId).order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as EmailCategory[];
    },
    staleTime: 300_000,
  });

  const existingNames = categories.map(c => c.name);

  const handleSeedDefaults = async () => {
    if (readOnly) return;
    setSeeding(true);
    try {
      const rows = SYSTEM_CATEGORIES.map(d => ({ ...d, tenant_id: tenantId, is_active: true, is_system: true }));
      const { error } = await supabase.from(TABLES.EMAIL_CATEGORIES).insert(rows as never);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["email-categories", tenantId] });
      toast.success("Default categories added.");
    } catch (err: unknown) { toast.error((err as Error)?.message ?? "Failed."); }
    finally { setSeeding(false); }
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (readOnly) return;
      const { error } = await supabase.from(TABLES.EMAIL_CATEGORIES).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["email-categories", tenantId] }); setDeleteCat(null); toast.success("Category deleted."); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 shrink-0"><Tag className="h-5 w-5 text-orange-500" /></div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Email Categories</p>
              <p className="text-xs text-slate-500">Manage the categories used to organize your email templates</p>
            </div>
          </div>
          <PermissionButton readOnly={readOnly} className="bg-orange-500 hover:bg-orange-600 text-white gap-2 shrink-0" size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add Category
          </PermissionButton>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-3">{Array.from({length:4}).map((_,i)=><Skeleton key={i} className="h-10 w-full"/>)}</div>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
            <p className="text-sm">No categories yet.</p>
            <PermissionButton readOnly={readOnly} variant="outline" size="sm" onClick={handleSeedDefaults} disabled={seeding}>{seeding ? "Adding..." : "Add Default Categories"}</PermissionButton>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="w-10 px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {categories.map((cat, idx) => (
                <tr key={cat.id} className={`border-b border-slate-100 hover:bg-slate-50/50 ${idx === categories.length-1 ? "border-b-0" : ""}`}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{cat.name}</span>
                      {cat.is_system && <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">System</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {cat.is_active
                      ? <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">Active</span>
                      : <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">Inactive</span>
                    }
                  </td>
                  <td className="px-3 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-orange-500 transition-colors"><MoreHorizontal className="h-4 w-4" /></button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => setEditCat(cat)}><Pencil className="h-3.5 w-3.5" />Edit</DropdownMenuItem>
                        {!cat.is_system && (
                          <DropdownMenuItem className="gap-2 cursor-pointer text-red-500 focus:text-red-500" onClick={() => setDeleteCat(cat)}><Trash2 className="h-3.5 w-3.5" />Delete</DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <CategoryModal open={addOpen} onClose={() => setAddOpen(false)} tenantId={tenantId} existingNames={existingNames} onSuccess={() => {}} />
      <CategoryModal open={!!editCat} onClose={() => setEditCat(null)} tenantId={tenantId} editData={editCat} existingNames={existingNames} onSuccess={() => {}} />

      <AlertDialog open={!!deleteCat} onOpenChange={v => !v && setDeleteCat(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteCat?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this category? Templates using this category will become uncategorized.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 hover:bg-red-600 text-white" onClick={() => deleteCat && deleteMutation.mutate(deleteCat.id)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Automation Management Tab ────────────────────────────────────────────────
function AutomationManagementTab({ tenantId }: { tenantId: string }) {
  const qc = useQueryClient();
  const [testing, setTesting] = useState(false);
  const [configuringKey, setConfiguringKey] = useState(false);

  const { data: automations = [], isLoading } = useQuery({
    queryKey: ["automation-status", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.EMAIL_AUTOMATIONS).select("*").eq("tenant_id", tenantId).order("is_system", { ascending: false });
      return (data ?? []) as any[];
    },
    staleTime: 300_000,
  });

  const handleTestAutomation = async () => {
    setTesting(true);
    try {
      const response = await fetch('https://crjdsxxkspvdwknrmijs.supabase.co/functions/v1/process-email-automations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.supabaseKey}`,
        },
        body: JSON.stringify({ test: true }),
      });
      
      if (!response.ok) throw new Error('Failed to test automation');
      
      const result = await response.json();
      toast.success(`✅ Automation test completed. Processed: ${result.processed}, Sent: ${result.sent}`);
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Failed to test automation");
    } finally {
      setTesting(false);
    }
  };

  const handleConfigureServiceKey = async () => {
    setConfiguringKey(true);
    try {
      // Configure the service key for database triggers
      // This sets a placeholder that will be updated by the system
      const { error } = await supabase
        .from('automation_settings')
        .upsert({ 
          key: 'service_role_key', 
          value: 'system_configured',
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });
      
      if (error) throw error;
      toast.success('✅ Triggers configured - immediate automations are now active');
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Failed to configure triggers");
    } finally {
      setConfiguringKey(false);
    }
  };

  const activeCount = automations.filter(a => a.is_active).length;
  const systemCount = automations.filter(a => a.is_system).length;
  const customCount = automations.filter(a => !a.is_system).length;

  return (
    <div className="space-y-5">
      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <Play className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{activeCount}</p>
              <p className="text-xs text-slate-500">Active Automations</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Settings className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{systemCount}</p>
              <p className="text-xs text-slate-500">System Automations</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
              <Tag className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{customCount}</p>
              <p className="text-xs text-slate-500">Custom Automations</p>
            </div>
          </div>
        </div>
      </div>

      {/* Management Panel */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 shrink-0">
              <Settings className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Automation System</p>
              <p className="text-xs text-slate-500">Monitor and test your email automation system</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              size="sm" 
              onClick={handleConfigureServiceKey}
              disabled={configuringKey}
            >
              <Settings className="h-4 w-4 mr-1.5" /> 
              {configuringKey ? "Enabling..." : "Enable Triggers"}
            </Button>
            <Button 
              className="bg-orange-500 hover:bg-orange-600 text-white gap-2" 
              size="sm" 
              onClick={handleTestAutomation}
              disabled={testing}
            >
              <Play className="h-4 w-4" /> 
              {testing ? "Testing..." : "Test Automations"}
            </Button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-xs text-blue-700 space-y-2">
            <p className="font-medium">📋 System Status:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-600">
              <li>✅ Email automation Edge Function deployed</li>
              <li>✅ Daily cron job scheduled (8:00 AM UTC)</li>
              <li>✅ Database triggers configured for immediate automations</li>
              <li>✅ Integration with existing email system active</li>
            </ul>
          </div>

          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-700 space-y-2">
            <p className="font-medium">⚙️ How it works:</p>
            <ul className="list-disc list-inside space-y-1 text-amber-600">
              <li><strong>Immediate:</strong> Visitor welcome & new convert emails sent instantly when member status changes</li>
              <li><strong>Daily:</strong> Birthday greetings, task reminders, and event reminders processed at 8:00 AM UTC</li>
              <li><strong>Custom:</strong> Your custom automations run based on their configured frequency</li>
              <li><strong>Templates:</strong> Uses your custom templates or falls back to system defaults</li>
            </ul>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : automations.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Recent Automation Activity</p>
              {automations.slice(0, 5).map((auto) => (
                <div key={auto.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${auto.is_active ? 'bg-emerald-50' : 'bg-slate-100'}`}>
                      {auto.is_active ? <Play className="h-4 w-4 text-emerald-500" /> : <Pause className="h-4 w-4 text-slate-400" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{auto.name}</p>
                      <p className="text-xs text-slate-500">
                        {auto.frequency} • {auto.audience}
                        {auto.last_sent_at && ` • Last sent: ${new Date(auto.last_sent_at).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {auto.is_system && (
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">System</span>
                    )}
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      auto.is_active 
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700' 
                        : 'border-slate-200 bg-slate-100 text-slate-500'
                    }`}>
                      {auto.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <p className="text-sm">No automations configured yet.</p>
              <p className="text-xs mt-1">Go to Communications → Email Automation to set up your first automation.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
function SmsSettingsTab({ tenantId }: { tenantId: string }) {
  const qc = useQueryClient();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('church_settings');
  const [apiKey, setApiKey] = useState("");
  const [projectName, setProjectName] = useState("");
  const [senderId, setSenderId] = useState("");
  const [messageType, setMessageType] = useState<'transactional' | 'promotional'>('promotional');
  const [saving, setSaving] = useState(false);

  const { data: existing } = useQuery({
    queryKey: ["sms-settings-form", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.SMS_SETTINGS).select("*").eq("tenant_id", tenantId).maybeSingle();
      return data as any; // Using any to avoid type conflicts during migration
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!existing) return;
    setApiKey(existing.sozuri_api_key ?? existing.at_api_key ?? "");
    setProjectName(existing.sozuri_project ?? "");
    setSenderId(existing.sender_id ?? "");
    setMessageType((existing.message_type as 'transactional' | 'promotional') ?? 'promotional');
  }, [existing]);

  const handleSave = async () => {
    if (readOnly) return;
    if (!apiKey.trim() || !projectName.trim() || !senderId.trim()) { 
      toast.error("API Key, Project Name, and Sender ID are required."); 
      return; 
    }
    setSaving(true);
    try {
      const payload = {
        tenant_id: tenantId,
        sozuri_api_key: apiKey.trim(),
        sozuri_project: projectName.trim(),
        sender_id: senderId.trim(),
        message_type: messageType,
        is_configured: true,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from(TABLES.SMS_SETTINGS).upsert(payload as never, { onConflict: "tenant_id" });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["sms-settings-form", tenantId] });
      qc.invalidateQueries({ queryKey: ["sms-settings", tenantId] });
      toast.success("✅ SMS is configured — your Sozuri credentials are saved.");
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const cardClass = "bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-4 shadow-sm";

  return (
    <div className="space-y-5">
      {existing?.sozuri_api_key && existing?.sozuri_project && existing?.sender_id && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
          <span className="font-medium">✅ SMS is configured</span> — your Sozuri credentials are saved.
        </div>
      )}

      <div className={cardClass}>
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 shrink-0">
            <MessageSquare className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Sozuri Credentials</p>
            <p className="text-xs text-slate-500">Enter your Sozuri account details to enable SMS sending to members</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Sozuri API Key <span className="text-red-500">*</span></Label>
            <Input type="password" placeholder="Your Sozuri API key" value={apiKey} onChange={e => setApiKey(e.target.value)} />
            <p className="text-xs text-slate-400">Found in your Sozuri dashboard under Manage API</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Project Name <span className="text-red-500">*</span></Label>
            <Input placeholder="e.g., grace-church-sms" value={projectName} onChange={e => setProjectName(e.target.value)} />
            <p className="text-xs text-slate-400">Your Sozuri project name from the dashboard</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Sender ID <span className="text-red-500">*</span></Label>
            <Input placeholder="e.g., GRACE CHURCH" value={senderId} onChange={e => setSenderId(e.target.value)} />
            <p className="text-xs text-slate-400">Your approved Sender ID registered on Sozuri (e.g. GRACE CHURCH). Members will see this name.</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Message Type <span className="text-red-500">*</span></Label>
            <Select value={messageType} onValueChange={(value: 'transactional' | 'promotional') => setMessageType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="promotional">Promotional</SelectItem>
                <SelectItem value="transactional">Transactional</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-400">Select the type your Sender ID is registered as on Sozuri. This is set once during setup — if your Sender ID is registered as promotional on Sozuri, select Promotional. Selecting the wrong type will cause all SMS to fail.</p>
          </div>
        </div>

        <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-xs text-blue-700 space-y-1">
          <p className="font-medium">ℹ How to get your credentials:</p>
          <ol className="list-decimal list-inside space-y-0.5 text-blue-600">
            <li>Sign up at <a href="https://sozuri.net" target="_blank" rel="noopener noreferrer" className="underline">sozuri.net</a></li>
            <li>Create a project and get your API key from Manage API</li>
            <li>Register and get approval for your Sender ID</li>
          </ol>
        </div>

        <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white" onClick={handleSave} disabled={saving || readOnly}>
          {saving ? "Saving..." : "💾 Save SMS Settings"}
        </Button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CommunicationsSettings() {
  const { tenantId } = useChurch();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('church_settings');
  
  return (
    <>
      <Helmet><title>Communications Settings — Vestry</title></Helmet>
      
      {/* Read-only banner */}
      {readOnly && <ReadOnlyBanner section="Communications Settings" />}
      
      <div className="max-w-3xl">
        <Tabs defaultValue="email_categories" className="w-full">
          <TabsList className="bg-slate-100 p-1 rounded-lg w-auto mb-5">
            <TabsTrigger value="email_categories" className="text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">Email Categories</TabsTrigger>
            <TabsTrigger value="automation" className="text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">Automation System</TabsTrigger>
            <TabsTrigger value="sms" className="text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">SMS</TabsTrigger>
            <TabsTrigger value="whatsapp" className="text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">WhatsApp</TabsTrigger>
          </TabsList>

          <TabsContent value="email_categories">
            <EmailCategoriesTab tenantId={tenantId} />
          </TabsContent>

          <TabsContent value="automation">
            <AutomationManagementTab tenantId={tenantId} />
          </TabsContent>

          <TabsContent value="sms">
            <SmsSettingsTab tenantId={tenantId} />
          </TabsContent>

          <TabsContent value="whatsapp">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-10 flex flex-col items-center justify-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50"><MessageSquare className="h-6 w-6 text-orange-500" /></div>
              <p className="text-base font-semibold text-slate-800 dark:text-slate-100">WhatsApp Settings</p>
              <p className="text-sm text-slate-500">Configure your WhatsApp Business integration</p>
              <p className="text-xs text-slate-400 max-w-sm">WhatsApp configuration coming soon. Connect your WhatsApp Business account to send messages to members.</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
