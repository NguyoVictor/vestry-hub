import { supabase } from "@/integrations/supabase/client";

export type ActivityActionType =
  | "new_member" | "member_updated" | "member_removed"
  | "new_donation"
  | "new_event" | "event_updated" | "event_cancelled"
  | "new_group"
  | "new_announcement" | "announcement_published"
  | "new_visitor" | "visitor_converted"
  | "new_convert" | "stage_advanced" | "convert_graduated" | "baptism_completed" | "checkin_logged"
  | "new_expense" | "expense_approved" | "payroll_processed"
  | "new_request" | "request_resolved"
  | "new_testimony" | "testimony_published"
  | "new_broadcast"
  | "new_service" | "attendance_recorded"
  | "new_pledge" | "booking_approved" | "new_incident" | "system";

interface LogActivityParams {
  churchId: string;  // accepts tenantId — mapped to tenant_id column in DB
  actionType: ActivityActionType;
  description: string;
  actorId?: string | null;
  actorName?: string | null;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Logs an activity entry to the activity_log table.
 * NEVER throws — activity logging must not break the main action.
 * Always call this AFTER the main mutation succeeds (in onSuccess).
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    await (supabase as any).from("activity_log").insert({
      tenant_id: params.churchId,  // DB uses tenant_id
      action_type: params.actionType,
      description: params.description,
      actor_id: params.actorId ?? null,
      actor_name: params.actorName ?? null,
      entity_type: params.entityType ?? null,
      entity_id: params.entityId ?? null,
      entity_name: params.entityName ?? null,
      metadata: params.metadata ?? {},
    });
  } catch {
    // Silently swallow — activity logging must never break the main flow
  }
}
