// EmailTemplates component
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

// ─── Types ────────────────────────────────────────────────────────────────────
interface EmailCategory { id: string; name: string; is_active: boolean; is_system: boolean; }
interface EmailTemplate {
  id: string; tenant_id: string; category_id: string | null; name: string;
  subject: string; body: string; is_active: boolean; is_system: boolean;
  created_at: string;
  email_categories?: { name: string; is_active: boolean } | null;
}

// ─── Placeholders ─────────────────────────────────────────────────────────────
const PLACEHOLDERS = [
  { group: "Member",  items: [
    { key: "{{member_name}}",    desc: "Member's full name" },
    { key: "{{first_name}}",     desc: "Member's first name" },
    { key: "{{last_name}}",      desc: "Member's last name" },
    { key: "{{member_email}}",   desc: "Member's email address" },
    { key: "{{member_phone}}",   desc: "Member's phone number" },
    { key: "{{member_since}}",   desc: "Date member joined" },
  ]},
  { group: "Church", items: [
    { key: "{{church_name}}",    desc: "Church name" },
    { key: "{{branch_name}}",    desc: "Branch name" },
    { key: "{{church_address}}", desc: "Church address" },
    { key: "{{church_phone}}",   desc: "Church phone number" },
    { key: "{{church_email}}",   desc: "Church email address" },
    { key: "{{church_website}}", desc: "Church website" },
  ]},
  { group: "Events", items: [
    { key: "{{event_name}}",     desc: "Event name" },
    { key: "{{event_date}}",     desc: "Event date" },
    { key: "{{event_time}}",     desc: "Event time" },
    { key: "{{event_location}}", desc: "Event location" },
  ]},
  { group: "Giving", items: [
    { key: "{{amount}}",         desc: "Donation amount" },
    { key: "{{giving_type}}",    desc: "Type of giving" },
    { key: "{{receipt_number}}", desc: "Receipt number" },
    { key: "{{giving_date}}",    desc: "Date of donation" },
  ]},
  { group: "System", items: [
    { key: "{{current_date}}",   desc: "Today's date" },
    { key: "{{current_year}}",   desc: "Current year" },
    { key: "{{unsubscribe_link}}",desc: "Unsubscribe link" },
  ]},
];

// ─── Library templates ────────────────────────────────────────────────────────
const LIBRARY_TEMPLATES = [
  { name: "Welcome New Member",    category: "Member Lifecycle",    subject: "Welcome to {{church_name}}!", body: "Dear {{first_name}},\n\nWelcome to {{church_name}}! We are so glad you have joined our family.\n\nYou joined us on {{member_since}} and we look forward to growing together in faith.\n\nWith love,\n{{church_name}}" },
  { name: "Birthday Greeting",     category: "Member Lifecycle",    subject: "Happy Birthday, {{first_name}}! 🎂", body: "Dear {{first_name}},\n\nWishing you a wonderful birthday filled with joy and blessings!\n\nMay this year bring you closer to God and all the desires of your heart.\n\nWith love,\n{{church_name}}" },
  { name: "Get Well Soon",         category: "Pastoral Care",       subject: "Praying for you, {{first_name}}", body: "Dear {{first_name}},\n\nWe heard you are not feeling well and wanted you to know that we are praying for your speedy recovery.\n\nYou are in our thoughts and prayers.\n\nWith care,\n{{church_name}}" },
  { name: "Event Invitation",      category: "Events & Invitations",subject: "You're Invited: {{event_name}}", body: "Dear {{first_name}},\n\nYou are cordially invited to {{event_name}}!\n\nDate: {{event_date}}\nTime: {{event_time}}\nLocation: {{event_location}}\n\nWe hope to see you there!\n\n{{church_name}}" },
  { name: "Donation Receipt",      category: "Financial & Giving",  subject: "Thank you for your giving — Receipt #{{receipt_number}}", body: "Dear {{first_name}},\n\nThank you for your generous contribution to {{church_name}}.\n\nAmount: {{amount}}\nType: {{giving_type}}\nDate: {{giving_date}}\nReceipt #: {{receipt_number}}\n\nYour giving makes a difference!\n\n{{church_name}}" },
  { name: "General Announcement",  category: "Administrative",      subject: "Important Announcement from {{church_name}}", body: "Dear {{first_name}},\n\nWe have an important announcement to share with you.\n\n[Your announcement here]\n\nThank you for being part of our community.\n\n{{church_name}}" },
  { name: "Task Reminder",         category: "Task Reminders",      subject: "Reminder: You have a task due", body: "Dear {{first_name}},\n\nThis is a friendly reminder that you have a task that needs your attention.\n\nPlease log in to the member portal to view and complete your assigned tasks.\n\nThank you,\n{{church_name}}" },
  { name: "Volunteer Assignment",  category: "Ministry Assignments",subject: "You've been assigned to a ministry role", body: "Dear {{first_name}},\n\nThank you for your willingness to serve! You have been assigned to a ministry role at {{church_name}}.\n\nPlease log in to view your assignment details.\n\nGod bless you,\n{{church_name}}" },
];

// ─── Template Modal ───────────────────────────────────────────────────────────
interface TemplateModalProps {
  open: boolean; onClose: () => void; tenantId: string; userId: string;
  categories: EmailCategory[]; editData?: EmailTemplate | null; onSuccess: () => void;
}

function TemplateModal({ open, onClose, tenantId, userId, categories, editData, onSuccess }: TemplateModalProps) {
  const qc = useQueryClient();
  const isEdit = !!editData;
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);

  const [name,       setName]       = useState(editData?.name ?? "");
  const [categoryId, setCategoryId] = useState(editData?.category_id ?? "");
  const [subject,    setSubject]    = useState(editData?.subject ?? "");
  const [body,       setBody]       = useState(editData?.body ?? "");
  const [isActive,   setIsActive]   = useState(editData?.is_active ?? true);
  const [htmlMode,   setHtmlMode]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors,     setErrors]     = useState<Record<string,string>>({});

  // Reset when modal opens
  useEffect(() => {
    if (open) {
      setName(editData?.name ?? ""); 
      setCategoryId(editData?.category_id ?? "");
      setSubject(editData?.subject ?? ""); 
      setBody(editData?.body ?? "");
      setIsActive(editData?.is_active ?? true); 
      setHtmlMode(false); 
      setErrors({});
    }
  }, [open, editData]);

  const insertPlaceholder = useCallback((placeholder: string) => {
    const ta = bodyRef.current;
    if (!ta) { setBody(prev => prev + placeholder); return; }
    const start = ta.selectionStart ?? body.length;
    const end = ta.selectionEnd ?? body.length;
    const newBody = body.slice(0, start) + placeholder + body.slice(end);
    setBody(newBody);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + placeholder.length, start + placeholder.length); }, 0);
  }, [body]);

  const handleClose = () => { setName(""); setCategoryId(""); setSubject(""); setBody(""); setIsActive(true); setErrors({}); onClose(); };

  const handleSubmit = async () => {
    const e: Record<string,string> = {};
    if (!name.trim()) e.name = "Template name is required.";
    if (!subject.trim()) e.subject = "Subject line is required.";
    if (!body.trim()) e.body = "Email body is required.";
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({}); setSubmitting(true);
    try {
      const payload = { tenant_id: tenantId, category_id: categoryId || null, name: name.trim(), subject: subject.trim(), body: body.trim(), is_active: isActive, is_system: false, created_by: userId };
      if (isEdit && editData) {
        const { error } = await supabase.from(TABLES.EMAIL_TEMPLATES).update(payload as never).eq("id", editData.id);
        if (error) throw error;
        toast.success("✅ Template updated successfully.");
      } else {
        const { error } = await supabase.from(TABLES.EMAIL_TEMPLATES).insert(payload as never);
        if (error) throw error;
        toast.success("✅ Template saved successfully.");
      }
      qc.invalidateQueries({ queryKey: ["email-templates", tenantId] });
      onSuccess(); handleClose();
    } catch (err: unknown) { toast.error((err as Error)?.message ?? "Failed."); }
    finally { setSubmitting(false); }
  };

  const activeCategories = categories.filter(c => c.is_active);

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-slate-100">
          <DialogTitle className="text-lg font-semibold">{isEdit ? "Edit Email Template" : "Create Email Template"}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-3 gap-0 min-h-0">
            {/* Left+Center: 2/3 */}
            <div className="col-span-2 p-6 space-y-4 border-r border-slate-100">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Template Name <span className="text-red-500">*</span></Label>
                  <Input placeholder="e.g., Welcome Email" value={name} onChange={e => setName(e.target.value)} className="focus:ring-orange-400 focus:border-orange-400" autoFocus />
                  {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Category</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                    <SelectContent>
                      {activeCategories.length === 0
                        ? <div className="px-3 py-2 text-xs text-slate-400">No categories available. Add categories in Settings → Communications.</div>
                        : activeCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)
                      }
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Subject Line</Label>
                <Input ref={subjectRef} placeholder="e.g., Welcome to {{church_name}}!" value={subject} onChange={e => setSubject(e.target.value)} />
                {errors.subject && <p className="text-xs text-red-500">{errors.subject}</p>}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Email Body</Label>
                  <button type="button" onClick={() => setHtmlMode(h => !h)} className={`text-xs px-2.5 py-1 rounded border transition-colors ${htmlMode ? "bg-slate-800 text-white border-slate-700" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
                    &lt;/&gt; HTML
                  </button>
                </div>
                <textarea
                  ref={bodyRef}
                  placeholder="Write your email content here..."
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  rows={10}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-y ${htmlMode ? "font-mono bg-slate-900 text-green-400 border-slate-700" : "border-slate-200 bg-white text-slate-700"}`}
                />
                {errors.body && <p className="text-xs text-red-500">{errors.body}</p>}
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium cursor-pointer" onClick={() => setIsActive(v => !v)}>Active</Label>
                <Switch checked={isActive} onCheckedChange={setIsActive} className="data-[state=checked]:bg-orange-500" />
              </div>
            </div>

            {/* Right: 1/3 — Placeholders */}
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <p className="text-sm font-semibold text-slate-800 mb-0.5">Available Placeholders</p>
              <p className="text-xs text-slate-400 mb-3">Click to insert into email body</p>
              <div className="space-y-4">
                {PLACEHOLDERS.map(group => (
                  <div key={group.group}>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{group.group}</p>
                    <div className="space-y-1.5">
                      {group.items.map(item => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => insertPlaceholder(item.key)}
                          className="w-full text-left rounded-lg px-2.5 py-2 hover:bg-orange-50 transition-colors group"
                        >
                          <p className="font-mono text-xs text-orange-500 group-hover:text-orange-600">{item.key}</p>
                          <p className="text-[10px] text-slate-400">{item.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2.5">
                <div className="flex items-start gap-1.5">
                  <Info className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-blue-700 leading-relaxed">These placeholders are automatically replaced with real data when the email is sent. You never need to fill them in manually.</p>
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

// ─── Template Card ────────────────────────────────────────────────────────────
function TemplateCard({ template, onEdit, onDelete, onSend, onDuplicate, isLibrary }: {
  template: EmailTemplate; onEdit?: () => void; onDelete?: () => void;
  onSend?: () => void; onDuplicate?: () => void; isLibrary?: boolean;
}) {
  const catName = template.email_categories?.name;
  const catActive = template.email_categories?.is_active;
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${template.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
              {template.is_active ? "Active" : "Inactive"}
            </span>
            {catName && (
              <span className={`text-[10px] ${catActive === false ? "text-slate-400" : "text-slate-500"}`}>
                {catName}{catActive === false ? " (Inactive)" : ""}
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{template.name}</p>
          <p className="text-xs text-slate-500 truncate">{template.subject}</p>
          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{template.body.replace(/\n/g, " ")}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
        {isLibrary ? (
          <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-1" onClick={onDuplicate}>
            <Copy className="h-3.5 w-3.5" /> Duplicate
          </Button>
        ) : (
          <>
            <button title="Send" onClick={onSend} className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-slate-200 py-1.5 text-xs text-slate-600 hover:bg-slate-50 transition-colors">
              <Send className="h-3.5 w-3.5" /> Send
            </button>
            <button title="Edit" onClick={onEdit} className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-slate-200 py-1.5 text-xs text-slate-600 hover:bg-slate-50 transition-colors">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
            <button title="Duplicate" onClick={onDuplicate} className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-slate-200 py-1.5 text-xs text-slate-600 hover:bg-slate-50 transition-colors">
              <Copy className="h-3.5 w-3.5" /> Duplicate
            </button>
            <button title="Delete" onClick={onDelete} className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-red-100 py-1.5 text-xs text-red-500 hover:bg-red-50 transition-colors">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Send Modal ───────────────────────────────────────────────────────────────
function SendModal({ template, tenantId, onClose }: { template: EmailTemplate | null; tenantId: string; onClose: () => void }) {
  const { name: churchName } = useChurch();
  const [sendTo,       setSendTo]       = useState("all");
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedIds,  setSelectedIds]  = useState<Set<string>>(new Set());
  const [groupId,      setGroupId]      = useState("");
  const [sending,      setSending]      = useState(false);

  const { data: members = [] } = useQuery<{ id: string; first_name: string | null; last_name: string | null; email: string | null }[]>({
    queryKey: ["members-for-send", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("members").select("id, first_name, last_name, email").eq("tenant_id", tenantId).eq("status", "Active").order("first_name").limit(500);
      return (data ?? []) as { id: string; first_name: string | null; last_name: string | null; email: string | null }[];
    },
    enabled: !!template && sendTo === "selected",
    staleTime: 300_000,
  });

  const { data: groups = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["groups-for-send", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("groups").select("id, name").eq("tenant_id", tenantId).order("name");
      return (data ?? []) as { id: string; name: string }[];
    },
    enabled: !!template && sendTo === "group",
    staleTime: 300_000,
  });

  const filteredMembers = members.filter(m => {
    const q = memberSearch.toLowerCase();
    return `${m.first_name ?? ""} ${m.last_name ?? ""}`.toLowerCase().includes(q) || (m.email ?? "").toLowerCase().includes(q);
  });

  const handleSend = async () => {
    if (!template) return;
    setSending(true);
    try {
      let recipients: { email?: string; name?: string }[] = [];
      if (sendTo === "all") {
        const { data } = await supabase.from("members").select("email, first_name, last_name").eq("tenant_id", tenantId).eq("status", "Active");
        recipients = (data ?? []).map(m => ({ email: m.email ?? undefined, name: `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim() }));
      } else if (sendTo === "selected") {
        recipients = members.filter(m => selectedIds.has(m.id)).map(m => ({ email: m.email ?? undefined, name: `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim() }));
      } else if (sendTo === "group" && groupId) {
        const { data } = await supabase.from("group_members").select("members(email, first_name, last_name)").eq("group_id", groupId);
        recipients = (data ?? []).map((r: any) => ({ email: r.members?.email ?? undefined, name: `${r.members?.first_name ?? ""} ${r.members?.last_name ?? ""}`.trim() }));
      }
      const emailRecipients = recipients.filter(r => r.email);
      if (emailRecipients.length === 0) { toast.error("No recipients with email addresses found."); setSending(false); return; }

      const { error } = await supabase.functions.invoke("send-communication", {
        body: {
          tenant_id: tenantId,
          channel: "email",
          subject: template.subject,
          body: template.body,
          recipients: emailRecipients,
        },
      });
      if (error) throw error;
      toast.success(`✅ Email sent to ${emailRecipients.length} member${emailRecipients.length !== 1 ? "s" : ""}.`);
      onClose();
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Failed to send.");
    } finally { setSending(false); }
  };

  if (!template) return null;

  return (
    <Dialog open={!!template} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Send Email</DialogTitle>
          <p className="text-xs text-slate-500">{template.name}</p>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-4 pt-1">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Send To</label>
            <select value={sendTo} onChange={e => { setSendTo(e.target.value); setSelectedIds(new Set()); setGroupId(""); }} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
              <option value="all">All Members</option>
              <option value="group">Specific Group</option>
              <option value="selected">Selected Members Only</option>
            </select>
          </div>

          {sendTo === "group" && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Select Group</label>
              <select value={groupId} onChange={e => setGroupId(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                <option value="">Select a group...</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          )}

          {sendTo === "selected" && (
            <div className="space-y-2">
              <input type="text" placeholder="Search members by name or email..." value={memberSearch} onChange={e => setMemberSearch(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              <div className="rounded-lg border border-slate-200 max-h-40 overflow-y-auto divide-y divide-slate-100">
                {filteredMembers.map(m => {
                  const isSelected = selectedIds.has(m.id);
                  const name = `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim() || "—";
                  return (
                    <button key={m.id} type="button" onClick={() => setSelectedIds(prev => { const n = new Set(prev); isSelected ? n.delete(m.id) : n.add(m.id); return n; })} className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${isSelected ? "bg-orange-50 border-l-2 border-l-orange-500" : "hover:bg-slate-50"}`}>
                      <div className={`h-4 w-4 rounded border-2 shrink-0 flex items-center justify-center ${isSelected ? "border-orange-500 bg-orange-500" : "border-slate-300"}`}>
                        {isSelected && <div className="h-2 w-2 bg-white rounded-sm" />}
                      </div>
                      <div><p className="text-sm font-medium text-slate-800">{name}</p><p className="text-xs text-slate-400">{m.email ?? "—"}</p></div>
                    </button>
                  );
                })}
              </div>
              {selectedIds.size > 0 && <p className="text-xs text-orange-600 font-medium">{selectedIds.size} member{selectedIds.size !== 1 ? "s" : ""} selected</p>}
            </div>
          )}

          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
            <p className="text-xs text-slate-400 mb-2">Preview (placeholders will be replaced automatically when sent)</p>
            <pre className="text-xs text-slate-600 whitespace-pre-wrap font-sans leading-relaxed max-h-32 overflow-y-auto">{template.body}</pre>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <Button variant="outline" onClick={onClose} disabled={sending}>Cancel</Button>
          <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleSend} disabled={sending || (sendTo === "group" && !groupId) || (sendTo === "selected" && selectedIds.size === 0)}>
            {sending ? "Sending..." : "Send Email"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main EmailTemplates component ────────────────────────────────────────────
export function EmailTemplates() {
  const { tenantId, userId } = useChurch();
  const qc = useQueryClient();
  const [activeCategory, setActiveCategory] = useState("all");
  const [createOpen,     setCreateOpen]     = useState(false);
  const [editTemplate,   setEditTemplate]   = useState<EmailTemplate | null>(null);
  const [deleteTemplate, setDeleteTemplate] = useState<EmailTemplate | null>(null);
  const [sendTemplate,   setSendTemplate]   = useState<EmailTemplate | null>(null);

  // Fetch active categories
  const { data: categories = [] } = useQuery<EmailCategory[]>({
    queryKey: ["email-categories", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.EMAIL_CATEGORIES).select("*").eq("tenant_id", tenantId).order("sort_order");
      return (data ?? []) as EmailCategory[];
    },
    staleTime: 60_000,
  });

  const activeCategories = categories.filter(c => c.is_active);

  // Fetch my templates
  const { data: myTemplates = [], isLoading } = useQuery<EmailTemplate[]>({
    queryKey: ["email-templates", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from(TABLES.EMAIL_TEMPLATES).select("*, email_categories(name, is_active)").eq("tenant_id", tenantId).eq("is_system", false).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as EmailTemplate[];
    },
    staleTime: 300_000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLES.EMAIL_TEMPLATES).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["email-templates", tenantId] }); setDeleteTemplate(null); toast.success("Template deleted."); },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleDuplicateUserTemplate = async (template: EmailTemplate) => {
    const { error } = await supabase.from(TABLES.EMAIL_TEMPLATES).insert({
      tenant_id: tenantId, 
      category_id: template.category_id, 
      name: `${template.name} (Copy)`,
      subject: template.subject, 
      body: template.body, 
      is_active: true, 
      is_system: false, 
      created_by: userId,
    } as never);
    if (error) { 
      toast.error(error.message); 
      return; 
    }
    qc.invalidateQueries({ queryKey: ["email-templates", tenantId] });
    toast.success("✅ Template duplicated successfully.");
  };

  const handleDuplicate = async (libTemplate: typeof LIBRARY_TEMPLATES[number]) => {
    const cat = categories.find(c => c.name === libTemplate.category);
    const { error } = await supabase.from(TABLES.EMAIL_TEMPLATES).insert({
      tenant_id: tenantId, category_id: cat?.id ?? null, name: libTemplate.name,
      subject: libTemplate.subject, body: libTemplate.body, is_active: true, is_system: false, created_by: userId,
    } as never);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["email-templates", tenantId] });
    toast.success("✅ Template duplicated to My Templates.");
  };

  const filtered = activeCategory === "all" ? myTemplates : myTemplates.filter(t => t.category_id === activeCategory);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Email Templates</h2>
          <p className="text-xs text-slate-500">Manage and customize email templates for different scenarios</p>
        </div>
        <Button className="bg-orange-500 hover:bg-orange-600 text-white gap-2 shrink-0" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Create Template
        </Button>
      </div>

      {/* Category filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setActiveCategory("all")} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${activeCategory === "all" ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>All</button>
        {activeCategories.map(cat => (
          <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${activeCategory === cat.id ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{cat.name}</button>
        ))}
      </div>

      {/* My Templates / Library tabs */}
      <Tabs defaultValue="my">
        <TabsList className="bg-slate-100 p-1 rounded-lg w-auto">
          <TabsTrigger value="my" className="text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">My Templates</TabsTrigger>
          <TabsTrigger value="library" className="text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">Template Library</TabsTrigger>
        </TabsList>

        <TabsContent value="my" className="mt-4">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({length:6}).map((_,i)=><Skeleton key={i} className="h-48 w-full rounded-xl"/>)}</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
              <p className="text-sm font-medium">No templates yet.</p>
              <p className="text-xs">Create your first template or duplicate one from the Template Library.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(t => (
                <TemplateCard key={t.id} template={t}
                  onEdit={() => setEditTemplate(t)}
                  onDelete={() => setDeleteTemplate(t)}
                  onSend={() => setSendTemplate(t)}
                  onDuplicate={() => handleDuplicateUserTemplate(t)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="library" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {LIBRARY_TEMPLATES.map(lt => {
              const cat = categories.find(c => c.name === lt.category);
              const fakeTemplate: EmailTemplate = { id: lt.name, tenant_id: tenantId, category_id: cat?.id ?? null, name: lt.name, subject: lt.subject, body: lt.body, is_active: true, is_system: true, created_at: "", email_categories: cat ? { name: cat.name, is_active: cat.is_active } : null };
              return <TemplateCard key={lt.name} template={fakeTemplate} isLibrary onDuplicate={() => handleDuplicate(lt)} />;
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <TemplateModal open={createOpen} onClose={() => setCreateOpen(false)} tenantId={tenantId} userId={userId} categories={categories} onSuccess={() => {}} />
      <TemplateModal open={!!editTemplate} onClose={() => setEditTemplate(null)} tenantId={tenantId} userId={userId} categories={categories} editData={editTemplate} onSuccess={() => {}} />
      <SendModal template={sendTemplate} tenantId={tenantId} onClose={() => setSendTemplate(null)} />

      <AlertDialog open={!!deleteTemplate} onOpenChange={v => !v && setDeleteTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTemplate?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this template? This cannot be undone.</AlertDialogDescription>
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
