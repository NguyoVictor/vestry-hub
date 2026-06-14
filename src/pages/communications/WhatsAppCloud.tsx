import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { useCurrency } from "@/hooks/useCurrency";
import { TABLES } from "@/lib/schema";
import { toast } from "sonner";
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  MessageCircle, Phone, Zap, CreditCard, Paintbrush, Radio,
  RefreshCw, CheckCircle2, Users, Clock, BarChart3, Copy, Eye,
  UserPlus, Gift, Calendar, Heart, Bell, Star, Droplets, Handshake,
  ClipboardList, CalendarCheck, CalendarX, Megaphone, Send,
  TrendingUp, AlertTriangle, ExternalLink,
} from "lucide-react";
import { format, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "@/lib/lazy-recharts";

// ── WhatsApp green ────────────────────────────────────────────────────────────
const WA_GREEN = "#25D366";

// ── 29 pre-built templates ────────────────────────────────────────────────────
const SYSTEM_TEMPLATES = [
  { name: "new_convert_milestone", category: "MARKETING", description: "Encourage new converts on their journey", body: "🎉 Congratulations, {{1}}! We are so proud of the progress you've made in your faith journey at {{2}}.", variables: ["Member Name", "Church Name"] },
  { name: "daily_devotional", category: "MARKETING", description: "Daily scripture and reflection", body: "📖 Today's Devotional\n\n{{1}} — {{2}}\n\n{{3}}", variables: ["Scripture Text", "Book/Chapter/Verse", "Reflection Message"] },
  { name: "birthday_greeting", category: "MARKETING", description: "Send birthday wishes to members", body: "🎂 Happy Birthday, {{1}}! On behalf of everyone at {{2}}, we wish you a blessed and joyful birthday! May God's grace be upon you this year and always.", variables: ["Member Name", "Church Name"] },
  { name: "event_promotion", category: "MARKETING", description: "Promote upcoming church events", body: "📢 {{1}}\n\nHi {{2}},\n\n{{3}}\n\n📅 {{4}}\n📍 {{5}}\n\n{{6}}", variables: ["Event Title", "Member Name", "Description", "Event Date", "Location", "Registration Link"] },
  { name: "anniversary_greeting", category: "MARKETING", description: "Celebrate member anniversaries", body: "💍 Celebrating {{1}} years of marriage is a beautiful milestone... {{2}} & {{3}}", variables: ["Years", "Member Name 1", "Member Name 2"] },
  { name: "visitor_welcome", category: "MARKETING", description: "Thank first-time visitors", body: "Hi {{1}}, Thank you for visiting {{2}}! We truly enjoyed having you worship with us and hope you felt right at home. 🙏 We'd love to see you again! Our team will be reaching out soon. {{3}} Learn more about us.", variables: ["Visitor Name", "Church Name", "Church Website Link"] },
  { name: "membership_anniversary", category: "MARKETING", description: "Celebrate membership milestones", body: "🎊 Happy Anniversary, {{1}}! Today marks another year since you joined the {{2}} family. We are so thankful for you.", variables: ["Member Name", "Church Name"] },
  { name: "baptism_anniversary", category: "MARKETING", description: "Celebrate baptism anniversaries", body: "🕊️ Happy Baptism Anniversary, {{1}}! Today we celebrate the anniversary of your baptism at {{2}} 🙌", variables: ["Member Name", "Church Name"] },
  { name: "wa_wedding_anniversary", category: "MARKETING", description: "Celebrate wedding anniversaries", body: "💒 {{1}} celebrates the love and commitment God has blessed you with. Happy Wedding Anniversary!", variables: ["Member Name(s)", "Church Name"] },
  { name: "visitor_service_reminder", category: "MARKETING", description: "Invite visitors back to services", body: "Hi {{1}}, We'd love to see you at {{2}}! Join us for service on {{3}} at {{4}}. {{5}}", variables: ["Visitor Name", "Church Name", "Service Day", "Service Time", "Church Name"] },
  { name: "ministry_spotlight", category: "MARKETING", description: "Highlight church ministries", body: "✨ Ministry Spotlight: {{1}}\n\n{{2}}\n\nSign up: {{3}}", variables: ["Ministry Name", "Ministry Description", "Sign Up Link"] },
  { name: "sermon_series", category: "MARKETING", description: "Announce new sermon series", body: "📖 New Sermon Series: {{1}}\n\nHi {{2}},\n\n{{3}}", variables: ["Series Title", "Member Name", "Series Description"] },
  { name: "general_announcement", category: "UTILITY", description: "General church announcements", body: "📣 {{1}}\n\nHi {{2}},\n\n{{3}}\n\n{{4}}", variables: ["Subject", "Member Name", "Message", "Unsubscribe Contact"] },
  { name: "pledge_reminder", category: "UTILITY", description: "Remind members about pledge commitments", body: "Hi {{1}}, This is a friendly reminder about your pledge commitment to {{2}}. Amount: {{3}}. Giving Link: {{4}}", variables: ["Member Name", "Pledge Name", "Total Amount", "Giving Link"] },
  { name: "giving_thank_you", category: "UTILITY", description: "Acknowledge donations and giving", body: "Thank you, {{1}}! 🙏❤️ Your gift of {{2}} to {{3}} has been received.", variables: ["Member Name", "Amount", "Fund/Category"] },
  { name: "counseling_appointment_reminder", category: "UTILITY", description: "Remind about counseling appointments", body: "Hi {{1}}, Reminder about your counseling appointment at {{2}} on {{3}}. Location: {{4}}", variables: ["Member Name", "Church Name", "Date/Time", "Counselor Name"] },
  { name: "service_request_status_update", category: "UTILITY", description: "Update members on service request status", body: "Hi {{1}}, Your service request {{2}} has been updated. Status: {{3}}", variables: ["Member Name", "Request Title", "Status"] },
  { name: "service_reminder", category: "UTILITY", description: "Weekly service reminders", body: "Join us at {{1}} for {{2}} tomorrow at {{3}}.", variables: ["Church Name", "Service Name", "Time"] },
  { name: "minister_assignment", category: "UTILITY", description: "Notify ministers of daily assignments", body: "Dear {{1}}, You have been assigned to minister at an upcoming event at {{2}}. Event: {{3}} Date: {{4}}", variables: ["Minister Name", "Church Name", "Event Name", "Date"] },
  { name: "task_reminder", category: "UTILITY", description: "Remind about assigned tasks", body: "Hi {{1}}, Reminder about a task assigned to you at {{2}}. Task: {{3}} Due: {{4}} Dashboard Link: {{5}}", variables: ["Member Name", "Church Name", "Task Title", "Due Date", "Dashboard Link"] },
  { name: "event_reminder", category: "UTILITY", description: "Remind members about upcoming events", body: "Hi {{1}}, This is a reminder about {{2}} on {{3}} at {{4}}. Location: {{5}}", variables: ["Member Name", "Event Name", "Date", "Time", "Location"] },
  { name: "member_welcome", category: "UTILITY", description: "Welcome new members with app download link", body: "Welcome to {{1}}, {{2}}! 🙏 We're so glad you've joined our church family. Download our app: {{3}} Access: {{4}}", variables: ["Church Name", "Member Name", "App Download Link", "Access Link"] },
  { name: "appointment_confirmed", category: "UTILITY", description: "Confirm scheduled appointments", body: "Hello {{1}}, Your appointment is scheduled for {{2}}. Staff: {{3}} Type: {{4}}", variables: ["Member Name", "Date/Time", "Staff Name", "Service Type"] },
  { name: "giving_receipt", category: "UTILITY", description: "Donation confirmation and receipt", body: "Thank you {{1}}! Your generous gift of {{2}} to {{3}} has been received. Transaction: {{4}}", variables: ["Member Name", "Amount", "Fund Name", "Transaction ID"] },
  { name: "prayer_request_received", category: "UTILITY", description: "Confirm prayer request submission", body: "Dear {{1}}, We have received your prayer request. Our prayer team is lifting you up before the Lord.", variables: ["Member Name"] },
  { name: "appointment_reminder", category: "UTILITY", description: "Remind about upcoming appointments", body: "Hi {{1}}, Reminder about your upcoming appointment on {{2}} at {{3}} with {{4}}.", variables: ["Member Name", "Date", "Time", "Staff/Pastor Name"] },
  { name: "appointment_cancelled", category: "UTILITY", description: "Notify about cancelled appointments", body: "Hi {{1}}, Your appointment on {{2}} has been cancelled. We hope to see you another time.", variables: ["Member Name", "Date/Time"] },
  { name: "volunteer_schedule", category: "UTILITY", description: "Notify volunteers of their schedule", body: "Hi {{1}}, Here is your volunteer schedule at {{2}}. Period: {{3}} Assigned Dates: {{4}}", variables: ["Volunteer Name", "Ministry Name", "Schedule Period", "Assigned Dates"] },
  { name: "group_meeting_reminder", category: "UTILITY", description: "Remind members about group meetings", body: "Hi {{1}}, Your {{2}} meeting is coming up 🗓️ Date: {{3}} Time: {{4}} Location: {{5}} Leader: {{6}}", variables: ["Member Name", "Group Name", "Date", "Time", "Location", "Leader Name"] },
];

// ── Automation triggers ───────────────────────────────────────────────────────
const AUTOMATION_TRIGGERS = [
  { key: "visitor_welcome", label: "Visitor Welcome", icon: UserPlus, desc: "When a new visitor registers", defaultTemplate: "visitor_welcome", defaultActive: true },
  { key: "new_member_welcome", label: "New Member Welcome", icon: Zap, desc: "When a visitor becomes a full member", defaultTemplate: "member_welcome", defaultActive: true },
  { key: "birthday_greetings", label: "Birthday Greetings", icon: Gift, desc: "On member birthdays", defaultTemplate: "birthday_greeting", defaultActive: false },
  { key: "event_reminders", label: "Event Reminders", icon: Calendar, desc: "Before registered events", defaultTemplate: "event_reminder", defaultActive: false },
  { key: "giving_thank_you", label: "Giving Thank You", icon: Heart, desc: "After a donation is recorded", defaultTemplate: "giving_thank_you", defaultActive: false },
  { key: "prayer_request_received", label: "Prayer Request Received", icon: Droplets, desc: "When a prayer request is submitted", defaultTemplate: "prayer_request_received", defaultActive: false },
  { key: "appointment_confirmed", label: "Appointment Confirmed", icon: CalendarCheck, desc: "When an appointment is booked", defaultTemplate: "appointment_confirmed", defaultActive: false },
  { key: "appointment_reminder", label: "Appointment Reminder", icon: Bell, desc: "24 hours before an appointment", defaultTemplate: "appointment_reminder", defaultActive: false },
  { key: "appointment_cancelled", label: "Appointment Cancelled", icon: CalendarX, desc: "When an appointment is cancelled", defaultTemplate: "appointment_cancelled", defaultActive: false },
  { key: "task_reminder", label: "Task Reminder", icon: ClipboardList, desc: "When a task is assigned to a staff member", defaultTemplate: "task_reminder", defaultActive: false },
  { key: "pledge_reminder", label: "Pledge Reminder", icon: Handshake, desc: "To remind members of pledge commitments", defaultTemplate: "pledge_reminder", defaultActive: false },
  { key: "membership_anniversary", label: "Membership Anniversary", icon: Star, desc: "On membership anniversary date", defaultTemplate: "membership_anniversary", defaultActive: false },
  { key: "baptism_anniversary", label: "Baptism Anniversary", icon: Droplets, desc: "On baptism anniversary date", defaultTemplate: "baptism_anniversary", defaultActive: false },
];

// ── Status pill ───────────────────────────────────────────────────────────────
const WA_STATUS: Record<string, string> = {
  sent:      "bg-blue-100 text-blue-700 border-blue-200",
  delivered: "bg-emerald-100 text-emerald-700 border-emerald-200",
  read:      "bg-purple-100 text-purple-700 border-purple-200",
  failed:    "bg-red-100 text-red-700 border-red-200",
};

// ── Template Preview Modal ────────────────────────────────────────────────────
function TemplatePreviewModal({ template, onClose }: { template: typeof SYSTEM_TEMPLATES[0] | null; onClose: () => void }) {
  if (!template) return null;
  const sampleValues = template.variables.map((v, i) => `[${v}]`);
  let preview = template.body;
  sampleValues.forEach((v, i) => { preview = preview.replace(`{{${i + 1}}}`, v); });
  return (
    <Dialog open={!!template} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="text-base font-semibold">{template.name}</DialogTitle></DialogHeader>
        <div className="space-y-3 pt-1">
          <div className="rounded-xl bg-[#DCF8C6] p-4 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{preview}</div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-600">Auto-filled variables:</p>
            {template.variables.map((v, i) => (
              <p key={i} className="text-xs text-slate-500"><span className="font-mono text-orange-500">{`{{${i + 1}}}`}</span> = {v}</p>
            ))}
          </div>
        </div>
        <Button variant="outline" className="w-full mt-2" onClick={onClose}>Close</Button>
      </DialogContent>
    </Dialog>
  );
}

// ── Send Message Modal ────────────────────────────────────────────────────────
function SendMessageModal({ open, onClose, tenantId, templates }: { open: boolean; onClose: () => void; tenantId: string; templates: typeof SYSTEM_TEMPLATES }) {
  const qc = useQueryClient();
  const { isReadOnly } = usePermissions();
  const readOnly = isReadOnly('communication_tools');
  const [step, setStep] = useState(1);
  const [recipientType, setRecipientType] = useState("all");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [sending, setSending] = useState(false);

  const { data: members = [] } = useQuery({
    queryKey: ["members-wa-send", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.MEMBERS).select("id, first_name, last_name, phone").eq("tenant_id", tenantId).not("phone", "is", null);
      return data ?? [];
    },
    staleTime: 300_000, enabled: open,
  });

  const tpl = templates.find(t => t.name === selectedTemplate);
  const recipientCount = recipientType === "all" ? members.length : 0;

  const handleSend = async () => {
    if (readOnly) return;
    if (!selectedTemplate) { toast.error("Select a template."); return; }
    setSending(true);
    try {
      let count = 0;
      for (const m of members.slice(0, 5)) { // limit for demo
        await supabase.functions.invoke("send-whatsapp-message", {
          body: { tenant_id: tenantId, recipient_phone: (m as any).phone, recipient_member_id: (m as any).id, template_name: selectedTemplate, template_variables: [(m as any).first_name ?? "Friend"] },
        });
        count++;
      }
      qc.invalidateQueries({ queryKey: ["wa-messages", tenantId] });
      toast.success(`Message sent to ${count} recipients!`);
      onClose();
    } catch (err: unknown) { toast.error((err as Error)?.message ?? "Failed to send."); }
    finally { setSending(false); }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle className="text-base font-semibold">Send WhatsApp Message</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-1">
          {/* Step 1: Recipients */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Step 1 — Recipients</Label>
            <div className="flex items-center gap-2">
              {["all", "group", "members"].map(t => (
                <button key={t} onClick={() => setRecipientType(t)} className={cn("px-3 py-1.5 rounded-full text-xs font-medium border transition-colors capitalize", recipientType === t ? "bg-orange-500 text-white border-orange-500" : "border-slate-200 text-slate-600 hover:bg-slate-50")}>
                  {t === "all" ? "All Members" : t === "group" ? "Select Group" : "Select Members"}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500">{recipientCount} recipients selected</p>
          </div>
          {/* Step 2: Template */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Step 2 — Template</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger><SelectValue placeholder="Select a template..." /></SelectTrigger>
              <SelectContent className="max-h-60">
                {templates.map(t => <SelectItem key={t.name} value={t.name}>{t.name.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
            {tpl && (
              <div className="rounded-xl bg-[#DCF8C6] p-3 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{tpl.body}</div>
            )}
          </div>
          {/* Step 3: Review */}
          {selectedTemplate && (
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-slate-700">Step 3 — Review</p>
              <p>Recipients: {recipientCount}</p>
              <p>Template: {selectedTemplate.replace(/_/g, " ")}</p>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleSend} disabled={sending || !selectedTemplate}>
            {sending ? "Sending..." : "Send Now"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}