import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
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
  MessageCircle, BarChart2, CreditCard, Paintbrush, Radio, Bot,
  FlaskConical, Clock, CheckCircle,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { logActivity } from "@/lib/activityLogger";
import { cn } from "@/lib/utils";

// ── Nav structure ────────────────────────────────────────────────────────────

type NavItem = { id: string; label: string; icon: React.ElementType; group: string };

const NAV_ITEMS: NavItem[] = [
  { id: "broadcasts",        label: "Broadcasts",       icon: Send,           group: "General" },
  { id: "email",             label: "Email",            icon: Mail,           group: "Email" },
  { id: "email_templates",   label: "Email Templates",  icon: LayoutTemplate, group: "Email" },
  { id: "email_automation",  label: "Email Automation", icon: Zap,            group: "Email" },
  { id: "sms",               label: "SMS",              icon: MessageSquare,  group: "SMS" },
  { id: "sms_templates",     label: "SMS Templates",    icon: FileText,       group: "SMS" },
  { id: "whatsapp",          label: "WhatsApp Cloud",   icon: MessageCircle,  group: "WhatsApp" },
  { id: "wa_templates",      label: "WA Templates",     icon: LayoutTemplate, group: "WhatsApp" },
  { id: "wa_automation",     label: "WA Automation",    icon: Zap,            group: "WhatsApp" },
  { id: "wa_report",         label: "WA Report",        icon: BarChart2,      group: "WhatsApp" },
  { id: "credits",           label: "Credits",          icon: CreditCard,     group: "Settings" },
  { id: "branding",          label: "Branding",         icon: Paintbrush,     group: "Settings" },
  { id: "admin_broadcast",   label: "Admin Broadcast",  icon: Radio,          group: "Settings" },
  { id: "ai_draft",          label: "AI Draft",         icon: Bot,            group: "Tools" },
  { id: "test_email",        label: "Test Email",       icon: FlaskConical,   group: "Tools" },
];

const GROUPS = ["General", "Email", "SMS", "WhatsApp", "Settings", "Tools"];

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
  const { tenantId, userId } = useChurch();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState("broadcasts");
  const [showCompose, setShowCompose] = useState(false);
  const [form, setForm] = useState({ subject: "", body: "", recipient_type: "all_members", channel: "in_app" as string });

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
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setActiveSection("ai_draft")}>
              <Bot className="mr-2 h-4 w-4" />AI Draft
            </Button>
            <Button variant="outline" onClick={() => setActiveSection("test_email")}>
              <FlaskConical className="mr-2 h-4 w-4" />Send Test Email
            </Button>
            <Button onClick={() => { setActiveSection("broadcasts"); setShowCompose(true); }}>
              <Plus className="mr-2 h-4 w-4" />Compose Message
            </Button>
          </div>
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

          {/* ── BROADCASTS (existing logic, untouched) ── */}
          {activeSection === "broadcasts" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <Card><CardContent className="pt-5"><p className="text-sm text-muted-foreground">Messages Sent</p><p className="text-3xl font-bold">{sentCount}</p></CardContent></Card>
                <Card><CardContent className="pt-5"><p className="text-sm text-muted-foreground">Drafts</p><p className="text-3xl font-bold">{draftCount}</p></CardContent></Card>
                <Card><CardContent className="pt-5"><p className="text-sm text-muted-foreground">Total Broadcasts</p><p className="text-3xl font-bold">{broadcasts?.length || 0}</p></CardContent></Card>
              </div>

              <Tabs defaultValue="sent">
                <TabsList>
                  <TabsTrigger value="sent">Sent Messages</TabsTrigger>
                  <TabsTrigger value="drafts" className="relative">
                    Drafts & Scheduled
                    {draftCount > 0 && (
                      <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-orange-500 text-white text-[10px] font-semibold min-w-[16px] h-4 px-1">
                        {draftCount}
                      </span>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="sent">
                  <Card>
                    <CardContent className="pt-6">
                      {isLoading ? (
                        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                      ) : !broadcasts?.filter(b => b.status === "sent").length ? (
                        <div className="text-center py-12">
                          <Send className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
                          <p className="text-lg font-medium">No messages sent yet</p>
                          <p className="text-muted-foreground text-sm">Compose your first broadcast message.</p>
                          <Button className="mt-4" onClick={() => setShowCompose(true)}>Compose Message</Button>
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Subject</TableHead>
                              <TableHead>Recipients</TableHead>
                              <TableHead>Channel</TableHead>
                              <TableHead>Sent At</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {broadcasts.filter(b => b.status === "sent").map((msg) => (
                              <TableRow key={msg.id}>
                                <TableCell className="font-medium">{msg.subject}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">{msg.recipient_type?.replace(/_/g, " ")}</TableCell>
                                <TableCell><Badge variant="secondary">{(msg.channels as string[])?.[0] || "in_app"}</Badge></TableCell>
                                <TableCell className="text-sm">{msg.sent_at ? format(new Date(msg.sent_at), "dd MMM yyyy · HH:mm") : "—"}</TableCell>
                                <TableCell><Badge className={statusColors[msg.status || "sent"]}>{msg.status}</Badge></TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="drafts">
                  <Card>
                    <CardContent className="pt-6">
                      {!broadcasts?.filter(b => b.status === "draft" || b.status === "scheduled").length ? (
                        <p className="text-center text-muted-foreground py-8">No drafts or scheduled messages.</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Subject</TableHead>
                              <TableHead>Recipient</TableHead>
                              <TableHead>Channel</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Created</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {broadcasts.filter(b => b.status === "draft" || b.status === "scheduled").map((msg) => {
                              const config = msg.recipient_config as any;
                              const recipientLabel = config?.name
                                ? `${config.name} (${msg.recipient_type === "visitor" ? "Visitor" : msg.recipient_type?.replace(/_/g, " ")})`
                                : msg.recipient_type?.replace(/_/g, " ");
                              const channel = (msg.channels as string[])?.[0] || "in_app";
                              return (
                                <TableRow key={msg.id}>
                                  <TableCell className="font-medium">{msg.subject}</TableCell>
                                  <TableCell className="text-sm text-muted-foreground">{recipientLabel}</TableCell>
                                  <TableCell><Badge variant="secondary" className="capitalize">{channel}</Badge></TableCell>
                                  <TableCell><Badge className={statusColors[msg.status || "draft"]}>{msg.status}</Badge></TableCell>
                                  <TableCell className="text-sm">{msg.created_at ? format(new Date(msg.created_at), "dd MMM yyyy") : "—"}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}

          {/* ── EMAIL ── */}
          {activeSection === "email" && (
            <Card><CardContent><ComingSoon icon={Mail} title="Email" description="Send and manage emails to your congregation. Coming soon." /></CardContent></Card>
          )}

          {/* ── EMAIL TEMPLATES ── */}
          {activeSection === "email_templates" && (
            <Card><CardContent><ComingSoon icon={LayoutTemplate} title="Email Templates" description="Create reusable email templates for common messages. Coming soon." /></CardContent></Card>
          )}

          {/* ── EMAIL AUTOMATION ── */}
          {activeSection === "email_automation" && (
            <Card><CardContent><ComingSoon icon={Zap} title="Email Automation" description="Set up automated email sequences triggered by events. Coming soon." /></CardContent></Card>
          )}

          {/* ── SMS ── */}
          {activeSection === "sms" && (
            <Card><CardContent><ComingSoon icon={MessageSquare} title="SMS" description="Send SMS messages to members and visitors. Coming soon." /></CardContent></Card>
          )}

          {/* ── SMS TEMPLATES ── */}
          {activeSection === "sms_templates" && (
            <Card><CardContent><ComingSoon icon={FileText} title="SMS Templates" description="Manage reusable SMS message templates. Coming soon." /></CardContent></Card>
          )}

          {/* ── WHATSAPP CLOUD ── */}
          {activeSection === "whatsapp" && (
            <Card><CardContent><ComingSoon icon={MessageCircle} title="WhatsApp Cloud" description="Connect your WhatsApp Business account to send messages. Not yet configured." /></CardContent></Card>
          )}

          {/* ── WA TEMPLATES ── */}
          {activeSection === "wa_templates" && (
            <Card><CardContent><ComingSoon icon={LayoutTemplate} title="WA Templates" description="Manage approved WhatsApp message templates. Not yet configured." /></CardContent></Card>
          )}

          {/* ── WA AUTOMATION ── */}
          {activeSection === "wa_automation" && (
            <Card><CardContent><ComingSoon icon={Zap} title="WA Automation" description="Automate WhatsApp messages based on triggers and schedules. Coming soon." /></CardContent></Card>
          )}

          {/* ── WA REPORT ── */}
          {activeSection === "wa_report" && (
            <Card><CardContent><ComingSoon icon={BarChart2} title="WA Report" description="View delivery and engagement reports for WhatsApp messages. Coming soon." /></CardContent></Card>
          )}

          {/* ── CREDITS ── */}
          {activeSection === "credits" && (
            <Card><CardContent><ComingSoon icon={CreditCard} title="Credits" description="Manage your messaging credits for SMS and WhatsApp. Coming soon." /></CardContent></Card>
          )}

          {/* ── BRANDING ── */}
          {activeSection === "branding" && (
            <Card><CardContent><ComingSoon icon={Paintbrush} title="Branding" description="Customise email headers, footers, and colour schemes. Coming soon." /></CardContent></Card>
          )}

          {/* ── ADMIN BROADCAST ── */}
          {activeSection === "admin_broadcast" && (
            <Card><CardContent><ComingSoon icon={Radio} title="Admin Broadcast" description="Send system-wide broadcasts to all church admins. Coming soon." /></CardContent></Card>
          )}

          {/* ── AI DRAFT ── */}
          {activeSection === "ai_draft" && (
            <Card><CardContent><ComingSoon icon={Bot} title="AI Draft" description="Use AI to draft compelling messages and announcements. Coming soon." /></CardContent></Card>
          )}

          {/* ── TEST EMAIL ── */}
          {activeSection === "test_email" && (
            <Card><CardContent><ComingSoon icon={FlaskConical} title="Test Email" description="Send a test email to verify your email configuration. Coming soon." /></CardContent></Card>
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
