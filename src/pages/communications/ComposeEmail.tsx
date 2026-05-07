import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, Users, Mail, MessageSquare, Sparkles, Eye, Paperclip, Clock,
  Search, X, ChevronDown,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Member {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  status: string | null;
  gender: string | null;
  date_of_birth: string | null;
  join_date: string | null;
}

interface EmailCategory { id: string; name: string; is_active: boolean; }
interface EmailTemplate { id: string; name: string; subject: string; body: string; }

// ── AI Draft Modal ─────────────────────────────────────────────────────────────
function AIDraftModal({
  open, onClose, churchName, tenantId,
  onGenerated,
}: {
  open: boolean;
  onClose: () => void;
  churchName: string;
  tenantId: string;
  onGenerated: (subject: string, body: string) => void;
}) {
  const [emailType, setEmailType] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [context, setContext] = useState("");
  const [generating, setGenerating] = useState(false);

  const { data: categories = [] } = useQuery<EmailCategory[]>({
    queryKey: ["email-categories", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from(TABLES.EMAIL_CATEGORIES)
        .select("id, name, is_active")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("sort_order");
      return (data ?? []) as EmailCategory[];
    },
    staleTime: 300_000,
    enabled: open,
  });

  const handleGenerate = async () => {
    if (!emailType) { toast.error("Please select an email type."); return; }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-ai-email", {
        body: { email_type: emailType, church_name: churchName, recipient_name: recipientName || undefined, additional_context: context || undefined },
      });
      if (error) throw error;
      const generatedBody: string = data?.body ?? "";
      const suggestedSubject = `A Message from ${churchName}`;
      onGenerated(suggestedSubject, generatedBody);
      toast.success("✨ AI draft generated. Review and edit before sending.");
      onClose();
    } catch {
      toast.error("Failed to generate draft. Please try again.");
    } finally {
      setGenerating(false);
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
            <DialogTitle className="text-base font-semibold">AI Email Draft Assistant</DialogTitle>
          </div>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Email Type <span className="text-red-500">*</span></Label>
              <Select value={emailType} onValueChange={setEmailType}>
                <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Recipient Name <span className="text-slate-400 font-normal">(optional)</span></Label>
              <Input placeholder="John Smith" value={recipientName} onChange={e => setRecipientName(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Additional Context <span className="text-slate-400 font-normal">(optional)</span></Label>
            <Textarea
              rows={4}
              placeholder="Add any specific details you'd like to include..."
              value={context}
              onChange={e => setContext(e.target.value)}
            />
            <p className="text-xs text-slate-400">e.g., mention the upcoming Easter service, reference their recent donation, etc.</p>
          </div>
        </div>
        <Button
          className="w-full bg-orange-500 hover:bg-orange-600 text-white gap-2 mt-2"
          onClick={handleGenerate}
          disabled={generating || !emailType}
        >
          <Sparkles className="h-4 w-4" />
          {generating ? "Generating..." : "✨ Generate Draft"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

// ── Preview Recipients Modal ───────────────────────────────────────────────────
function PreviewRecipientsModal({ open, onClose, members }: { open: boolean; onClose: () => void; members: Member[] }) {
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Selected Recipients ({members.length})</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {members.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No recipients selected.</p>
          ) : members.map(m => (
            <div key={m.id} className="flex items-center gap-3 py-2.5 px-1">
              <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-orange-600">
                  {(m.first_name?.[0] ?? "?").toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">
                  {`${m.first_name ?? ""} ${m.last_name ?? ""}`.trim() || "—"}
                </p>
                <p className="text-xs text-slate-400 truncate">{m.email ?? "No email"}</p>
              </div>
              <span className={cn(
                "ml-auto shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full border",
                m.status === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"
              )}>{m.status ?? "—"}</span>
            </div>
          ))}
        </div>
        <Button variant="outline" className="mt-3" onClick={onClose}>Close</Button>
      </DialogContent>
    </Dialog>
  );
}

// ── Main ComposeEmail page ─────────────────────────────────────────────────────
export default function ComposeEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { tenantId, name: churchName } = useChurch();
  const queryClient = useQueryClient();

  // Recipients state
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterGender, setFilterGender] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Compose state
  const [channel, setChannel] = useState<"email" | "sms">(searchParams.get("channel") as "email" | "sms" || "email");
  const [templateId, setTemplateId] = useState("");
  const [subject, setSubject] = useState(searchParams.get("subject") || "");
  const [previewText, setPreviewText] = useState("");
  const [message, setMessage] = useState(searchParams.get("body") || "");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [smsMessage, setSmsMessage] = useState(searchParams.get("body") || "");

  // Draft data from URL parameters
  const draftId = searchParams.get("draftId");
  const recipientName = searchParams.get("recipientName");
  const recipientId = searchParams.get("recipientId");
  const recipientType = searchParams.get("recipientType");

  // Initialize form with draft data
  useEffect(() => {
    if (draftId && recipientId && recipientType) {
      // Pre-select the recipient if it's a specific person
      if (recipientType === "visitor" || recipientType === "specific_member") {
        setSelectedIds(new Set([recipientId]));
      }
      
      // Show a toast to indicate the draft was loaded
      toast.success(`Draft message loaded for ${recipientName || "recipient"}`);
    }
  }, [draftId, recipientId, recipientType, recipientName]);

  // Modal state
  const [aiDraftOpen, setAiDraftOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: members = [], isLoading: membersLoading } = useQuery<Member[]>({
    queryKey: ["members-compose", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from(TABLES.MEMBERS)
        .select("id, first_name, last_name, email, status, gender, date_of_birth, join_date")
        .eq("tenant_id", tenantId)
        .order("first_name");
      return (data ?? []) as Member[];
    },
    staleTime: 300_000,
  });

  const { data: templates = [] } = useQuery<EmailTemplate[]>({
    queryKey: ["email-templates-compose", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from(TABLES.EMAIL_TEMPLATES)
        .select("id, name, subject, body")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("name");
      return (data ?? []) as EmailTemplate[];
    },
    staleTime: 300_000,
  });

  // ── Filtering ─────────────────────────────────────────────────────────────────
  const filtered = members.filter(m => {
    const q = search.toLowerCase();
    const nameMatch = `${m.first_name ?? ""} ${m.last_name ?? ""}`.toLowerCase().includes(q);
    const emailMatch = (m.email ?? "").toLowerCase().includes(q);
    const statusMatch = filterStatus === "all" || (m.status ?? "").toLowerCase() === filterStatus.toLowerCase();
    const genderMatch = filterGender === "all" || (m.gender ?? "").toLowerCase() === filterGender.toLowerCase();
    return (nameMatch || emailMatch) && statusMatch && genderMatch;
  });

  const selectedMembers = members.filter(m => selectedIds.has(m.id));

  const toggleMember = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      filtered.forEach(m => next.add(m.id));
      return next;
    });
  };

  const clearAll = () => setSelectedIds(new Set());

  // ── Template apply ────────────────────────────────────────────────────────────
  const applyTemplate = (id: string) => {
    const tpl = templates.find(t => t.id === id);
    if (!tpl) return;
    setSubject(tpl.subject);
    setMessage(tpl.body);
    setTemplateId(id);
  };

  // ── Send ──────────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (channel === "email") {
      if (selectedIds.size === 0) { toast.error("Select at least one recipient."); return; }
      if (!subject.trim()) { toast.error("Subject is required."); return; }
      if (!message.trim()) { toast.error("Message is required."); return; }
    } else {
      if (selectedIds.size === 0) { toast.error("Select at least one recipient."); return; }
      if (!smsMessage.trim()) { toast.error("SMS message is required."); return; }
    }

    setSending(true);
    try {
      const recipients = selectedMembers
        .filter(m => m.email)
        .map(m => ({
          email: m.email!,
          first_name: m.first_name ?? "",
          last_name: m.last_name ?? "",
          name: `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim(),
        }));

      const scheduleAt = scheduleEnabled && scheduleDate && scheduleTime
        ? new Date(`${scheduleDate}T${scheduleTime}`).toISOString()
        : undefined;

      const { error } = await supabase.functions.invoke("send-communication", {
        body: {
          tenant_id: tenantId,
          channel,
          subject: channel === "email" ? subject : undefined,
          body: channel === "email" ? message : smsMessage,
          recipients,
          schedule_at: scheduleAt,
        },
      });
      if (error) throw error;

      // If this was sent from a draft, update the draft status to "sent"
      if (draftId) {
        try {
          // Try broadcasts table first (for visitor follow-ups)
          const { error: broadcastError } = await supabase
            .from(TABLES.BROADCASTS)
            .update({
              status: scheduleAt ? "scheduled" : "sent",
              sent_at: scheduleAt || new Date().toISOString(),
              channel: channel,
              channels: [channel]
            })
            .eq("id", draftId);

          // If not found in broadcasts, try communications table
          if (broadcastError) {
            await supabase
              .from(TABLES.COMMUNICATIONS)
              .update({
                status: scheduleAt ? "scheduled" : "sent",
                sent_at: scheduleAt || new Date().toISOString(),
                channel: channel
              })
              .eq("id", draftId);
          }
        } catch (draftError) {
          console.warn("Failed to update draft status:", draftError);
          // Don't fail the whole operation if draft update fails
        }
      }

      queryClient.invalidateQueries({ queryKey: ["communications", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["broadcasts", tenantId] });

      if (scheduleAt) {
        toast.success(`✅ ${channel === "email" ? "Email" : "SMS"} scheduled for ${format(new Date(scheduleAt), "dd MMM yyyy 'at' HH:mm")}`);
      } else {
        toast.success(`✅ ${channel === "email" ? "Email" : "SMS"} sent to ${recipients.length} recipient${recipients.length !== 1 ? "s" : ""}.`);
      }
      navigate("/communications");
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "Failed to send.");
    } finally {
      setSending(false);
    }
  };

  const smsChars = smsMessage.length;
  const smsSegments = Math.ceil(smsChars / 160) || 1;

  const uniqueStatuses = Array.from(new Set(members.map(m => m.status).filter(Boolean)));
  const uniqueGenders = Array.from(new Set(members.map(m => m.gender).filter(Boolean)));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/communications")}
              className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">Compose Message</h1>
              <p className="text-xs text-slate-500">
                {selectedIds.size > 0
                  ? <span className="text-orange-600 font-medium">{selectedIds.size} recipient{selectedIds.size !== 1 ? "s" : ""} selected</span>
                  : "0 recipients selected"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
              <Users className="h-4 w-4 mr-1.5" />
              Preview Recipients
            </Button>
            <Button
              size="sm"
              className="bg-orange-500 hover:bg-orange-600 text-white gap-1.5"
              onClick={handleSend}
              disabled={sending}
            >
              {sending ? "Sending..." : channel === "email" ? "Send Email" : "Send SMS"}
            </Button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── LEFT: Select Recipients (40%) ── */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50">
                <Users className="h-4 w-4 text-orange-500" />
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Select Recipients</p>
            </div>
            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search members..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>
            {/* Filters */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="text-xs h-8"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {uniqueStatuses.map(s => <SelectItem key={s!} value={s!}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterGender} onValueChange={setFilterGender}>
                <SelectTrigger className="text-xs h-8"><SelectValue placeholder="All Genders" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Genders</SelectItem>
                  {uniqueGenders.map(g => <SelectItem key={g!} value={g!}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {/* Select all filtered */}
            <div className="flex items-center justify-between">
              <button
                onClick={selectAllFiltered}
                className="flex items-center gap-2 text-xs text-orange-600 hover:text-orange-700 font-medium"
              >
                <div className="h-4 w-4 rounded-full border-2 border-orange-500 flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-orange-500" />
                </div>
                Select all filtered ({filtered.length})
              </button>
              {selectedIds.size > 0 && (
                <button onClick={clearAll} className="text-xs text-slate-400 hover:text-slate-600">Clear all</button>
              )}
            </div>
          </div>

          {/* Member list */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-700 max-h-[500px]">
            {membersLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">No members found.</div>
            ) : filtered.map(m => {
              const isSelected = selectedIds.has(m.id);
              const name = `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim() || "—";
              return (
                <button
                  key={m.id}
                  onClick={() => toggleMember(m.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                    isSelected
                      ? "bg-orange-50 dark:bg-orange-900/20 border-l-2 border-l-orange-500"
                      : "hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  )}
                >
                  <div className={cn(
                    "h-5 w-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors",
                    isSelected ? "border-orange-500 bg-orange-500" : "border-slate-300"
                  )}>
                    {isSelected && <div className="h-2 w-2 bg-white rounded-full" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate uppercase">{name}</p>
                    <p className="text-xs text-slate-400 truncate">{m.email ?? "No email"}</p>
                  </div>
                  <span className={cn(
                    "shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full border",
                    m.status === "Active"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-slate-100 text-slate-500 border-slate-200"
                  )}>{m.status ?? "—"}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── RIGHT: Compose Email (60%) ── */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50">
                <Mail className="h-4 w-4 text-orange-500" />
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {channel === "email" ? "Compose Email" : "Compose SMS"}
              </p>
            </div>
            {/* Channel tabs */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
              <button
                onClick={() => setChannel("email")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                  channel === "email"
                    ? "bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                <Mail className="h-3.5 w-3.5" /> Email
              </button>
              <button
                onClick={() => setChannel("sms")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                  channel === "sms"
                    ? "bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                <MessageSquare className="h-3.5 w-3.5" /> SMS
              </button>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {channel === "email" ? (
              <>
                {/* Template + AI Draft row */}
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select value={templateId} onValueChange={applyTemplate}>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Use a template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 shrink-0 hover:border-orange-400 hover:text-orange-500"
                    onClick={() => setAiDraftOpen(true)}
                  >
                    <Sparkles className="h-3.5 w-3.5" /> AI Draft
                  </Button>
                </div>

                {/* Subject */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Subject</Label>
                  <Input
                    placeholder="Enter email subject..."
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                  />
                </div>

                {/* Preview text */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Preview Text <span className="text-slate-400 font-normal">(optional)</span></Label>
                  <Input
                    placeholder="This appears in the inbox preview..."
                    value={previewText}
                    onChange={e => setPreviewText(e.target.value)}
                  />
                  <p className="text-xs text-slate-400">This is the preview text recipients see before opening the email</p>
                </div>

                {/* Message */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Message</Label>
                  <Textarea
                    placeholder={"Write your email message here. Use {{first_name}}, {{last_name}}, or {{full_name}} for personalization..."}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    rows={8}
                    className="resize-y"
                  />
                </div>

                {/* Attachments */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <Paperclip className="h-3.5 w-3.5" /> Attachments
                    </Label>
                    <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                      Add File
                    </Button>
                    <input
                      ref={fileRef}
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*"
                      className="hidden"
                      onChange={e => {
                        const files = Array.from(e.target.files ?? []);
                        if (attachments.length + files.length > 5) { toast.error("Max 5 files allowed."); return; }
                        setAttachments(prev => [...prev, ...files]);
                      }}
                    />
                  </div>
                  <p className="text-xs text-slate-400">Max 5 files, 10MB each. Supported: PDF, Word, Excel, PowerPoint, images</p>
                  {attachments.length > 0 && (
                    <div className="space-y-1.5">
                      {attachments.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                          <Paperclip className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="flex-1 truncate text-slate-700">{f.name}</span>
                          <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}>
                            <X className="h-3.5 w-3.5 text-slate-400 hover:text-red-500" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Schedule */}
                <div className="space-y-3 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium flex items-center gap-1.5 cursor-pointer" onClick={() => setScheduleEnabled(v => !v)}>
                      <Clock className="h-3.5 w-3.5" /> Schedule for later
                    </Label>
                    <Switch
                      checked={scheduleEnabled}
                      onCheckedChange={setScheduleEnabled}
                      className="data-[state=checked]:bg-orange-500"
                    />
                  </div>
                  {scheduleEnabled && (
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">Send Date</Label>
                        <Input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">Send Time</Label>
                        <Input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} className="text-sm" />
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* SMS compose */
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Message</Label>
                  <Textarea
                    placeholder="Write your SMS message..."
                    value={smsMessage}
                    onChange={e => setSmsMessage(e.target.value)}
                    rows={5}
                  />
                  <div className="flex items-center justify-between text-xs">
                    <span className={cn("text-slate-400", smsChars > 140 && "text-amber-500 font-medium")}>
                      {smsChars}/160 characters
                    </span>
                    {smsChars > 160 && (
                      <span className="text-amber-600 font-medium">
                        This will be sent as {smsSegments} SMS messages
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <AIDraftModal
        open={aiDraftOpen}
        onClose={() => setAiDraftOpen(false)}
        churchName={churchName}
        tenantId={tenantId}
        onGenerated={(s, b) => { setSubject(s); setMessage(b); }}
      />
      <PreviewRecipientsModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        members={selectedMembers}
      />
    </div>
  );
}
