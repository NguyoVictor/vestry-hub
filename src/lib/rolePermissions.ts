// T16 — custom role permission areas and levels (shared by the Users page).
export type RoleLevel = "full_access" | "read_only" | "none";
export type RolePermissions = Partial<Record<string, RoleLevel>>;

export const ROLE_AREAS: ReadonlyArray<{ key: string; label: string }> = [
  { key: "member_management", label: "Member Management" },
  { key: "financial_records", label: "Financial Records" },
  { key: "event_management", label: "Event Management" },
  { key: "communication_tools", label: "Communication Tools" },
  { key: "groups_ministries", label: "Groups & Ministries" },
  { key: "attendance", label: "Attendance" },
  { key: "reports_analytics", label: "Reports & Analytics" },
  { key: "church_settings", label: "Church Settings" },
];

export const LEVEL_LABELS: Record<RoleLevel, string> = { full_access: "Full access", read_only: "Read-only", none: "No access" };
