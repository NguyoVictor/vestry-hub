import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES } from "@/lib/schema";
import { toast } from "sonner";
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionButton } from '@/components/shared/PermissionButton';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Radio, BarChart3, FileText, Send, RefreshCw, Plus, MessageSquare,
  MoreVertical, Eye, Copy, RotateCcw, Trash2, Mail, Bell, Megaphone,
  Users, Clock, TrendingUp, Info,
} from "lucide-react";
import { format, subDays } from "date-fns";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────
interface AdminBroadcast {
  id: string; tenant_id: string; subject: string; message: string;
  priority: string; channels: string[]; recipient_type: string;
  recipient_ids: string[] | null; total_recipients: number; status: string;
  email_sent_count: number; email_failed_count: number;
  push_sent_count: number; push_failed_count: number;
  scheduled_at: string | null; sent_at: string | null;
  created_by: string | null; created_at: string;
}
interface BroadcastTemplate {
  id: string; tenant_id: string; name: string; subject: string;
  message: string; priority: string; channels: string[]; is_system: boolean; created_at: string;
}
interface Branch { id: string; name: string; member_count?: number; }
interface Officer { id: string; first_name: string | null; last_name: string | null; email: string | null; role: string; }

// ── Template variable replacement ─────────────────────────────────────────────
const replaceTemplateVariables = (text: string, churchData: any): string => {
  if (!text || !churchData) return text;
  
  const variables = {
    '{{church_name}}': churchData.name || 'Church',
    '{{church_tagline}}': churchData.tagline || '',
    '{{church_email}}': churchData.contact_email || '',
    '{{church_phone}}': churchData.phone || '',
    '{{church_address}}': churchData.address || '',
    '{{church_city}}': churchData.city || '',
    '{{church_country}}': churchData.country || '',
    '{{church_website}}': churchData.website_url || '',
    '{{church_denomination}}': churchData.denomination || '',
    '{{service_time}}': churchData.service_time || '',
    '{{founded_year}}': churchData.founded_year ? String(churchData.founded_year) : '',
  };
  
  let result = text;
  Object.entries(variables).forEach(([placeholder, value]) => {
    result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
  });
  
  return result;
};

// ── Priority config ───────────────────────────────────────────────────────────
const PRIORITY = {
  low:    { label: "Low",    dot: "bg-slate-400",  pill: "bg-slate-100 text-slate-600 border-slate-200",   border: "" },
  normal: { label: "Normal", dot: "bg-blue-500",   pill: "bg-blue-100 text-blue-700 border-blue-200",      border: "" },
  high:   { label: "High",   dot: "bg-orange-500", pill: "bg-orange-100 text-orange-700 border-orange-200", border: "border-l-4 border-l-orange-400" },
  urgent: { label: "Urgent", dot: "bg-red-500",    pill: "bg-red-100 text-red-700 border-red-200",          border: "border-l-4 border-l-red-500" },
} as const;

const STATUS_PILL: Record<string, string> = {
  sent:      "bg-emerald-100 text-emerald-700 border-emerald-200",
  draft:     "bg-slate-100 text-slate-600 border-slate-200",
  scheduled: "bg-blue-100 text-blue-700 border-blue-200",
  failed:    "bg-red-100 text-red-700 border-red-200",
  partial:   "bg-amber-100 text-amber-700 border-amber-200",
};

const SEED_TEMPLATES = [
  { name: "Service Cancellation", subject: "Important: Service Update", message: "Dear {{church_name}} family, please note that today's service has been cancelled. We apologize for any inconvenience. Please stay safe and God bless you.", priority: "urgent", channels: ["in_app", "email"] },
  { name: "Service Reminder", subject: "Join Us This Sunday", message: "Dear {{church_name}} family, this is a reminder that our Sunday service is tomorrow. We look forward to worshipping with you. God bless!", priority: "normal", channels: ["in_app"] },
  { name: "Emergency Prayer Request", subject: "Urgent Prayer Request", message: "Dear {{church_name}} family, we have an urgent prayer request. Please take a moment to pray. Details to follow. Thank you.", priority: "urgent", channels: ["in_app", "email"] },
  { name: "Weekly Announcement", subject: "This Week at {{church_name}}", message: "Dear family, here are this week's announcements from {{church_name}}. [Add your announcements here]. God bless you all!", priority: "normal", channels: ["in_app", "email"] },
  { name: "Venue Change Notice", subject: "Venue Change Notice", message: "Dear {{church_name}} family, please note that our venue has changed for [event]. New location: [address]. We apologize for any inconvenience.", priority: "high", channels: ["in_app", "email"] },
];

// ── Channel pill helper ───────────────────────────────────────────────────────
function ChannelPills({ channels }: { channels: string[] }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {channels.includes("in_app") && <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">📱 In-App</span>}
      {channels.includes("email")  && <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">📧 Email</span>}
      {channels.includes("push")   && <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-orange-600">🔔 Push</span>}
    </div>
  );
}

// ── Broadcast / Template Modal ────────────────────────────────────────────────
interface BroadcastModalProps {
  open: boolean; onClose: () => void; tenantId: string; userId: string;
  churchName: string; prefill?: Partial<AdminBroadcast | BroadcastTemplate> | null;
  onSuccess: () => void;
}

function BroadcastModal({ open, onClose, tenantId, userId, churchName, prefill, onSuccess }: BroadcastModalProps) {
  const qc = useQueryClient();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('communication_tools');
  const [subject, setSubject]       = useState(prefill?.subject ?? "");
  const [message, setMessage]       = useState(prefill?.message ?? "");
  const [priority, setPriority]     = useState<string>(prefill?.priority ?? "normal");
  const [channels, setChannels]     = useState<string[]>(prefill?.channels ?? ["in_app"]);
  const [scheduleAt, setScheduleAt] = useState("");
  const [recipientType, setRecipientType] = useState("all");
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [selectedOfficers, setSelectedOfficers] = useState<string[]>([]);
  const [sending, setSending]       = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [noEmailWarning, setNoEmailWarning] = useState(false);
  const [noEmailCount, setNoEmailCount] = useState(0);

  // Fetch church data for template variables
  const { data: churchData } = useQuery({
    queryKey: ["church-data", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.TENANTS).select("*").eq("id", tenantId).single();
      return data;
    },
    staleTime: 300_000,
    enabled: open,
  });

  // Reset when prefill changes
  useEffect(() => {
    if (open) {
      setSubject(prefill?.subject ?? "");
      setMessage(prefill?.message ?? "");
      setPriority(prefill?.priority ?? "normal");
      setChannels(prefill?.channels ?? ["in_app"]);
      setScheduleAt(""); setRecipientType("all");
      setSelectedBranches([]); setSelectedOfficers([]);
    }
  }, [open, prefill]);

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["branches-broadcast", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.BRANCHES).select("id, name").eq("tenant_id", tenantId).order("name");
      return (data ?? []) as Branch[];
    },
    staleTime: 300_000, enabled: open,
  });

  const { data: officers = [] } = useQuery<Officer[]>({
    queryKey: ["officers-broadcast", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("users").select("id, first_name, last_name, email, role").eq("tenant_id", tenantId).in("role", ["admin", "senior_pastor", "pastor", "staff", "elder"]).order("first_name");
      return (data ?? []) as Officer[];
    },
    staleTime: 300_000, enabled: open,
  });

  const { data: memberCount = 0 } = useQuery<number>({
    queryKey: ["member-count-broadcast", tenantId],
    queryFn: async () => {
      const { count } = await supabase.from(TABLES.MEMBERS).select("id", { count: "exact", head: true }).eq("tenant_id", tenantId);
      return count ?? 0;
    },
    staleTime: 300_000, enabled: open,
  });

  const toggleChannel = (ch: string) => {
    if (ch === "in_app") return; // always on
    setChannels(prev => prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]);
  };

  const recipientCount = recipientType === "all" ? memberCount
    : recipientType === "branches" ? selectedBranches.length * 10 // approximate
    : selectedOfficers.length;

  const buildPayload = (status: string) => ({
    tenant_id: tenantId,
    subject: subject.trim(),
    message: message.trim(),
    priority,
    channels,
    recipient_type: recipientType,
    recipient_ids: recipientType === "all" ? null
      : recipientType === "branches" ? selectedBranches
      : selectedOfficers,
    total_recipients: recipientCount,
    status,
    scheduled_at: scheduleAt ? new Date(scheduleAt).toISOString() : null,
    sent_at: status === "sent" ? new Date().toISOString() : null,
    created_by: userId,
  });

  const sendBroadcast = async () => {
    if (readOnly) return;
    if (!subject.trim()) { toast.error("Subject is required."); return; }
    if (!message.trim()) { toast.error("Message is required."); return; }

    // Replace template variables with actual church data
    const processedSubject = replaceTemplateVariables(subject.trim(), churchData);
    const processedMessage = replaceTemplateVariables(message.trim(), churchData);

    // Check for email recipients without email addresses
    if (channels.includes("email") && !noEmailWarning) {
      const { count } = await supabase.from(TABLES.MEMBERS).select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).is("email", null);
      if ((count ?? 0) > 0) {
        setNoEmailCount(count ?? 0);
        setNoEmailWarning(true);
        return;
      }
    }
    setNoEmailWarning(false);
    setSending(true);
    try {
      const payload = buildPayload(scheduleAt ? "scheduled" : "sent");
      // Store processed content (with variables replaced) in the database
      payload.subject = processedSubject;
      payload.message = processedMessage;
      
      const { data: row, error } = await supabase.from(TABLES.ADMIN_BROADCASTS).insert(payload as any).select("id").single();
      if (error) throw error;

      // Get member IDs for notifications (member portal uses member IDs for authentication)
      // The notifications.user_id field stores member IDs for member portal compatibility
      let memberIds: string[] = [];
      if (recipientType === "all") {
        const { data } = await supabase.from(TABLES.MEMBERS).select("id").eq("tenant_id", tenantId);
        memberIds = (data ?? []).map((m: any) => m.id).filter(Boolean);
      } else if (recipientType === "officers") {
        // For officers, we need to get their member IDs
        const { data } = await supabase.from(TABLES.MEMBERS).select("id").eq("tenant_id", tenantId).in("user_id", selectedOfficers);
        memberIds = (data ?? []).map((m: any) => m.id).filter(Boolean);
      } else if (recipientType === "branches") {
        // Get member IDs for members in selected branches
        const { data } = await supabase.from(TABLES.MEMBERS).select("id").eq("tenant_id", tenantId).in("branch_id", selectedBranches);
        memberIds = (data ?? []).map((m: any) => m.id).filter(Boolean);
      }

      // Get user IDs for push notifications (Edge Function expects user IDs)
      let userIds: string[] = [];
      if (recipientType === "all") {
        const { data } = await supabase.from(TABLES.MEMBERS).select("user_id").eq("tenant_id", tenantId).not("user_id", "is", null);
        userIds = (data ?? []).map((m: any) => m.user_id).filter(Boolean);
      } else if (recipientType === "officers") {
        userIds = selectedOfficers;
      } else if (recipientType === "branches") {
        // Get user IDs for members in selected branches
        const { data } = await supabase.from(TABLES.MEMBERS).select("user_id").eq("tenant_id", tenantId).in("branch_id", selectedBranches).not("user_id", "is", null);
        userIds = (data ?? []).map((m: any) => m.user_id).filter(Boolean);
      }

      // Send in-app notifications (use member IDs for member portal compatibility)
      if (channels.includes("in_app") && memberIds.length > 0) {
        const notifs = memberIds.map(memberId => ({
          tenant_id: tenantId, user_id: memberId, type: "broadcast", // user_id field stores member ID for member portal
          title: processedSubject, body: processedMessage.slice(0, 200),
          is_read: false,
        }));
        // Insert in batches of 100 with error handling
        try {
          for (let i = 0; i < notifs.length; i += 100) {
            const { error: notifError } = await supabase.from(TABLES.NOTIFICATIONS).insert(notifs.slice(i, i + 100) as any);
            if (notifError) {
              console.error("Notification insertion error:", notifError);
              throw notifError;
            }
          }
          console.log(`✅ Created ${notifs.length} in-app notifications successfully`);
        } catch (notifError) {
          console.error("Failed to create in-app notifications:", notifError);
          toast.error("Failed to create in-app notifications");
        }
      }

      // Send email
      if (channels.includes("email") && !scheduleAt) {
        const { data: emailMembers } = await supabase.from(TABLES.MEMBERS).select("email, first_name, last_name").eq("tenant_id", tenantId).not("email", "is", null);
        if ((emailMembers ?? []).length > 0) {
          await supabase.functions.invoke("send-communication", {
            body: { tenant_id: tenantId, channel: "email", subject: processedSubject, body: processedMessage, recipients: emailMembers },
          });
        }
      }

      // Send push notifications and capture results
      let pushSentCount = 0;
      let pushFailedCount = 0;
      if (channels.includes("push") && !scheduleAt && userIds.length > 0) {
        try {
          const { data: pushResult } = await supabase.functions.invoke("send-push-notification", {
            body: { 
              tenant_id: tenantId, 
              recipient_user_ids: userIds,
              title: processedSubject, 
              body: processedMessage, 
              priority, 
              data: { broadcast_id: row?.id, type: "broadcast" } 
            },
          });
          if (pushResult) {
            pushSentCount = pushResult.sent || 0;
            pushFailedCount = pushResult.failed || 0;
          }
        } catch (pushError) {
          console.error("Push notification error:", pushError);
          pushFailedCount = userIds.length; // Mark all as failed if error
        }

        // Update broadcast record with push stats
        if (row?.id) {
          await supabase.from(TABLES.ADMIN_BROADCASTS)
            .update({ 
              push_sent_count: pushSentCount, 
              push_failed_count: pushFailedCount 
            } as any)
            .eq("id", row.id);
        }
      }

      qc.invalidateQueries({ queryKey: ["admin-broadcasts", tenantId] });
      onSuccess();
      onClose();
      if (scheduleAt) toast.success(`✅ Broadcast scheduled for ${format(new Date(scheduleAt), "dd MMM yyyy 'at' HH:mm")}`);
      else toast.success(`✅ Broadcast sent to ${recipientCount} recipients`);
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Failed to send broadcast.");
    } finally { setSending(false); }
  };

  const saveDraft = async () => {
    if (readOnly) return;
    if (!subject.trim()) { toast.error("Subject is required."); return; }
    setSavingDraft(true);
    try {
      const { error } = await supabase.from(TABLES.ADMIN_BROADCASTS).insert(buildPayload("draft") as any);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["admin-broadcasts", tenantId] });
      onSuccess(); onClose();
      toast.success("Draft saved successfully");
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Failed to save draft.");
    } finally { setSavingDraft(false); }
  };

  const pCfg = PRIORITY[priority as keyof typeof PRIORITY] ?? PRIORITY.normal;

  return (
    <>
      <Dialog open={open && !noEmailWarning} onOpenChange={v => !v && onClose()}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-5 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50"><Send className="h-4 w-4 text-orange-500" /></div>
              <div>
                <DialogTitle className="text-base font-semibold">New Broadcast</DialogTitle>
                <p className="text-xs text-slate-400 mt-0.5">Send a message to branch administrators, officers, or all members.</p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {/* Subject + Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Subject <span className="text-red-500">*</span></Label>
                <Input placeholder="Enter message subject" value={subject} onChange={e => setSubject(e.target.value)} className="focus:ring-orange-400 focus:border-orange-400" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        <div className="flex items-center gap-2"><div className={cn("h-2 w-2 rounded-full", v.dot)} />{v.label}</div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Message */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Message <span className="text-red-500">*</span></Label>
              <Textarea placeholder="Enter your message..." value={message} onChange={e => setMessage(e.target.value)} rows={5} />
              {/* Template Variables Preview */}
              {(subject.includes('{{') || message.includes('{{')) && churchData && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs font-medium text-blue-700 mb-2">📝 Preview (with variables replaced):</p>
                  {subject.includes('{{') && (
                    <div className="mb-2">
                      <p className="text-xs text-blue-600 font-medium">Subject:</p>
                      <p className="text-xs text-blue-800">{replaceTemplateVariables(subject, churchData)}</p>
                    </div>
                  )}
                  {message.includes('{{') && (
                    <div>
                      <p className="text-xs text-blue-600 font-medium">Message:</p>
                      <p className="text-xs text-blue-800 whitespace-pre-wrap">{replaceTemplateVariables(message, churchData)}</p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Available Template Variables */}
              <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="text-xs font-medium text-slate-700 mb-2">💡 Available template variables:</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <code className="bg-slate-200 px-1 rounded text-slate-800">{'{{church_name}}'}</code>
                    <span className="text-slate-600 ml-1">{churchData?.name || 'Church name'}</span>
                  </div>
                  <div>
                    <code className="bg-slate-200 px-1 rounded text-slate-800">{'{{church_city}}'}</code>
                    <span className="text-slate-600 ml-1">{churchData?.city || 'City'}</span>
                  </div>
                  <div>
                    <code className="bg-slate-200 px-1 rounded text-slate-800">{'{{church_phone}}'}</code>
                    <span className="text-slate-600 ml-1">{churchData?.phone || 'Phone'}</span>
                  </div>
                  <div>
                    <code className="bg-slate-200 px-1 rounded text-slate-800">{'{{church_email}}'}</code>
                    <span className="text-slate-600 ml-1">{churchData?.contact_email || 'Email'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Channels + Schedule */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Delivery Channels</Label>
                <div className="flex items-center gap-4">
                  {/* In-App — always on */}
                  <label className="flex items-center gap-2 cursor-not-allowed opacity-80">
                    <div className="h-4 w-4 rounded-full bg-orange-500 flex items-center justify-center"><div className="h-2 w-2 bg-white rounded-full" /></div>
                    <span className="text-sm">📱 In-App</span>
                    <span title="In-App notifications appear in the member's notification bell when they log into Vestry Hub." className="text-slate-400 cursor-help"><Info className="h-3.5 w-3.5" /></span>
                  </label>
                  {/* Email */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div onClick={() => toggleChannel("email")} className={cn("h-4 w-4 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors", channels.includes("email") ? "border-orange-500 bg-orange-500" : "border-slate-300")}>
                      {channels.includes("email") && <div className="h-2 w-2 bg-white rounded-full" />}
                    </div>
                    <span className="text-sm">📧 Email</span>
                  </label>
                  {/* Push */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div onClick={() => toggleChannel("push")} className={cn("h-4 w-4 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors", channels.includes("push") ? "border-orange-500 bg-orange-500" : "border-slate-300")}>
                      {channels.includes("push") && <div className="h-2 w-2 bg-white rounded-full" />}
                    </div>
                    <span className="text-sm">🔔 Push</span>
                    <span title="Push notifications are sent to members' devices even when they are not logged into the app. Requires the Vestry Hub mobile app." className="text-slate-400 cursor-help"><Info className="h-3.5 w-3.5" /></span>
                  </label>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />Schedule (Optional)</Label>
                <Input type="datetime-local" value={scheduleAt} onChange={e => setScheduleAt(e.target.value)} className="text-sm" />
                <p className="text-xs text-slate-400">Leave empty to send immediately</p>
              </div>
            </div>

            {/* Recipients */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Label className="text-sm font-medium">Recipients</Label>
                <button onClick={() => setRecipientType("all")} className={cn("flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors", recipientType === "all" ? "border-orange-400 bg-orange-50 text-orange-700" : "border-slate-200 text-slate-600 hover:bg-slate-50")}>
                  <div className={cn("h-3 w-3 rounded-full border-2", recipientType === "all" ? "border-orange-500 bg-orange-500" : "border-slate-400")} />
                  All Members ({memberCount})
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {/* Branches */}
                <div className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5"><Megaphone className="h-3.5 w-3.5" />Branches ({selectedBranches.length})</p>
                    <button onClick={() => { setRecipientType("branches"); setSelectedBranches(branches.map(b => b.id)); }} className="text-[10px] text-orange-500 hover:underline">All</button>
                  </div>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {branches.length === 0 ? <p className="text-xs text-slate-400">No branches found</p> : branches.map(b => (
                      <button key={b.id} onClick={() => { setRecipientType("branches"); setSelectedBranches(prev => prev.includes(b.id) ? prev.filter(x => x !== b.id) : [...prev, b.id]); }} className={cn("w-full flex items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors", selectedBranches.includes(b.id) ? "bg-orange-50 text-orange-700" : "hover:bg-slate-50 text-slate-700")}>
                        <div className={cn("h-3 w-3 rounded-full border-2 shrink-0", selectedBranches.includes(b.id) ? "border-orange-500 bg-orange-500" : "border-slate-300")} />
                        {b.name}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Officers */}
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 mb-2"><Users className="h-3.5 w-3.5" />Officers ({selectedOfficers.length})</p>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {officers.length === 0 ? <p className="text-xs text-slate-400">No officers found</p> : officers.map(o => (
                      <button key={o.id} onClick={() => { setRecipientType("officers"); setSelectedOfficers(prev => prev.includes(o.id) ? prev.filter(x => x !== o.id) : [...prev, o.id]); }} className={cn("w-full flex items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors", selectedOfficers.includes(o.id) ? "bg-orange-50 text-orange-700" : "hover:bg-slate-50 text-slate-700")}>
                        <div className={cn("h-3 w-3 rounded-full border-2 shrink-0", selectedOfficers.includes(o.id) ? "border-orange-500 bg-orange-500" : "border-slate-300")} />
                        {`${o.first_name ?? ""} ${o.last_name ?? ""}`.trim() || o.email || "—"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-500 font-medium">{recipientCount} recipients will receive this broadcast</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={saveDraft} disabled={savingDraft} className="gap-1.5">
              💾 {savingDraft ? "Saving..." : "Save as Draft"}
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button className="bg-orange-500 hover:bg-orange-600 text-white gap-1.5" onClick={sendBroadcast} disabled={sending}>
                <Send className="h-4 w-4" />{sending ? "Sending..." : "✈ Send Broadcast"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* No email warning */}
      <AlertDialog open={noEmailWarning} onOpenChange={v => !v && setNoEmailWarning(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Some recipients have no email</AlertDialogTitle>
            <AlertDialogDescription>⚠ {noEmailCount} recipients have no email address and will only receive the In-App notification.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setNoEmailWarning(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => { setNoEmailWarning(false); sendBroadcast(); }}>Send Anyway</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── Template Modal ────────────────────────────────────────────────────────────
function TemplateModal({ open, onClose, tenantId, editData, onSuccess }: { open: boolean; onClose: () => void; tenantId: string; editData?: BroadcastTemplate | null; onSuccess: () => void }) {
  const qc = useQueryClient();
  const isEdit = !!editData;
  const [name, setName]         = useState(editData?.name ?? "");
  const [subject, setSubject]   = useState(editData?.subject ?? "");
  const [message, setMessage]   = useState(editData?.message ?? "");
  const [priority, setPriority] = useState(editData?.priority ?? "normal");
  const [channels, setChannels] = useState<string[]>(editData?.channels ?? ["in_app"]);
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    if (open) { setName(editData?.name ?? ""); setSubject(editData?.subject ?? ""); setMessage(editData?.message ?? ""); setPriority(editData?.priority ?? "normal"); setChannels(editData?.channels ?? ["in_app"]); }
  }, [open, editData]);

  const toggleChannel = (ch: string) => { if (ch === "in_app") return; setChannels(prev => prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]); };

  const handleSave = async () => {
    if (!name.trim() || !subject.trim() || !message.trim()) { toast.error("Name, subject, and message are required."); return; }
    setSaving(true);
    try {
      const payload = { tenant_id: tenantId, name: name.trim(), subject: subject.trim(), message: message.trim(), priority, channels, is_system: false };
      if (isEdit && editData) {
        const { error } = await supabase.from(TABLES.BROADCAST_TEMPLATES).update(payload as any).eq("id", editData.id);
        if (error) throw error;
        toast.success("✅ Template updated.");
      } else {
        const { error } = await supabase.from(TABLES.BROADCAST_TEMPLATES).insert(payload as any);
        if (error) throw error;
        toast.success("✅ Template saved successfully.");
      }
      qc.invalidateQueries({ queryKey: ["broadcast-templates", tenantId] });
      onSuccess(); onClose();
    } catch (err: unknown) { toast.error((err as Error)?.message ?? "Failed."); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">{isEdit ? "Edit Template" : "New Template"}</DialogTitle>
          <p className="text-xs text-slate-400">Create reusable broadcast templates for common messages.</p>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Template Name <span className="text-red-500">*</span></Label>
            <Input placeholder="e.g., Weekly Update" value={name} onChange={e => setName(e.target.value)} className="focus:ring-orange-400 focus:border-orange-400" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Subject <span className="text-red-500">*</span></Label>
              <Input placeholder="Email subject" value={subject} onChange={e => setSubject(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(PRIORITY).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Message <span className="text-red-500">*</span></Label>
            <Textarea placeholder="Enter your message..." value={message} onChange={e => setMessage(e.target.value)} rows={5} />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Delivery Channels</Label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 opacity-80 cursor-not-allowed">
                <div className="h-4 w-4 rounded-full bg-orange-500 flex items-center justify-center"><div className="h-2 w-2 bg-white rounded-full" /></div>
                <span className="text-sm">📱 In-App</span>
              </label>
              {["email", "push"].map(ch => (
                <label key={ch} className="flex items-center gap-2 cursor-pointer" onClick={() => toggleChannel(ch)}>
                  <div className={cn("h-4 w-4 rounded-full border-2 flex items-center justify-center transition-colors", channels.includes(ch) ? "border-orange-500 bg-orange-500" : "border-slate-300")}>
                    {channels.includes(ch) && <div className="h-2 w-2 bg-white rounded-full" />}
                  </div>
                  <span className="text-sm">{ch === "email" ? "📧 Email" : "🔔 Push"}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Template"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── View Broadcast Modal ──────────────────────────────────────────────────────
function ViewBroadcastModal({ broadcast, onClose }: { broadcast: AdminBroadcast | null; onClose: () => void }) {
  if (!broadcast) return null;
  const pCfg = PRIORITY[broadcast.priority as keyof typeof PRIORITY] ?? PRIORITY.normal;
  return (
    <Dialog open={!!broadcast} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <DialogTitle className="text-base font-semibold">{broadcast.subject}</DialogTitle>
            <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium", pCfg.pill)}>{pCfg.label}</span>
          </div>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          {[
            { label: "Sent at", value: broadcast.sent_at ? format(new Date(broadcast.sent_at), "dd MMM yyyy · HH:mm") : "—" },
            { label: "Recipients", value: broadcast.total_recipients },
            { label: "Status", value: broadcast.status },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
              <span className="text-sm text-slate-500">{row.label}</span>
              <span className="text-sm font-semibold text-slate-800 capitalize">{String(row.value)}</span>
            </div>
          ))}
          <div className="py-2 border-b border-slate-100">
            <span className="text-sm text-slate-500 block mb-1">Channels</span>
            <ChannelPills channels={broadcast.channels ?? []} />
          </div>
          <div className="py-2 border-b border-slate-100">
            <span className="text-sm text-slate-500 block mb-1">Message</span>
            <p className="text-sm text-slate-800 whitespace-pre-wrap">{broadcast.message}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-600 mb-1.5">📧 Email Delivery</p>
              <p className="text-xs text-emerald-600">✅ Sent: {broadcast.email_sent_count}</p>
              <p className="text-xs text-red-500">❌ Failed: {broadcast.email_failed_count}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-600 mb-1.5">🔔 Push Notifications</p>
              <p className="text-xs text-emerald-600">✅ Sent: {broadcast.push_sent_count}</p>
              <p className="text-xs text-red-500">❌ Failed: {broadcast.push_failed_count}</p>
            </div>
          </div>
        </div>
        <Button variant="outline" className="w-full mt-2" onClick={onClose}>Close</Button>
      </DialogContent>
    </Dialog>
  );
}

// ── Main AdminBroadcast component ─────────────────────────────────────────────
export function AdminBroadcast() {
  const { tenantId, userId, name: churchName } = useChurch();
  const qc = useQueryClient();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('communication_tools');
  const [activeTab, setActiveTab] = useState("broadcasts");
  const [newBroadcastOpen, setNewBroadcastOpen] = useState(false);
  const [newTemplateOpen, setNewTemplateOpen] = useState(false);
  const [prefillData, setPrefillData] = useState<Partial<AdminBroadcast> | null>(null);
  const [viewBroadcast, setViewBroadcast] = useState<AdminBroadcast | null>(null);
  const [deleteBroadcast, setDeleteBroadcast] = useState<AdminBroadcast | null>(null);
  const [editTemplate, setEditTemplate] = useState<BroadcastTemplate | null>(null);
  const [deleteTemplate, setDeleteTemplate] = useState<BroadcastTemplate | null>(null);
  const [timeFilter, setTimeFilter] = useState(30);

  const { data: broadcasts = [], isLoading: broadcastsLoading, refetch: refetchBroadcasts } = useQuery<AdminBroadcast[]>({
    queryKey: ["admin-broadcasts", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.ADMIN_BROADCASTS).select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
      return (data ?? []) as AdminBroadcast[];
    },
    staleTime: 300_000,
  });

  const { data: templates = [], isLoading: templatesLoading, refetch: refetchTemplates } = useQuery<BroadcastTemplate[]>({
    queryKey: ["broadcast-templates", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.BROADCAST_TEMPLATES).select("*").eq("tenant_id", tenantId).order("is_system", { ascending: false }).order("created_at", { ascending: false });
      const existing = (data ?? []) as BroadcastTemplate[];
      const existingKeys = new Set(existing.filter(t => t.is_system).map(t => t.name));
      const missing = SEED_TEMPLATES.filter(s => !existingKeys.has(s.name));
      if (missing.length > 0) {
        const rows = missing.map(s => ({ ...s, tenant_id: tenantId, is_system: true }));
        await supabase.from(TABLES.BROADCAST_TEMPLATES).insert(rows as any);
        const { data: fresh } = await supabase.from(TABLES.BROADCAST_TEMPLATES).select("*").eq("tenant_id", tenantId).order("is_system", { ascending: false }).order("created_at", { ascending: false });
        return (fresh ?? []) as BroadcastTemplate[];
      }
      return existing;
    },
    staleTime: 300_000,
  });

  const deleteBroadcastMutation = useMutation({
    mutationFn: async (id: string) => {
      if (readOnly) return;
      const { error } = await supabase.from(TABLES.ADMIN_BROADCASTS).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-broadcasts", tenantId] }); setDeleteBroadcast(null); toast.success("Broadcast deleted."); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      if (readOnly) return;
      const { error } = await supabase.from(TABLES.BROADCAST_TEMPLATES).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["broadcast-templates", tenantId] }); setDeleteTemplate(null); toast.success("Template deleted."); },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleDuplicate = (b: AdminBroadcast) => {
    setPrefillData({ subject: b.subject, message: b.message, priority: b.priority, channels: b.channels });
    setNewBroadcastOpen(true);
  };

  const handleUseTemplate = (t: BroadcastTemplate) => {
    setPrefillData({ subject: t.subject, message: t.message, priority: t.priority, channels: t.channels });
    setNewBroadcastOpen(true);
  };

  const handleResend = async (b: AdminBroadcast) => {
    // Resend logic — duplicate and send immediately
    setPrefillData({ subject: b.subject, message: b.message, priority: b.priority, channels: b.channels });
    setNewBroadcastOpen(true);
  };

  // Analytics with proper calculations
  const since = subDays(new Date(), timeFilter);
  const filtered = broadcasts.filter(b => new Date(b.created_at) >= since);
  const totalSent = filtered.filter(b => b.status === "sent").length;
  
  // Get unique recipients count (total people in system, not cumulative sends)
  const { data: uniqueRecipients } = useQuery({
    queryKey: ["unique-recipients", tenantId],
    queryFn: async () => {
      const { count } = await supabase
        .from(TABLES.MEMBERS)
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .not("user_id", "is", null);
      return count ?? 0;
    },
    staleTime: 300000,
    enabled: activeTab === "analytics",
  });

  const totalRecipients = uniqueRecipients ?? 0; // Total unique people, not cumulative
  
  // Get actual read count from notifications (always call, but conditionally enable)
  const { data: readNotifications } = useQuery({
    queryKey: ["broadcast-read-count", tenantId, timeFilter],
    queryFn: async () => {
      const broadcastIds = filtered.map(b => b.id);
      if (broadcastIds.length === 0) return [];
      
      const { data } = await supabase
        .from(TABLES.NOTIFICATIONS)
        .select("user_id")
        .eq("tenant_id", tenantId)
        .eq("type", "broadcast")
        .eq("is_read", true)
        .gte("created_at", since.toISOString());
      
      // Count unique users who read (not total reads)
      const uniqueReaders = new Set((data ?? []).map(n => n.user_id));
      return Array.from(uniqueReaders);
    },
    staleTime: 30000,
    enabled: filtered.length > 0 && activeTab === "analytics",
  });

  const totalRead = readNotifications?.length ?? 0; // Unique people who read
  const readRate = totalRecipients > 0 ? ((totalRead / totalRecipients) * 100).toFixed(1) : "0.0";

  // Message counts (not recipient counts)
  const totalMessagesSent = filtered.reduce((s, b) => s + (b.status === "sent" ? 1 : 0), 0);
  const emailMessagesSent = filtered.reduce((s, b) => s + (b.channels?.includes("email") && b.status === "sent" ? 1 : 0), 0);
  const pushMessagesSent = filtered.reduce((s, b) => s + (b.channels?.includes("push") && b.status === "sent" ? 1 : 0), 0);
  const inAppMessagesSent = filtered.reduce((s, b) => s + (b.channels?.includes("in_app") && b.status === "sent" ? 1 : 0), 0);

  const recent5 = broadcasts.filter(b => b.status === "sent").slice(0, 5);

  return (
    <div className="space-y-5">
      {/* Tabs + Buttons */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
          {[
            { id: "broadcasts", icon: Radio, label: "Broadcasts" },
            { id: "analytics", icon: BarChart3, label: "Analytics" },
            { id: "templates", icon: FileText, label: "Templates" },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors", activeTab === tab.id ? "bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
                <Icon className="h-3.5 w-3.5" />{tab.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { refetchBroadcasts(); refetchTemplates(); }} className="gap-1.5">
            <RefreshCw className="h-4 w-4" />Refresh
          </Button>
          <PermissionButton permission="communication_tools" readOnly={readOnly} size="sm" className="bg-orange-500 hover:bg-orange-600 text-white gap-1.5" onClick={() => { setPrefillData(null); setNewBroadcastOpen(true); }}>
            <Plus className="h-4 w-4" />New Broadcast
          </PermissionButton>
        </div>
      </div>

      {/* TAB 1: Broadcasts */}
      {activeTab === "broadcasts" && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50"><Megaphone className="h-4 w-4 text-orange-500" /></div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Admin Broadcasts</p>
          </div>
          {broadcastsLoading ? (
            <div className="p-5 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
          ) : broadcasts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <MessageSquare className="h-10 w-10 opacity-30" />
              <p className="text-sm font-medium">No broadcasts sent yet</p>
              <p className="text-xs">Click 'New Broadcast' to send your first broadcast</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {broadcasts.map(b => {
                const pCfg = PRIORITY[b.priority as keyof typeof PRIORITY] ?? PRIORITY.normal;
                const pill = STATUS_PILL[b.status] ?? STATUS_PILL.draft;
                return (
                  <div key={b.id} className={cn("flex items-start justify-between gap-4 px-5 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors", pCfg.border)}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <div className={cn("h-2 w-2 rounded-full shrink-0", pCfg.dot)} />
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{b.subject}</p>
                      </div>
                      <p className="text-xs text-slate-400 truncate mb-1.5">{b.message.slice(0, 100)}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                        <span>📅 {b.sent_at ? format(new Date(b.sent_at), "dd MMM yyyy") : format(new Date(b.created_at), "dd MMM yyyy")}</span>
                        <span>👥 {b.total_recipients} recipients</span>
                        <ChannelPills channels={b.channels ?? []} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full border capitalize", pill)}>{b.status}</span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors" disabled={readOnly}>
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => setViewBroadcast(b)}><Eye className="h-3.5 w-3.5" />View</DropdownMenuItem>
                          <DropdownMenuItem disabled={readOnly} className="gap-2 cursor-pointer" onClick={() => handleDuplicate(b)}><Copy className="h-3.5 w-3.5" />Duplicate</DropdownMenuItem>
                          <DropdownMenuItem disabled={readOnly} className="gap-2 cursor-pointer" onClick={() => handleResend(b)}><RotateCcw className="h-3.5 w-3.5" />Resend</DropdownMenuItem>
                          <DropdownMenuItem disabled={readOnly} className="gap-2 cursor-pointer text-red-500 focus:text-red-500" onClick={() => setDeleteBroadcast(b)}><Trash2 className="h-3.5 w-3.5" />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Analytics */}
      {activeTab === "analytics" && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50"><BarChart3 className="h-4 w-4 text-orange-500" /></div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Broadcast Analytics</p>
              </div>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                {[7, 30, 90].map(d => (
                  <button key={d} onClick={() => setTimeFilter(d)} className={cn("px-3 py-1 rounded-md text-xs font-medium transition-colors", timeFilter === d ? "bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm" : "text-slate-500 hover:text-slate-700")}>{d} Days</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {[
                { icon: Send, color: "bg-blue-50 text-blue-500", value: totalMessagesSent, label: "Messages Sent" },
                { icon: Users, color: "bg-violet-50 text-violet-500", value: totalRecipients, label: "Total Recipients" },
                { icon: Eye, color: "bg-emerald-50 text-emerald-500", value: totalRead, label: "People Read" },
                { icon: TrendingUp, color: "bg-orange-50 text-orange-500", value: `${readRate}%`, label: "Read Rate" },
              ].map(({ icon: Icon, color, value, label }) => (
                <div key={label} className="rounded-xl border border-slate-100 p-4 text-center">
                  <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg mx-auto mb-2", color)}><Icon className="h-4 w-4" /></div>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* In-App */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4 text-orange-500" />
                📱 In-App Messages
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">✅ Sent</span>
                  <span className="font-semibold text-emerald-600">{inAppMessagesSent}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">❌ Failed</span>
                  <span className="font-semibold text-red-500">0</span>
                </div>
              </div>
            </div>
            {/* Email */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-1.5">
                <Mail className="h-4 w-4 text-blue-500" />
                📧 Email Messages
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">✅ Sent</span>
                  <span className="font-semibold text-emerald-600">{emailMessagesSent}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">❌ Failed</span>
                  <span className="font-semibold text-red-500">0</span>
                </div>
              </div>
            </div>
            {/* Push */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-1.5">
                <Bell className="h-4 w-4 text-orange-500" />
                🔔 Push Messages
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">✅ Sent</span>
                  <span className="font-semibold text-emerald-600">{pushMessagesSent}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">❌ Failed</span>
                  <span className="font-semibold text-red-500">0</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent broadcasts */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">Recent Broadcasts</p>
            {recent5.length === 0 ? <p className="text-xs text-slate-400 text-center py-4">No broadcasts yet</p> : (
              <div className="space-y-2">
                {recent5.map(b => (
                  <div key={b.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate uppercase">{b.subject}</p>
                      <p className="text-xs text-slate-400">{b.sent_at ? format(new Date(b.sent_at), "dd MMM yyyy") : "—"}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-slate-500">👥 {b.total_recipients}</span>
                      <span className="text-xs text-emerald-600">👁 {totalRead}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Templates */}
      {activeTab === "templates" && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50"><FileText className="h-4 w-4 text-orange-500" /></div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Broadcast Templates</p>
            </div>
            <PermissionButton permission="communication_tools" readOnly={readOnly} size="sm" className="bg-orange-500 hover:bg-orange-600 text-white gap-1.5" onClick={() => setNewTemplateOpen(true)}>
              <Plus className="h-4 w-4" />New Template
            </PermissionButton>
          </div>
          {templatesLoading ? (
            <div className="p-5 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <FileText className="h-10 w-10 opacity-30" />
              <p className="text-sm font-medium">No templates created yet</p>
              <button onClick={() => setNewTemplateOpen(true)} className="text-xs text-orange-500 hover:underline font-medium">Create your first template</button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {templates.map(t => (
                <div key={t.id} className="flex items-start justify-between gap-4 px-5 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{t.name}</p>
                      {t.is_system && <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">System</span>}
                    </div>
                    <p className="text-xs text-slate-500 truncate mb-1">{t.subject}</p>
                    <p className="text-xs text-slate-400 truncate mb-1.5">{t.message.slice(0, 80)}</p>
                    <ChannelPills channels={t.channels ?? []} />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors" disabled={readOnly}>
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {!t.is_system && <DropdownMenuItem disabled={readOnly} className="gap-2 cursor-pointer" onClick={() => setEditTemplate(t)}><Copy className="h-3.5 w-3.5" />Edit</DropdownMenuItem>}
                      <DropdownMenuItem disabled={readOnly} className="gap-2 cursor-pointer" onClick={() => handleUseTemplate(t)}><Copy className="h-3.5 w-3.5" />Use Template</DropdownMenuItem>
                      {!t.is_system && <DropdownMenuItem disabled={readOnly} className="gap-2 cursor-pointer text-red-500 focus:text-red-500" onClick={() => setDeleteTemplate(t)}><Trash2 className="h-3.5 w-3.5" />Delete</DropdownMenuItem>}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <BroadcastModal open={newBroadcastOpen} onClose={() => { setNewBroadcastOpen(false); setPrefillData(null); }} tenantId={tenantId} userId={userId} churchName={churchName} prefill={prefillData} onSuccess={() => {}} />
      <TemplateModal open={newTemplateOpen} onClose={() => setNewTemplateOpen(false)} tenantId={tenantId} onSuccess={() => {}} />
      <TemplateModal open={!!editTemplate} onClose={() => setEditTemplate(null)} tenantId={tenantId} editData={editTemplate} onSuccess={() => {}} />
      <ViewBroadcastModal broadcast={viewBroadcast} onClose={() => setViewBroadcast(null)} />

      <AlertDialog open={!!deleteBroadcast} onOpenChange={v => !v && setDeleteBroadcast(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this broadcast?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 hover:bg-red-600 text-white" onClick={() => deleteBroadcast && deleteBroadcastMutation.mutate(deleteBroadcast.id)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTemplate} onOpenChange={v => !v && setDeleteTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTemplate?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 hover:bg-red-600 text-white" onClick={() => deleteTemplate && deleteTemplateMutation.mutate(deleteTemplate.id)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}