import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES } from "@/lib/schema";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Send, Pencil, Trash2, Copy, Info } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface SmsTemplate { id: string; tenant_id: string; name: string; category_id: string | null; body: string; is_active: boolean; is_system: boolean; created_at: string; email_categories?: { name: string } | null; }
interface EmailCategory { id: string; name: string; is_active: boolean; }

const SMS_PLACEHOLDERS = [
  { key: "{{first_name}}", desc: "Member's first name" },
  { key: "{{last_name}}", desc: "Member's last name" },
  { key: "{{full_name}}", desc: "Member's full name" },
  { key: "{{church_name}}", desc: "Church name" },
  { key: "{{event_name}}", desc: "Event name" },
  { key: "{{event_date}}", desc: "Event date" },
  { key: "{{event_time}}", desc: "Event time" },
  { key: "{{event_location}}", desc: "Event location" },
  { key: "{{amount}}", desc: "Amount" },
  { key: "{{current_date}}", desc: "Today's date" },
];

const LIBRARY_TEMPLATES = [
  { name: "Event Reminder", category: "Events & Invitations", body: "Hi {{first_name}}, reminder: {{event_name}} is on {{event_date}} at {{event_time}}, {{event_location}}. See you there! - {{church_name}}" },
  { name: "Birthday Greeting", category: "Member Lifecycle", body: "Happy Birthday {{first_name}}! 🎂 Wishing you God's richest blessings today and always. With love, {{church_name}}" },
  { name: "Service Reminder", category: "Events & Invitations", body: "Hi {{first_name}}, join us this Sunday for service at {{event_time}}, {{event_location}}. God bless! - {{church_name}}" },
  { name: "Giving Thank You", category: "Financial & Giving", body: "Dear {{first_name}}, thank you for your generous gift of {{amount}}. Your giving makes a difference! God bless, {{church_name}}" },
  { name: "General Announcement", category: "Administrative", body: "Dear {{first_name}}, {{church_name}} announcement: [Your message here]. God bless you!" },
];

function smsSegments(chars: number) { return Math.max(1, Math.ceil(chars / 160)); }

function CharCounter({ text }: { text: string }) {
  const len = text.length;
  const segs = smsSegments(len);
  const color = len > 160 ? "text-red-500" : len > 140 ? "text-amber-500" : "text-slate-400";
  return (
    <div className="space-y-1">
      <p className={cn("text-xs", color)}>{len}/160 characters · {segs} SMS segment{segs !== 1 ? "s" : ""}</p>
      {len > 160 && <p className="text-xs text-red-500">This will be sent as {segs} SMS messages (costs {segs}x credits per recipient)</p>}
      {len > 140 && len <= 160 && <p className="text-xs text-amber-500">Approaching 1 SMS segment limit</p>}
    </div>
  );
}

// ── Template Modal ─────────────────────────────────────────────────────────────
function TemplateModal({ open, onClose, tenantId, categories, editData, onSuccess }: { open: boolean; onClose: () => void; tenantId: string; categories: EmailCategory[]; editData?: SmsTemplate | null; onSuccess: () => void }) {
  const qc = useQueryClient();
  const isEdit = !!editData;
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [name, setName] = useState(editData?.name ?? "");
  const [categoryId, setCategoryId] = useState(editData?.category_id ?? "");
  const [body, setBody] = useState(editData?.body ?? "");
  const [isActive, setIsActive] = useState(editData?.is_active ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when editData changes
  useEffect(() => {
    if (editData) {
      setName(editData.name ?? "");
      setCategoryId(editData.category_id ?? "");
      setBody(editData.body ?? "");
      setIsActive(editData.is_active ?? true);
    }
  }, [editData]);

  const insertPlaceholder = useCallback((ph: string) => {
    const ta = bodyRef.current;
    if (!ta) { setBody(prev => prev + ph); return; }
    const start = ta.selectionStart ?? body.length;
    const end = ta.selectionEnd ?? body.length;
    const next = body.slice(0, start) + ph + body.slice(end);
    setBody(next);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + ph.length, start + ph.length); }, 0);
  }, [body]);

  const handleClose = () => { setName(""); setCategoryId(""); setBody(""); setIsActive(true); setErrors({}); onClose(); };

  const handleSubmit = async () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Template name is required.";
    if (!body.trim()) e.body = "Message body is required.";
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({}); setSubmitting(true);
    try {
      const payload = { tenant_id: tenantId, name: name.trim(), category_id: categoryId || null, body: body.trim(), is_active: isActive, is_system: false };
      if (isEdit && editData) {
        const { error } = await supabase.from(TABLES.SMS_TEMPLATES).update(payload as any).eq("id", editData.id);
        if (error) throw error;
        toast.success("✅ Template updated.");
      } else {
        const { error } = await supabase.from(TABLES.SMS_TEMPLATES).insert(payload as any);
        if (error) throw error;
        toast.success("✅ Template saved.");
      }
      qc.invalidateQueries({ queryKey: ["sms-templates", tenantId] });
      onSuccess(); handleClose();
    } catch (err: unknown) { toast.error((err as Error)?.message ?? "Failed."); }
    finally { setSubmitting(false); }
  };

  const segs = smsSegments(body.length);

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-slate-100">
          <DialogTitle className="text-lg font-semibold">{isEdit ? "Edit SMS Template" : "Create SMS Template"}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-3 gap-0 min-h-0">
            {/* Left+Center */}
            <div className="col-span-2 p-6 space-y-4 border-r border-slate-100">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Template Name <span className="text-red-500">*</span></Label>
                  <Input placeholder="e.g., Event Reminder SMS" value={name} onChange={e => setName(e.target.value)} className="focus:ring-orange-400 focus:border-orange-400" autoFocus />
                  {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Category</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                    <SelectContent>
                      {categories.filter(c => c.is_active).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Message <span className="text-red-500">*</span></Label>
                <textarea
                  ref={bodyRef}
                  placeholder="Write your SMS message..."
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  rows={5}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-y"
                />
                <CharCounter text={body} />
                {errors.body && <p className="text-xs text-red-500">{errors.body}</p>}
              </div>
              {/* Cost estimate box */}
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5 text-xs text-slate-500">
                📱 {body.length} characters · {segs} segment{segs !== 1 ? "s" : ""} · ~{segs} credit{segs !== 1 ? "s" : ""} per recipient
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium cursor-pointer" onClick={() => setIsActive(v => !v)}>Active</Label>
                <Switch checked={isActive} onCheckedChange={setIsActive} className="data-[state=checked]:bg-orange-500" />
              </div>
            </div>
            {/* Right: Placeholders */}
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <p className="text-sm font-semibold text-slate-800 mb-0.5">Available Placeholders</p>
              <p className="text-xs text-slate-400 mb-3">Click to insert into message</p>
              <div className="space-y-1.5">
                {SMS_PLACEHOLDERS.map(ph => (
                  <button key={ph.key} type="button" onClick={() => insertPlaceholder(ph.key)} className="w-full text-left rounded-lg px-2.5 py-2 hover:bg-orange-50 transition-colors group">
                    <p className="font-mono text-xs text-orange-500 group-hover:text-orange-600">{ph.key}</p>
                    <p className="text-[10px] text-slate-400">{ph.desc}</p>
                  </button>
                ))}
              </div>
              <div className="mt-4 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2.5">
                <div className="flex items-start gap-1.5">
                  <Info className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-blue-700 leading-relaxed">Placeholders are automatically replaced with real data when the SMS is sent.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <Button variant="outline" onClick={handleClose} disabled={submitting}>Cancel</Button>
          <Button className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-5" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Saving..." : isEdit ? "Update Template" : "Save Template"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Template Card ──────────────────────────────────────────────────────────────
function TemplateCard({ template, onEdit, onDelete, onSend, onDuplicate, isLibrary }: { template: SmsTemplate; onEdit?: () => void; onDelete?: () => void; onSend?: () => void; onDuplicate?: () => void; isLibrary?: boolean }) {
  const segs = smsSegments(template.body.length);
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium", template.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200")}>
              {template.is_active ? "Active" : "Inactive"}
            </span>
            {template.email_categories?.name && <span className="text-[10px] text-slate-500">{template.email_categories.name}</span>}
          </div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{template.name}</p>
          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{template.body}</p>
          <p className="text-[10px] text-slate-400">{template.body.length} characters · {segs} SMS segment{segs !== 1 ? "s" : ""}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
        {isLibrary ? (
          <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-1" onClick={onDuplicate}><Copy className="h-3.5 w-3.5" />Duplicate</Button>
        ) : (
          <>
            <button onClick={onSend} className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-slate-200 py-1.5 text-xs text-slate-600 hover:bg-slate-50 transition-colors"><Send className="h-3.5 w-3.5" />Send</button>
            <button onClick={onEdit} className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-slate-200 py-1.5 text-xs text-slate-600 hover:bg-slate-50 transition-colors"><Pencil className="h-3.5 w-3.5" />Edit</button>
            <button onClick={onDelete} className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-red-100 py-1.5 text-xs text-red-500 hover:bg-red-50 transition-colors"><Trash2 className="h-3.5 w-3.5" />Delete</button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main SmsTemplates ──────────────────────────────────────────────────────────
export function SmsTemplates() {
  const { tenantId } = useChurch();
  const qc = useQueryClient();
  const [activeCategory, setActiveCategory] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<SmsTemplate | null>(null);
  const [deleteTemplate, setDeleteTemplate] = useState<SmsTemplate | null>(null);

  const { data: categories = [] } = useQuery<EmailCategory[]>({
    queryKey: ["email-categories", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.EMAIL_CATEGORIES).select("*").eq("tenant_id", tenantId).order("sort_order");
      return (data ?? []) as EmailCategory[];
    },
    staleTime: 60_000,
  });

  const { data: myTemplates = [], isLoading } = useQuery<SmsTemplate[]>({
    queryKey: ["sms-templates", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.SMS_TEMPLATES).select("*, email_categories(name)").eq("tenant_id", tenantId).eq("is_system", false).order("created_at", { ascending: false });
      return (data ?? []) as SmsTemplate[];
    },
    staleTime: 300_000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLES.SMS_TEMPLATES).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sms-templates", tenantId] }); setDeleteTemplate(null); toast.success("Template deleted."); },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleDuplicate = async (lib: typeof LIBRARY_TEMPLATES[number]) => {
    const cat = categories.find(c => c.name === lib.category);
    const { error } = await supabase.from(TABLES.SMS_TEMPLATES).insert({ tenant_id: tenantId, name: lib.name, category_id: cat?.id ?? null, body: lib.body, is_active: true, is_system: false } as any);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["sms-templates", tenantId] });
    toast.success("✅ Template duplicated to My Templates.");
  };

  const filtered = activeCategory === "all" ? myTemplates : myTemplates.filter(t => t.category_id === activeCategory);
  const activeCategories = categories.filter(c => c.is_active);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">SMS Templates</h2>
          <p className="text-xs text-slate-500">Manage reusable SMS message templates</p>
        </div>
        <Button className="bg-orange-500 hover:bg-orange-600 text-white gap-2 shrink-0" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />Create Template
        </Button>
      </div>

      {/* Category pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setActiveCategory("all")} className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-colors", activeCategory === "all" ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>All</button>
        {activeCategories.map(cat => (
          <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-colors", activeCategory === cat.id ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>{cat.name}</button>
        ))}
      </div>

      <Tabs defaultValue="my">
        <TabsList className="bg-slate-100 p-1 rounded-lg w-auto">
          <TabsTrigger value="my" className="text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">My Templates</TabsTrigger>
          <TabsTrigger value="library" className="text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">Template Library</TabsTrigger>
        </TabsList>

        <TabsContent value="my" className="mt-4">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
              <p className="text-sm font-medium">No SMS templates yet.</p>
              <p className="text-xs">Create your first template or duplicate one from the Template Library.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(t => <TemplateCard key={t.id} template={t} onEdit={() => setEditTemplate(t)} onDelete={() => setDeleteTemplate(t)} onSend={() => {}} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="library" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {LIBRARY_TEMPLATES.map(lt => {
              const cat = categories.find(c => c.name === lt.category);
              const fake: SmsTemplate = { id: lt.name, tenant_id: tenantId, name: lt.name, category_id: cat?.id ?? null, body: lt.body, is_active: true, is_system: true, created_at: "", email_categories: cat ? { name: cat.name } : null };
              return <TemplateCard key={lt.name} template={fake} isLibrary onDuplicate={() => handleDuplicate(lt)} />;
            })}
          </div>
        </TabsContent>
      </Tabs>

      <TemplateModal open={createOpen} onClose={() => setCreateOpen(false)} tenantId={tenantId} categories={categories} onSuccess={() => {}} />
      <TemplateModal open={!!editTemplate} onClose={() => setEditTemplate(null)} tenantId={tenantId} categories={categories} editData={editTemplate} onSuccess={() => {}} />

      <AlertDialog open={!!deleteTemplate} onOpenChange={v => !v && setDeleteTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTemplate?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 hover:bg-red-600 text-white" onClick={() => deleteTemplate && deleteMutation.mutate(deleteTemplate.id)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
