// ─── Children's Ministry shared types ────────────────────────────────────────

export interface ChildClass {
  id: string;
  tenant_id: string;
  name: string;
  min_age: number;
  max_age: number;
  teacher_id: string | null;
  capacity: number | null;
  active: boolean;
  created_at: string;
  // joined
  teacher?: { first_name: string; last_name: string } | null;
  enrolled_count?: number;
}

export interface Child {
  id: string;
  tenant_id: string;
  family_id: string | null;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: "male" | "female" | "prefer_not_to_say" | null;
  class_id: string | null;
  guardian_primary_id: string | null;
  guardian_secondary_id: string | null;
  photo_url: string | null;
  special_needs_notes: string | null;
  active: boolean;
  created_at: string;
  // joined
  class?: { name: string } | null;
  guardian_primary?: { first_name: string; last_name: string } | null;
  guardian_secondary?: { first_name: string; last_name: string } | null;
}

export interface CheckIn {
  id: string;
  tenant_id: string;
  child_id: string;
  service_id: string | null;
  checked_in_at: string;
  checked_in_by: string | null;
  checked_out_at: string | null;
  checked_out_by: string | null;
  check_in_method: "qr" | "manual";
  qr_code_data: string | null;
  notes: string | null;
  created_at: string;
  // joined
  child?: { first_name: string; last_name: string; class?: { name: string } | null; guardian_primary?: { first_name: string; last_name: string } | null } | null;
}

export interface CMSettings {
  id: string;
  tenant_id: string;
  kiosk_pin: string;
  kiosk_idle_timeout_minutes: number;
  kiosk_auto_return_seconds: number;
  auto_send_qr_on_confirm: boolean;
  send_qr_reminder: boolean;
  qr_reminder_days_before: number;
  notify_checkin: boolean;
  notify_checkout: boolean;
  email_qr_to_parents: boolean;
  auto_assign_class_by_age: boolean;
}

export const DEFAULT_CLASSES = [
  { name: "Nursery",       min_age: 0,  max_age: 2  },
  { name: "Toddlers",      min_age: 2,  max_age: 3  },
  { name: "Pre-school",    min_age: 3,  max_age: 5  },
  { name: "Primary",       min_age: 6,  max_age: 9  },
  { name: "Junior Church", min_age: 10, max_age: 12 },
];

/** Calculate age in years from a date-of-birth string */
export function calcAge(dob: string): number {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

/** Suggest a class based on age */
export function suggestClass(age: number, classes: ChildClass[]): ChildClass | null {
  return classes.find(c => c.active && age >= c.min_age && age <= c.max_age) ?? null;
}

/** Avatar gradient by first letter */
export function childGradient(name: string): string {
  const letter = (name?.[0] ?? "A").toUpperCase();
  const map: Record<string, string> = {
    A:"from-orange-400 to-orange-500", B:"from-orange-400 to-orange-500",
    C:"from-orange-400 to-orange-500", D:"from-orange-400 to-orange-500",
    E:"from-violet-500 to-purple-600", F:"from-violet-500 to-purple-600",
    G:"from-violet-500 to-purple-600", H:"from-violet-500 to-purple-600",
    I:"from-blue-400 to-blue-600",     J:"from-blue-400 to-blue-600",
    K:"from-blue-400 to-blue-600",     L:"from-blue-400 to-blue-600",
    M:"from-emerald-400 to-green-500", N:"from-emerald-400 to-green-500",
    O:"from-emerald-400 to-green-500", P:"from-emerald-400 to-green-500",
    Q:"from-pink-400 to-rose-500",     R:"from-pink-400 to-rose-500",
    S:"from-pink-400 to-rose-500",     T:"from-pink-400 to-rose-500",
  };
  return map[letter] ?? "from-amber-400 to-yellow-500";
}
