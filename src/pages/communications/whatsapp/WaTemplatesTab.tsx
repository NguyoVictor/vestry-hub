import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TABLES } from "@/lib/schema";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Copy, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

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

type Template = typeof SYSTEM_TEMPLATES[0];

function PreviewModal({ template, onClose }: { template: Template | null; onClose: () => void }) {
  if (!template) return null;
  let preview = template.body;
  template.variables.forEach((v, i) => { preview = preview.replace(`{{${i + 1}}}`, `[${v}]`); });
  return (
    <Dialog open={!!template} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="text-sm font-semibold capitalize">{template.name.replace(/_/g, " ")}</DialogTitle></DialogHeader>
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

export function WaTemplatesTab({ tenantId }: { tenantId: string }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<Template | null>(null);

  // Seed system templates on first load
  const { data: dbTemplates = [], isLoading } = useQuery({
    queryKey: ["wa-templates", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.WHATSAPP_TEMPLATES).select("*").eq("tenant_id", tenantId);
      const existing = data ?? [];
      const existingNames = new Set(existing.map((t: any) => t.name));
      const missing = SYSTEM_TEMPLATES.filter(t => !existingNames.has(t.name));
      if (missing.length > 0) {
        const rows = missing.map(t => ({ tenant_id: tenantId, name: t.name, category: t.category, description: t.description, body: t.body, variables: t.variables, is_approved: true, is_system: true }));
        await supabase.from(TABLES.WHATSAPP_TEMPLATES).insert(rows as any);
        const { data: fresh } = await supabase.from(TABLES.WHATSAPP_TEMPLATES).select("*").eq("tenant_id", tenantId);
        return fresh ?? [];
      }
      return existing;
    },
    staleTime: 300_000,
  });

  const filtered = SYSTEM_TEMPLATES.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <span className="text-emerald-600 text-lg">✅</span>
        <p className="text-sm text-emerald-800">
          <span className="font-medium">Pre-approved WhatsApp Templates</span> — These templates have been approved by Meta and are ready to use. Variables like <span className="font-mono text-xs bg-emerald-100 px-1 rounded">{"{{1}}"}</span>, <span className="font-mono text-xs bg-emerald-100 px-1 rounded">{"{{2}}"}</span> are automatically filled with your church and member data when messages are sent.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <Input placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(t => (
            <div key={t.name} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium", t.category === "MARKETING" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-blue-50 text-blue-700 border-blue-200")}>
                      {t.category === "MARKETING" ? "Marketing" : "Utility"}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">Approved</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 capitalize">{t.name.replace(/_/g, " ")}</p>
                  <p className="text-xs text-slate-500">{t.description}</p>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{t.body.replace(/\n/g, " ")}</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Auto-filled:</p>
                <p className="text-xs text-orange-600">{t.variables.join(", ")}</p>
                <p className="text-[10px] text-slate-400">{t.variables.length} variable{t.variables.length !== 1 ? "s" : ""}</p>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                <button onClick={() => setPreview(t)} className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-slate-200 py-1.5 text-xs text-slate-600 hover:bg-slate-50 transition-colors">
                  <Eye className="h-3.5 w-3.5" />Preview
                </button>
                <button onClick={() => { navigator.clipboard.writeText(t.body); toast.success("Template copied!"); }} className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-slate-200 py-1.5 text-xs text-slate-600 hover:bg-slate-50 transition-colors">
                  <Copy className="h-3.5 w-3.5" />Copy
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <PreviewModal template={preview} onClose={() => setPreview(null)} />
    </div>
  );
}
