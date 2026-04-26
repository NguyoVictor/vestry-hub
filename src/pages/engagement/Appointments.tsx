import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isToday, parseISO } from 'date-fns';
import { Helmet } from 'react-helmet-async';
import {
  Calendar, List, Filter, CalendarDays, Clock, User, CheckCircle2,
  XCircle, RotateCcw, ChevronDown, Video, MapPin, SlidersHorizontal,
  Loader2, Plus, X, ChevronRight,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useChurch } from '@/contexts/ChurchContext';
import { TABLES, COLS } from '@/lib/schema';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { PageTransition } from '@/components/ui/PageTransition';
import { MemberAvatar } from '@/components/shared/MemberAvatar';
import { JoinMeetingButton } from '@/components/shared/JoinMeetingButton';
import type { Appointment, AppointmentStatus } from '@/types/appointments';

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; color: string; bg: string }> = {
  pending:     { label: 'Pending',     color: 'text-amber-700',  bg: 'bg-amber-100' },
  confirmed:   { label: 'Confirmed',   color: 'text-green-700',  bg: 'bg-green-100' },
  declined:    { label: 'Declined',    color: 'text-red-700',    bg: 'bg-red-100' },
  rescheduled: { label: 'Rescheduled', color: 'text-blue-700',   bg: 'bg-blue-100' },
  cancelled:   { label: 'Cancelled',   color: 'text-slate-600',  bg: 'bg-slate-100' },
  completed:   { label: 'Completed',   color: 'text-slate-500',  bg: 'bg-slate-100' },
};

function StatusBadge({ status }: { status: AppointmentStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

export default function Appointments() {
  const { tenantId, userId, userName } = useChurch();
  const qc = useQueryClient();
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterMode, setFilterMode] = useState<string>('all');
  const [search, setSearch] = useState('');

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: ['admin-appointments', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.APPOINTMENTS)
        .select('*, appointment_types(id,label,description), members(first_name,last_name,avatar_url,email)')
        .eq(COLS.TENANT_ID, tenantId)
        .order('preferred_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Appointment[];
    },
    staleTime: 300_000,
  });

  const { data: staffList = [] } = useQuery({
    queryKey: ['staff-list', tenantId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.USERS).select('id, first_name, last_name, email').eq(COLS.TENANT_ID, tenantId);
      return data ?? [];
    },
    staleTime: 300_000,
  });

  // ── Stats ─────────────────────────────────────────────────────────────────
  const total = appointments.length;
  const pending = appointments.filter(a => a.status === 'pending').length;
  const confirmedToday = appointments.filter(a => a.status === 'confirmed' && isToday(parseISO(a.preferred_date))).length;
  const completedMonth = appointments.filter(a => {
    const d = parseISO(a.created_at);
    const now = new Date();
    return a.status === 'completed' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const stats = [
    { label: 'Total', value: total, color: 'text-slate-700', bg: 'bg-slate-50' },
    { label: 'Pending', value: pending, color: 'text-amber-700', bg: 'bg-amber-50' },
    { label: 'Confirmed Today', value: confirmedToday, color: 'text-green-700', bg: 'bg-green-50' },
    { label: 'Completed This Month', value: completedMonth, color: 'text-indigo-700', bg: 'bg-indigo-50' },
  ];

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = appointments.filter(a => {
    const member = a.members;
    const name = member ? `${member.first_name} ${member.last_name}`.toLowerCase() : '';
    const type = a.appointment_types?.label?.toLowerCase() ?? '';
    const q = search.toLowerCase();
    if (q && !name.includes(q) && !type.includes(q)) return false;
    if (filterStatus !== 'all' && a.status !== filterStatus) return false;
    if (filterMode !== 'all' && a.mode !== filterMode) return false;
    return true;
  });

  return (
    <PageTransition>
      <Helmet><title>Appointments — Vestry</title></Helmet>
      <div className="font-jakarta space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-jakarta">Appointments</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage congregation appointment requests</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <button onClick={() => setView('list')} className={`px-3 py-2 text-sm flex items-center gap-1.5 transition-colors ${view === 'list' ? 'bg-orange-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                <List className="h-4 w-4" />List
              </button>
              <button onClick={() => setView('calendar')} className={`px-3 py-2 text-sm flex items-center gap-1.5 transition-colors ${view === 'calendar' ? 'bg-orange-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                <Calendar className="h-4 w-4" />Calendar
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className={`rounded-xl border border-slate-200 dark:border-slate-700 ${s.bg} dark:bg-slate-800 p-5`}>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{s.label}</p>
              <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <Input placeholder="Search member or type..." value={search} onChange={e => setSearch(e.target.value)} className="h-9 w-56 text-sm border-slate-200 focus:border-orange-500" />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-9 w-36 text-sm border-slate-200"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterMode} onValueChange={setFilterMode}>
            <SelectTrigger className="h-9 w-32 text-sm border-slate-200"><SelectValue placeholder="Mode" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modes</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="physical">Physical</SelectItem>
            </SelectContent>
          </Select>
          {(filterStatus !== 'all' || filterMode !== 'all' || search) && (
            <Button variant="ghost" size="sm" className="h-9 text-slate-500 gap-1" onClick={() => { setFilterStatus('all'); setFilterMode('all'); setSearch(''); }}>
              <X className="h-3.5 w-3.5" />Clear
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-5 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <CalendarDays className="h-12 w-12 text-slate-300" />
              <p className="text-base font-semibold text-slate-600 dark:text-slate-300">No appointments found</p>
              <p className="text-sm text-slate-400">Appointments requested by members will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-jakarta">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Member</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Mode</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date & Time</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((apt, i) => {
                    const member = apt.members;
                    const name = member ? `${member.first_name} ${member.last_name}` : 'Unknown';
                    const date = format(parseISO(apt.preferred_date), 'dd MMM yyyy');
                    const time = apt.preferred_time.slice(0, 5);
                    return (
                      <motion.tr key={apt.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                        className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                        onClick={() => setSelectedApt(apt)}>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <MemberAvatar name={name} avatarUrl={member?.avatar_url} size="sm" />
                            <span className="font-medium text-slate-800 dark:text-slate-200">{name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">{apt.appointment_types?.label ?? '—'}</td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${apt.mode === 'online' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                            {apt.mode === 'online' ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                            {apt.mode === 'online' ? 'Online' : 'Physical'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">{date} · {time}</td>
                        <td className="px-4 py-3.5"><StatusBadge status={apt.status} /></td>
                        <td className="px-4 py-3.5 text-right">
                          <Button variant="ghost" size="sm" className="h-8 gap-1 text-slate-500 hover:text-orange-600" onClick={e => { e.stopPropagation(); setSelectedApt(apt); }}>
                            View <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Detail Drawer */}
      <AppointmentDetailDrawer
        apt={selectedApt}
        onClose={() => setSelectedApt(null)}
        staffList={staffList as any[]}
        tenantId={tenantId}
        adminName={userName}
        onUpdated={() => qc.invalidateQueries({ queryKey: ['admin-appointments', tenantId] })}
      />
    </PageTransition>
  );
}

// ── Detail Drawer ─────────────────────────────────────────────────────────────
interface DrawerProps {
  apt: Appointment | null;
  onClose: () => void;
  staffList: any[];
  tenantId: string;
  adminName: string;
  onUpdated: () => void;
}

function AppointmentDetailDrawer({ apt, onClose, staffList, tenantId, adminName, onUpdated }: DrawerProps) {
  const [staffId, setStaffId] = useState('');
  const [location, setLocation] = useState('');
  const [physicalNotes, setPhysicalNotes] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [reschedDate, setReschedDate] = useState('');
  const [reschedTime, setReschedTime] = useState('');
  const [saving, setSaving] = useState(false);

  // Sync fields when apt changes
  useState(() => {
    if (apt) {
      setStaffId(apt.assigned_staff_id ?? 'unassigned');
      setLocation(apt.location ?? '');
      setPhysicalNotes(apt.physical_notes ?? '');
      setAdminNotes(apt.admin_notes ?? '');
      setDeclineReason(apt.decline_reason ?? '');
      setReschedDate(apt.rescheduled_date ?? '');
      setReschedTime(apt.rescheduled_time ?? '');
    }
  });

  const notify = async (memberId: string, title: string, body: string) => {
    await supabase.from(TABLES.NOTIFICATIONS).insert({
      tenant_id: tenantId, user_id: memberId, type: 'appointment',
      title, body, is_read: false,
    } as never);
  };

  const notifyStaff = async (staffUserId: string, memberName: string, date: string, time: string, typeName: string) => {
    await supabase.from(TABLES.NOTIFICATIONS).insert({
      tenant_id: tenantId, user_id: staffUserId, type: 'appointment',
      title: 'Appointment Assigned',
      body: `You have been assigned an appointment with ${memberName} on ${date} at ${time}. Type: ${typeName}.`,
      is_read: false,
      metadata: { path: '/appointments' },
    } as never);
  };

  const updateStatus = async (status: AppointmentStatus, extra: Record<string, any> = {}) => {
    if (!apt) return;
    setSaving(true);
    try {
      const jitsiRoom = apt.mode === 'online' ? `vestryhub-apt-${apt.id}` : null;
      const payload: any = {
        status,
        assigned_staff_id: (staffId && staffId !== 'unassigned') ? staffId : null,
        location: location || null,
        physical_notes: physicalNotes || null,
        admin_notes: adminNotes || null,
        jitsi_room_name: status === 'confirmed' && apt.mode === 'online' ? jitsiRoom : apt.jitsi_room_name,
        updated_at: new Date().toISOString(),
        ...extra,
      };
      const { error } = await supabase.from(TABLES.APPOINTMENTS).update(payload).eq('id', apt.id);
      if (error) throw error;

      const member = apt.members;
      const memberName = member ? `${member.first_name} ${member.last_name}` : 'Member';
      const date = format(parseISO(apt.preferred_date), 'dd MMM yyyy');
      const time = apt.preferred_time.slice(0, 5);
      const typeName = apt.appointment_types?.label ?? 'Appointment';

      if (status === 'confirmed') {
        await notify(apt.member_id, 'Appointment Confirmed', `Your ${typeName} on ${date} at ${time} has been confirmed.${apt.mode === 'online' ? ' A meeting link has been prepared.' : ''}`);
        if (staffId && staffId !== 'unassigned') await notifyStaff(staffId, memberName, date, time, typeName);
      } else if (status === 'declined') {
        await notify(apt.member_id, 'Appointment Declined', `Your ${typeName} request has been declined.${declineReason ? ` Reason: ${declineReason}` : ''}`);
      } else if (status === 'rescheduled') {
        const newDate = reschedDate ? format(parseISO(reschedDate), 'dd MMM yyyy') : date;
        await notify(apt.member_id, 'Appointment Rescheduled', `Your ${typeName} has been rescheduled to ${newDate} at ${reschedTime || time}.`);
      } else if (status === 'cancelled') {
        await notify(apt.member_id, 'Appointment Cancelled', `Your ${typeName} on ${date} has been cancelled.`);
      }

      toast.success(`Appointment ${status}`);
      onUpdated();
      onClose();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  if (!apt) return null;
  const member = apt.members;
  const name = member ? `${member.first_name} ${member.last_name}` : 'Unknown';
  const date = format(parseISO(apt.preferred_date), 'EEEE, dd MMMM yyyy');
  const time = apt.preferred_time.slice(0, 5);
  const jitsiRoom = `vestryhub-apt-${apt.id}`;

  return (
    <Sheet open={!!apt} onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto font-jakarta" side="right">
        <SheetHeader className="pb-4 border-b border-slate-100">
          <SheetTitle className="text-lg font-semibold text-slate-900 font-jakarta">Appointment Details</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 pt-5">
          {/* Member */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800">
            <MemberAvatar name={name} avatarUrl={member?.avatar_url} size="lg" />
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">{name}</p>
              <p className="text-xs text-slate-500">{member?.email}</p>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs text-slate-500 mb-1">Type</p>
              <p className="text-sm font-medium">{apt.appointment_types?.label ?? '—'}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs text-slate-500 mb-1">Mode</p>
              <p className="text-sm font-medium capitalize">{apt.mode}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs text-slate-500 mb-1">Date</p>
              <p className="text-sm font-medium">{date}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs text-slate-500 mb-1">Time</p>
              <p className="text-sm font-medium">{time}</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <StatusBadge status={apt.status} />
            {apt.mode === 'online' && apt.status === 'confirmed' && (
              <JoinMeetingButton meetingDate={apt.preferred_date} meetingTime={apt.preferred_time} roomName={jitsiRoom} displayName={adminName} title={apt.appointment_types?.label} size="sm" />
            )}
          </div>

          {apt.notes && (
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs text-slate-500 mb-1">Member Notes</p>
              <p className="text-sm text-slate-700">{apt.notes}</p>
            </div>
          )}

          {/* Staff assignment */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Assign Staff Member</Label>
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger className="h-10 border-slate-200 text-sm"><SelectValue placeholder="Select staff..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {staffList.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {apt.mode === 'physical' && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Location</Label>
                <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Church Office, Room 2" className="h-10 border-slate-200 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Location Notes</Label>
                <Textarea value={physicalNotes} onChange={e => setPhysicalNotes(e.target.value)} rows={2} placeholder="Directions or additional info..." className="border-slate-200 text-sm resize-none" />
              </div>
            </>
          )}

          {apt.mode === 'online' && apt.status === 'confirmed' && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <p className="text-xs text-blue-600 font-medium mb-1">Jitsi Room</p>
              <p className="text-xs font-mono text-blue-700">{jitsiRoom}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-600">Admin Notes (private)</Label>
            <Textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} rows={2} placeholder="Internal notes..." className="border-slate-200 text-sm resize-none" />
          </div>

          {/* Decline reason */}
          {apt.status === 'pending' && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Decline Reason (if declining)</Label>
              <Input value={declineReason} onChange={e => setDeclineReason(e.target.value)} placeholder="Optional reason..." className="h-10 border-slate-200 text-sm" />
            </div>
          )}

          {/* Reschedule fields */}
          {apt.status !== 'completed' && apt.status !== 'cancelled' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Reschedule Date</Label>
                <Input type="date" value={reschedDate} onChange={e => setReschedDate(e.target.value)} className="h-10 border-slate-200 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Reschedule Time</Label>
                <Input type="time" value={reschedTime} onChange={e => setReschedTime(e.target.value)} className="h-10 border-slate-200 text-sm" />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            {apt.status === 'pending' && (
              <>
                <Button className="bg-green-500 hover:bg-green-600 text-white gap-1.5" disabled={saving} onClick={() => updateStatus('confirmed')}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}Confirm
                </Button>
                <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 gap-1.5" disabled={saving} onClick={() => updateStatus('declined', { decline_reason: declineReason || null })}>
                  <XCircle className="h-4 w-4" />Decline
                </Button>
              </>
            )}
            {(apt.status === 'pending' || apt.status === 'confirmed') && reschedDate && (
              <Button variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50 gap-1.5 col-span-2" disabled={saving} onClick={() => updateStatus('rescheduled', { rescheduled_date: reschedDate, rescheduled_time: reschedTime || apt.preferred_time })}>
                <RotateCcw className="h-4 w-4" />Reschedule
              </Button>
            )}
            {apt.status === 'confirmed' && (
              <Button className="bg-slate-700 hover:bg-slate-800 text-white gap-1.5" disabled={saving} onClick={() => updateStatus('completed')}>
                <CheckCircle2 className="h-4 w-4" />Mark Complete
              </Button>
            )}
            {apt.status !== 'cancelled' && apt.status !== 'completed' && (
              <Button variant="outline" className="border-slate-200 text-slate-500 hover:bg-slate-50 gap-1.5" disabled={saving} onClick={() => updateStatus('cancelled')}>
                <X className="h-4 w-4" />Cancel
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
