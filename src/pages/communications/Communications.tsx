import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { TABLES } from "@/lib/schema";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Send, Plus, Mail, MessageSquare, Zap, FileText, LayoutTemplate,
  MessageCircle, BarChart2, CreditCard, Paintbrush, Radio,
  FlaskConical, History, Users, CalendarClock, CheckCircle2, X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { EmailBranding } from "./EmailBranding";
import { EmailTemplates } from "./EmailTemplates";
import { EmailAutomation } from "./EmailAutomation";
import { SmsTab } from "./SmsTab";
import { SmsTemplates } from "./SmsTemplates";
import { SmsCredits } from "./SmsCredits";
import { AdminBroadcast } from "./AdminBroadcast";
import { WhatsAppCloud } from "./whatsapp/WhatsAppCloudMain";
import WhatsAppDirectory from "./WhatsAppDirectory";
import { PremiumBroadcastsView } from "./components/PremiumBroadcastsView";
import { logActivity } from "@/lib/activityLogger";
import { format } from "date-fns";

// ── Nav structure ────────────────────────────────────────────────────────────

type NavItem = { id: string; label: string; icon: React.ElementType; group: string };

const NAV_ITEMS: NavItem[] = [
  { id: "broadcasts",        label: "Broadcasts",       icon: Send,           group: "General" },
  { id: "email",             label: "Email",            icon: Mail,           group: "Email" },
  { id: "email_templates",   label: "Email Templates",  icon: LayoutTemplate, group: "Email" },
  { id: "email_automation",  label: "Email Automation", icon: Zap,            group: "Email" },
  { id: "sms",               label: "SMS",              icon: MessageSquare,  group: "SMS" },
  { id: "sms_templates",     label: "SMS Templates",    icon: FileText,       group: "SMS" },
  { id: "whatsapp",          label: "WhatsApp",         icon: MessageCircle,  group: "WhatsApp" },
  { id: "credits",           label: "Credits",          icon: CreditCard,     group: "Settings" },
  { id: "branding",          label: "Branding",         icon: Paintbrush,     group: "Settings" },
  { id: "admin_broadcast",   label: "Admin Broadcast",  icon: Radio,          group: "Settings" },
];

const GROUPS = ["General", "Email", "SMS", "WhatsApp", "Settings"];

// ── Status helpers ───────────────────────────────────────────────────────────

const statusColors: Record<string, string> = {
  sent: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  failed: "bg-destructive/10 text-destructive",
};

// ── Coming Soon empty state ──────────────────────────────────────────────────

function ComingSoon({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 rounded-full bg-muted p-5">
        <Icon className="h-10 w-10 text-muted-foreground/50" />
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        {description ?? "This feature is coming soon. Check back later."}
      </p>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function Communications() {
  const { tenantId, userId, userEmail, userFirstName } = useChurch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState("email");
  const [showCompose, setShowCompose] = useState(false);
  const [form, setForm] = useState({ subject: "", body: "", recipient_type: "all_members", channel: "in_app" as string });
  const [metricsEmail, setMetricsEmail] = useState<null | { subject: string; recipient_count: number; status: string; sent_at: string | null; body: string }>(null);
  const [sendingTest, setSendingTest] = useState(false);

  const { data: broadcasts, isLoading } = useQuery({
    queryKey: ["broadcasts", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("broadcasts")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // ── Email tab data ────────────────────────────────────────────────────────────
  const { data: communications = [], isLoading: commsLoading } = useQuery({
    queryKey: ["communications", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from(TABLES.COMMUNICATIONS)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    staleTime: 300_000,
  });

  const { data: emailStats } = useQuery({
    queryKey: ["email-stats", tenantId],
    queryFn: async () => {
      const [totalRes, sentRes, membersRes, scheduledRes] = await Promise.all([
        supabase.from(TABLES.COMMUNICATIONS).select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("channel", "email"),
        supabase.from(TABLES.COMMUNICATIONS).select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("channel", "email").eq("status", "sent"),
        supabase.from(TABLES.MEMBERS).select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).not("email", "is", null),
        supabase.from(TABLES.COMMUNICATIONS).select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("channel", "email").eq("status", "scheduled"),
      ]);
      return {
        total: totalRes.count ?? 0,
        sent: sentRes.count ?? 0,
        withEmail: membersRes.count ?? 0,
        scheduled: scheduledRes.count ?? 0,
      };
    },
    staleTime: 300_000,
  });

  const handleSendTestEmail = async () => {
    if (!userEmail) { toast.error("No email address found for your account."); return; }
    setSendingTest(true);
    try {
      const { error } = await supabase.functions.invoke("send-communication", {
        body: {
          tenant_id: tenantId,
          is_test: true,
          admin_email: userEmail,
          admin_first_name: userFirstName || "Admin",
        },
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["communications", tenantId] });
      toast.success(`✅ Test email sent to ${userEmail}`);
    } catch {
      toast.error("❌ Failed to send test email. Check your email configuration.");
    } finally {
      setSendingTest(false);
    }
  };

  const sendBroadcast = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("broadcasts").insert({
        tenant_id: tenantId,
        subject: form.subject,
        body: form.body,
        channels: [form.channel],
        recipient_type: form.recipient_type,
        status: "sent",
        sent_by: userId,
        sent_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["broadcasts"] });
      toast.success("Message sent successfully");
      setShowCompose(false);
      logActivity({ churchId: tenantId!, actionType: "new_broadcast", description: `Broadcast "${form.subject}" was sent via ${form.channel}`, entityType: "broadcast", entityName: form.subject });
      setForm({ subject: "", body: "", recipient_type: "all_members", channel: "in_app" });
    },
    onError: () => toast.error("Failed to send message"),
  });

  const sentCount = broadcasts?.filter(b => b.status === "sent").length || 0;
  const draftCount = broadcasts?.filter(b => b.status === "draft").length || 0;

  const activeItem = NAV_ITEMS.find(n => n.id === activeSection)!;

  return (
    <div>
      <PageHeader
        title="Communications"
        subtitle="Send emails, SMS, WhatsApp and manage automated notifications"
        action={
          <Button onClick={() => navigate("/communications/compose")}>
            <Plus className="mr-2 h-4 w-4" />Compose Message
          </Button>
        }
      />

      <div className="flex gap-6">
        {/* ── Left sidebar nav ── */}
        <aside className="w-52 shrink-0">
          <nav className="space-y-5">
            {GROUPS.map(group => {
              const items = NAV_ITEMS.filter(n => n.group === group);
              return (
                <div key={group}>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-2 mb-1">{group}</p>
                  <div className="space-y-0.5">
                    {items.map(item => {
                      const Icon = item.icon;
                      const isActive = activeSection === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setActiveSection(item.id)}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors text-left",
                            isActive
                              ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-medium"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          {item.label}
                          {item.id === "broadcasts" && draftCount > 0 && (
                            <span className="ml-auto inline-flex items-center justify-center rounded-full bg-orange-500 text-white text-[10px] font-semibold min-w-[16px] h-4 px-1">
                              {draftCount}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        </aside>

        {/* ── Main content area ── */}
        <div className="flex-1 min-w-0">

          {/* ── BROADCASTS (Premium View) ── */}
          {activeSection === "broadcasts" && (
            <PremiumBroadcastsView />
          )}

          {/* ── EMAIL ── */}
          {activeSection === "email" && (
            <>
              {/* Top action buttons */}
              <div className="flex items-center gap-2 mb-5 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSendTestEmail}
                  disabled={sendingTest}
                  className="gap-1.5"
                >
                  <FlaskConical className="h-4 w-4" />
                  {sendingTest ? "Sending..." : "Send Test Email"}
                </Button>
                <Button
                  size="sm"
                  className="bg-orange-500 hover:bg-orange-600 text-white gap-1.5"
                  onClick={() => navigate("/communications/compose")}
                >
                  <Plus className="h-4 w-4" /> Compose Message
                </Button>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50"><Mail className="h-4 w-4 text-blue-500" /></div>
                  </div>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{emailStats?.total ?? 0}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Total Emails Sent</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50"><CheckCircle2 className="h-4 w-4 text-emerald-500" /></div>
                  </div>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{emailStats?.sent ?? 0}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Successfully Sent</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50"><Users className="h-4 w-4 text-violet-500" /></div>
                  </div>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{emailStats?.withEmail ?? 0}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Members with Email</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50"><CalendarClock className="h-4 w-4 text-amber-500" /></div>
                  </div>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{emailStats?.scheduled ?? 0}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Scheduled Emails</p>
                </div>
              </div>

              {/* Communication History */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50">
                    <History className="h-4 w-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Communication History</p>
                    <p className="text-xs text-slate-500">View all sent messages and their status</p>
                  </div>
                </div>

                {commsLoading ? (
                  <div className="p-5 space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                  </div>
                ) : communications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                    <Mail className="h-10 w-10 opacity-30" />
                    <p className="text-sm font-medium">No emails sent yet</p>
                    <p className="text-xs">Compose your first email to get started.</p>
                    <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white mt-1" onClick={() => navigate("/communications/compose")}>
                      <Plus className="h-4 w-4 mr-1.5" /> Compose Message
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-700">
                    {communications.map((comm: any) => {
                      const isTest = comm.is_test;
                      const statusColor: Record<string, string> = {
                        sent: "bg-emerald-100 text-emerald-700 border-emerald-200",
                        failed: "bg-red-100 text-red-700 border-red-200",
                        scheduled: "bg-blue-100 text-blue-700 border-blue-200",
                        draft: "bg-slate-100 text-slate-600 border-slate-200",
                      };
                      const pill = statusColor[comm.status] ?? statusColor.draft;
                      const channelIcon = comm.channel === "email" ? "📧" : "💬";
                      const sentAt = comm.sent_at ?? comm.scheduled_at ?? comm.created_at;
                      return (
                        <div key={comm.id} className="flex items-start justify-between gap-4 px-5 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-base">{channelIcon}</span>
                              {isTest && <span className="text-base">✏</span>}
                              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                                {comm.subject ?? "(No subject)"}
                              </p>
                            </div>
                            <p className="text-xs text-slate-400 truncate mb-1.5">
                              {(comm.body ?? "").replace(/<[^>]+>/g, "").slice(0, 120)}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                              <span>👥 {comm.recipient_count ?? 0} recipients</span>
                              <span>🕐 {sentAt ? format(new Date(sentAt), "dd MMM yyyy · HH:mm") : "—"}</span>
                              <button
                                onClick={() => setMetricsEmail({
                                  subject: comm.subject ?? "(No subject)",
                                  recipient_count: comm.recipient_count ?? 0,
                                  status: comm.status ?? "sent",
                                  sent_at: sentAt,
                                  body: comm.body ?? "",
                                })}
                                className="text-orange-500 hover:text-orange-600 font-medium"
                              >
                                📊 View Metrics
                              </button>
                            </div>
                          </div>
                          <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border capitalize ${pill}`}>
                            {comm.status ?? "sent"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Metrics Modal */}
              {metricsEmail && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                  <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md p-6 relative">
                    <button
                      onClick={() => setMetricsEmail(null)}
                      className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                    <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-4 pr-6">
                      {metricsEmail.subject} — Metrics
                    </h3>
                    <div className="space-y-3">
                      {[
                        { label: "Total Recipients", value: metricsEmail.recipient_count },
                        { label: "Successfully Delivered", value: metricsEmail.status === "sent" ? metricsEmail.recipient_count : 0 },
                        { label: "Failed / Bounced", value: metricsEmail.status === "failed" ? metricsEmail.recipient_count : 0 },
                        { label: "Status", value: metricsEmail.status },
                        { label: "Sent at", value: metricsEmail.sent_at ? format(new Date(metricsEmail.sent_at), "dd MMM yyyy · HH:mm") : "—" },
                      ].map(row => (
                        <div key={row.label} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                          <span className="text-sm text-slate-500">{row.label}</span>
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 capitalize">{String(row.value)}</span>
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" className="w-full mt-4" onClick={() => setMetricsEmail(null)}>Close</Button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── EMAIL TEMPLATES ── */}
          {activeSection === "email_templates" && (
            <EmailTemplates />
          )}

          {/* ── EMAIL AUTOMATION ── */}
          {activeSection === "email_automation" && (
            <EmailAutomation />
          )}

          {/* ── SMS ── */}
          {activeSection === "sms" && <SmsTab />}

          {/* ── SMS TEMPLATES ── */}
          {activeSection === "sms_templates" && <SmsTemplates />}

          {/* ── CREDITS ── */}
          {activeSection === "credits" && <SmsCredits />}

          {/* ── WHATSAPP ── */}
          {activeSection === "whatsapp" && (
            <WhatsAppDirectory />
          )}

          {/* ── BRANDING ── */}
          {activeSection === "branding" && (
            <EmailBranding />
          )}

          {/* ── ADMIN BROADCAST ── */}
          {activeSection === "admin_broadcast" && (
            <AdminBroadcast />
          )}

        </div>
      </div>

      {/* ── Compose Sheet (unchanged) ── */}
      <Sheet open={showCompose} onOpenChange={setShowCompose}>
        <SheetContent className="w-full max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>Compose Message</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-6">
            <div>
              <Label>Subject *</Label>
              <Input value={form.subject} onChange={(e) => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Message subject..." />
            </div>
            <div>
              <Label>Message Body *</Label>
              <Textarea value={form.body} onChange={(e) => setForm(f => ({ ...f, body: e.target.value }))} placeholder="Write your message..." rows={8} />
              <p className="text-xs text-muted-foreground mt-1">Supports variables: {"{first_name}"}, {"{church_name}"}</p>
            </div>
            <div>
              <Label>Channel</Label>
              <Select value={form.channel} onValueChange={(v) => setForm(f => ({ ...f, channel: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_app">In-App Notification</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms" disabled>SMS (Coming Soon)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Recipients</Label>
              <Select value={form.recipient_type} onValueChange={(v) => setForm(f => ({ ...f, recipient_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_members">All Members</SelectItem>
                  <SelectItem value="specific_groups">Specific Groups</SelectItem>
                  <SelectItem value="staff_only">Staff Only</SelectItem>
                  <SelectItem value="visitor">Visitors</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => {
                supabase.from("broadcasts").insert({
                  tenant_id: tenantId, subject: form.subject, body: form.body,
                  channels: [form.channel], recipient_type: form.recipient_type, status: "draft", sent_by: userId,
                }).then(() => {
                  queryClient.invalidateQueries({ queryKey: ["broadcasts"] });
                  toast.success("Saved as draft");
                  setShowCompose(false);
                });
              }}>Save Draft</Button>
              <Button className="flex-1" disabled={!form.subject || !form.body || sendBroadcast.isPending} onClick={() => sendBroadcast.mutate()}>
                <Send className="mr-2 h-4 w-4" />{sendBroadcast.isPending ? "Sending..." : "Send Now"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
