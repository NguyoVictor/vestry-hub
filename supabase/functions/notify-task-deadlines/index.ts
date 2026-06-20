import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  // Allow manual trigger via POST or scheduled cron via GET
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const in7Days = new Date(today);
  in7Days.setDate(today.getDate() + 7);

  const in1Day = new Date(today);
  in1Day.setDate(today.getDate() + 1);

  const fmt = (d: Date) => d.toISOString().split("T")[0];

  // Fetch open tasks due in exactly 7 or 1 day
  const { data: tasks, error: tasksErr } = await supabase
    .from("follow_up_tasks")
    .select("id, tenant_id, title, due_date")
    .in("due_date", [fmt(in7Days), fmt(in1Day)])
    .neq("status", "completed")
    .neq("status", "cancelled");

  if (tasksErr) {
    return new Response(JSON.stringify({ error: tasksErr.message }), { status: 500 });
  }

  if (!tasks || tasks.length === 0) {
    return new Response(JSON.stringify({ inserted: 0 }), { status: 200 });
  }

  let inserted = 0;

  for (const task of tasks) {
    const daysAway = task.due_date === fmt(in7Days) ? 7 : 1;
    const message = daysAway === 7
      ? `'${task.title}' is due in 7 days`
      : `'${task.title}' is due tomorrow`;

    // Get all admin/super_admin users for this tenant
    const { data: admins } = await supabase
      .from("users")
      .select("id")
      .eq("tenant_id", task.tenant_id)
      .in("role", ["super_admin", "staff_leader"]);

    if (!admins || admins.length === 0) continue;

    for (const admin of admins) {
      // Dedup: skip if notification already exists for this task + message + user
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("task_id", task.id)
        .eq("user_id", admin.id)
        .eq("title", message);

      if ((count ?? 0) > 0) continue;

      const { error: insErr } = await supabase.from("notifications").insert({
        id: crypto.randomUUID(),
        tenant_id: task.tenant_id,
        user_id: admin.id,
        task_id: task.id,
        title: message,
        body: `Due date: ${task.due_date}`,
        type: "task_deadline",
        is_read: false,
      });

      if (!insErr) inserted++;
    }
  }

  return new Response(JSON.stringify({ inserted }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
