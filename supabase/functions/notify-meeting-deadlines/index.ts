import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (_req: Request) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in1h  = new Date(now.getTime() +      60 * 60 * 1000);

  // Format as YYYY-MM-DD for date comparison
  const fmt = (d: Date) => d.toISOString().split("T")[0];

  // Fetch meetings that are scheduled or in_progress and not cancelled
  const { data: meetings, error: meetErr } = await supabase
    .from("board_meetings")
    .select("id, tenant_id, title, meeting_date, start_time, status")
    .in("status", ["scheduled", "in_progress"])
    .in("meeting_date", [fmt(in24h), fmt(now)]);

  if (meetErr) {
    return new Response(JSON.stringify({ error: meetErr.message }), { status: 500 });
  }

  if (!meetings || meetings.length === 0) {
    return new Response(JSON.stringify({ inserted: 0 }), { status: 200 });
  }

  let inserted = 0;

  for (const meeting of meetings) {
    const meetingDate = meeting.meeting_date as string;
    const startTime  = meeting.start_time ? String(meeting.start_time).slice(0, 5) : null;

    // Build candidate notifications for this meeting
    const candidates: { message: string; check: boolean }[] = [];

    // 24-hour reminder — meeting is tomorrow
    if (meetingDate === fmt(in24h)) {
      const msg = startTime
        ? `'${meeting.title}' is tomorrow at ${startTime}`
        : `'${meeting.title}' is tomorrow`;
      candidates.push({ message: msg, check: true });
    }

    // 1-hour reminder — meeting is today and start_time is within the next hour
    if (meetingDate === fmt(now) && startTime) {
      const [hh, mm] = startTime.split(":").map(Number);
      const meetingMinutes = hh * 60 + mm;
      const nowMinutes     = now.getUTCHours() * 60 + now.getUTCMinutes();
      const diff = meetingMinutes - nowMinutes;
      if (diff >= 0 && diff <= 65) { // 65-min window to account for cron drift
        candidates.push({
          message: `'${meeting.title}' starts in 1 hour`,
          check: true,
        });
      }
    }

    if (candidates.length === 0) continue;

    // Get all admin/staff users for this tenant
    const { data: admins } = await supabase
      .from("users")
      .select("id")
      .eq("tenant_id", meeting.tenant_id)
      .in("role", ["super_admin", "staff_leader"]);

    if (!admins || admins.length === 0) continue;

    for (const admin of admins) {
      for (const { message } of candidates) {
        // Dedup check
        const { count } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("task_id", meeting.id)   // reuse task_id column as meeting_id
          .eq("user_id", admin.id)
          .eq("title", message);

        if ((count ?? 0) > 0) continue;

        const { error: insErr } = await supabase.from("notifications").insert({
          id: crypto.randomUUID(),
          tenant_id: meeting.tenant_id,
          user_id: admin.id,
          task_id: meeting.id,
          title: message,
          body: `Meeting date: ${meetingDate}${startTime ? ` at ${startTime}` : ""}`,
          type: "meeting_reminder",
          is_read: false,
        });

        if (!insErr) inserted++;
      }
    }
  }

  return new Response(JSON.stringify({ inserted }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
