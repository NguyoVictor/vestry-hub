export type AppointmentStatus = 'pending' | 'confirmed' | 'declined' | 'rescheduled' | 'cancelled' | 'completed';
export type AppointmentMode = 'online' | 'physical';

export interface AppointmentType {
  id: string;
  tenant_id: string;
  label: string;
  description: string | null;
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
  created_at: string;
}

export interface Appointment {
  id: string;
  tenant_id: string;
  member_id: string;
  appointment_type_id: string | null;
  mode: AppointmentMode;
  preferred_date: string;
  preferred_time: string;
  notes: string | null;
  status: AppointmentStatus;
  assigned_staff_id: string | null;
  location: string | null;
  physical_notes: string | null;
  admin_notes: string | null;
  jitsi_room_name: string | null;
  rescheduled_date: string | null;
  rescheduled_time: string | null;
  decline_reason: string | null;
  created_at: string;
  updated_at: string;
  // joined
  appointment_types?: AppointmentType | null;
  members?: { first_name: string; last_name: string; avatar_url: string | null; email: string | null } | null;
  staff?: { first_name: string | null; last_name: string | null; email: string | null } | null;
}
