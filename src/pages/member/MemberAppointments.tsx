import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, isToday } from 'date-fns';
import { ArrowLeft, Plus, Calendar, List, Video, MapPin, Clock, ChevronRight, X, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useMemberPortal } from '@/contexts/MemberPortalContext';
import { TABLES, COLS } from '@/lib/schema';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageTransition } from '@/components/ui/PageTransition';
import { JoinMeetingButton } from '@/components/shared/JoinMeetingButton';
import type { Appointment, AppointmentType, AppointmentStatus } from '@/types/appointments';

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; color: string; bg: string }> = {
  pending:     { label: 'Pending Review', color: 'text-amber-700',  bg: 'bg-amber-100' },
  confirmed:   { label: 'Confirmed',      color: 'text-green-700',  bg: 'bg-green-100' },
  declined:    { label: 'Declined',       color: 'text-red-700',    bg: 'bg-red-100' },
  rescheduled: { label: 'Rescheduled',    color: 'text-blue-700',   bg: 'bg-blue-100' },
  cancelled:   { label: 'Cancelled',      color: 'text-slate-600',  bg: 'bg-slate-100' },
  completed:   { label: 'Completed',      color: 'text-slate-500',  bg: 'bg-slate-100' },
};

function StatusBadge({ status }: { status: AppointmentStatus }) {
  const cfg = STATUS_CONFIG[status];
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>;
}

// ── Multi-step request form ───────────────────────────────────────────────────
interface FormState { typeId: string; mode: 'online' | 'physical'; date: string; time: string; notes: string; }
const DEFAULT_FORM: FormState = { typeId: '', mode: 'physical', date: '', time: '10:00', notes: '' };

const STEP_LABELS = ['Type', 'Mode', 'Date & Time', 'Notes', 'Review'];

function RequestDrawer({ open, onClose, types, memberId, tenantId, memberName, onSuccess }: {
  open: boolean; onClose: () => void; types: AppointmentType[];
  memberId: string; tenantId: string; memberName: string; onSuccess: () => void;
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => { setStep(0); setForm(DEFAULT_FORM); };
  const handleClose = () => { reset(); onClose(); };

  const selectedType = types.find(t => t.id === form.typeId);

  const submit = async () => {
    setSubmitting(true);
    try {
      const jitsiRoom = form.mode === 'online' ? `vestryhub-apt-${crypto.randomUUID()}` : null;
      const { error } = await supabase.from(TABLES.APPOINTMENTS).insert({
        tenant_id: tenantId, member_id: memberId,
        appointment_type_id: form.typeId || null,
        mode: form.mode, preferred_date: form.date,
        preferred_time: form.time, notes: form.notes || null,
        status: 'pending', jitsi_room_name: jitsiRoom,
      } as never);
      if (error) throw error;
      // Notify admins
      const { data: admins } = await supabase.from(TABLES.USERS).select('id').eq(COLS.TENANT_ID, tenantId);
      if (admins?.length) {
        await supabase.from(TABLES.NOTIFICATIONS).insert(
          admins.map((a: any) => ({
            tenant_id: tenantId, user_id: a.id, type: 'appointment',
            title: 'New Appointment Request',
            body: `${memberName} has requested a ${selectedType?.label ?? 'appointment'} on ${format(parseISO(form.date), 'dd MMM yyyy')} at ${form.time}.`,
            is_read: false,
          })) as never
        );
      }
      toast.success('Appointment request submitted!');
      onSuccess(); handleClose();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const canNext = [
    !!form.typeId,
    true,
    !!form.date && !!form.time,
    true,
    true,
  ][step];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="relative w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden font-jakarta">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Request Appointment</h2>
            <button onClick={handleClose} className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          {/* Step indicators */}
          <div className="flex items-center gap-1">
            {STEP_LABELS.map((label, i) => (
              <div key={i} className="flex items-center gap-1 flex-1">
                <div className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i <= step ? 'bg-orange-500' : 'bg-slate-200'}`} />
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-2">Step {step + 1} of {STEP_LABELS.length}: <span className="font-medium text-slate-700">{STEP_LABELS[step]}</span></p>
        </div>

        {/* Step content */}
        <div className="px-6 py-5 min-h-[220px]">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }} transition={{ duration: 0.2 }}>

              {step === 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-slate-700">Select appointment type</p>
                  {types.filter(t => t.is_active).map(t => (
                    <button key={t.id} onClick={() => setForm(f => ({ ...f, typeId: t.id }))}
                      className={`w-full text-left rounded-xl border-2 p-4 transition-all ${form.typeId === t.id ? 'border-orange-500 bg-orange-50' : 'border-slate-200 hover:border-slate-300'}`}>
                      <p className="font-medium text-sm text-slate-800">{t.label}</p>
                      {t.description && <p className="text-xs text-slate-500 mt-0.5">{t.description}</p>}
                    </button>
                  ))}
                </div>
              )}

              {step === 1 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-slate-700">How would you like to meet?</p>
                  {(['physical', 'online'] as const).map(mode => (
                    <button key={mode} onClick={() => setForm(f => ({ ...f, mode }))}
                      className={`w-full text-left rounded-xl border-2 p-4 transition-all flex items-center gap-3 ${form.mode === mode ? 'border-orange-500 bg-orange-50' : 'border-slate-200 hover:border-slate-300'}`}>
                      {mode === 'online' ? <Video className="h-5 w-5 text-blue-500 shrink-0" /> : <MapPin className="h-5 w-5 text-slate-500 shrink-0" />}
                      <div>
                        <p className="font-medium text-sm text-slate-800 capitalize">{mode}</p>
                        <p className="text-xs text-slate-500">{mode === 'online' ? 'Video call via Jitsi Meet' : 'In-person at the church'}</p>
                      </div>
                      {form.mode === mode && <CheckCircle2 className="h-5 w-5 text-orange-500 ml-auto shrink-0" />}
                    </button>
                  ))}
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600">Preferred Date *</Label>
                    <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} min={format(new Date(), 'yyyy-MM-dd')} className="h-10 border-slate-200 focus:border-orange-500 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600">Preferred Time *</Label>
                    <Input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} className="h-10 border-slate-200 focus:border-orange-500 text-sm" />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">Notes / Reason (optional)</Label>
                  <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={5} placeholder="Share any context or specific needs..." className="border-slate-200 focus:border-orange-500 text-sm resize-none" />
                </div>
              )}

              {step === 4 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-slate-700 mb-3">Review your request</p>
                  {[
                    { label: 'Type', value: selectedType?.label ?? '—' },
                    { label: 'Mode', value: form.mode === 'online' ? 'Online (Video Call)' : 'Physical (In-Person)' },
                    { label: 'Date', value: form.date ? format(parseISO(form.date), 'EEEE, dd MMMM yyyy') : '—' },
                    { label: 'Time', value: form.time },
                    { label: 'Notes', value: form.notes || 'None' },
                  ].map(row => (
                    <div key={row.label} className="flex justify-between text-sm border-b border-slate-100 pb-2">
                      <span className="text-slate-500">{row.label}</span>
                      <span className="font-medium text-slate-800 text-right max-w-[60%]">{row.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          {step > 0 && (
            <Button variant="outline" className="flex-1 border-slate-200 font-jakarta" onClick={() => setStep(s => s - 1)}>Back</Button>
          )}
          {step < STEP_LABELS.length - 1 ? (
            <Button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-jakarta" disabled={!canNext} onClick={() => setStep(s => s + 1)}>Continue</Button>
          ) : (
            <Button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-jakarta" disabled={submitting} onClick={submit}>
              {submitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MemberAppointments() {
  const member = useMemberPortal();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [requestOpen, setRequestOpen] = useState(false);

  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: ['member-appointments', member.memberId],
    queryFn: async () => {
      const { data, error } = await supabase.from(TABLES.APPOINTMENTS)
        .select('*, appointment_types(id,label,description), members(first_name,last_name,avatar_url)')
        .eq('member_id', member.memberId)
        .order('preferred_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Appointment[];
    },
    staleTime: 300_000,
  });

  const { data: types = [] } = useQuery<AppointmentType[]>({
    queryKey: ['appointment-types', member.churchId],
    queryFn: async () => {
      const { data, error } = await supabase.from(TABLES.APPOINTMENT_TYPES)
        .select('*').eq(COLS.TENANT_ID, member.churchId).eq('is_active', true).order('sort_order');
      if (error) throw error;
      return (data ?? []) as AppointmentType[];
    },
    staleTime: 300_000,
  });

  // Group by date
  const grouped = appointments.reduce<Record<string, Appointment[]>>((acc, apt) => {
    const key = apt.preferred_date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(apt);
    return acc;
  }, {});

  const memberName = `${member.firstName} ${member.lastName}`;

  return (
    <PageTransition>
      <Helmet><title>My Appointments — Vestry</title></Helmet>
      <div className="font-jakarta max-w-2xl mx-auto space-y-6 pb-8">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/member')} className="h-9 w-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <p className="text-xs text-slate-500 font-jakarta">{member.churchName}</p>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 font-jakarta leading-tight">My Appointments</h1>
            </div>
          </div>
          <Button onClick={() => setRequestOpen(true)} className="bg-orange-500 hover:bg-orange-600 text-white font-jakarta font-semibold rounded-full gap-2 shrink-0">
            <Plus className="h-4 w-4" />Request
          </Button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
        ) : appointments.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="h-16 w-16 rounded-2xl bg-orange-50 flex items-center justify-center">
              <Calendar className="h-8 w-8 text-orange-400" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-700 font-jakarta">No appointments yet</p>
              <p className="text-sm text-slate-400 mt-1 font-jakarta">Request an appointment with church leadership</p>
            </div>
            <Button onClick={() => setRequestOpen(true)} className="bg-orange-500 hover:bg-orange-600 text-white font-jakarta rounded-full gap-2">
              <Plus className="h-4 w-4" />Request Appointment
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([dateKey, apts], gi) => (
              <motion.div key={dateKey} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: gi * 0.05 }}>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3 font-jakarta">
                  {isToday(parseISO(dateKey)) ? 'Today' : format(parseISO(dateKey), 'EEEE, dd MMMM yyyy')}
                </p>
                <div className="space-y-3">
                  {apts.map((apt, i) => {
                    const jitsiRoom = apt.jitsi_room_name ?? `vestryhub-apt-${apt.id}`;
                    const effectiveDate = apt.rescheduled_date ?? apt.preferred_date;
                    const effectiveTime = apt.rescheduled_time ?? apt.preferred_time;
                    return (
                      <motion.div key={apt.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                        whileHover={{ y: -2, boxShadow: '0 8px 25px rgba(0,0,0,0.08)' }}
                        className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 transition-shadow">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 font-jakarta">{apt.appointment_types?.label ?? 'Appointment'}</p>
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                              <span className="flex items-center gap-1 text-xs text-slate-500">
                                <Clock className="h-3 w-3" />{effectiveTime.slice(0, 5)}
                              </span>
                              <span className={`flex items-center gap-1 text-xs ${apt.mode === 'online' ? 'text-blue-600' : 'text-slate-500'}`}>
                                {apt.mode === 'online' ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                                {apt.mode === 'online' ? 'Online' : 'Physical'}
                              </span>
                              {apt.rescheduled_date && (
                                <span className="text-xs text-blue-600 font-medium">Rescheduled to {format(parseISO(apt.rescheduled_date), 'dd MMM')}</span>
                              )}
                            </div>
                          </div>
                          <StatusBadge status={apt.status} />
                        </div>

                        {apt.notes && <p className="text-xs text-slate-500 mb-3 line-clamp-2 font-jakarta">{apt.notes}</p>}

                        {apt.status === 'declined' && apt.decline_reason && (
                          <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 mb-3">
                            <p className="text-xs text-red-600 font-jakarta">Reason: {apt.decline_reason}</p>
                          </div>
                        )}

                        {apt.status === 'confirmed' && apt.mode === 'physical' && apt.location && (
                          <div className="flex items-center gap-2 text-xs text-slate-600 mb-3">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{apt.location}{apt.physical_notes ? ` — ${apt.physical_notes}` : ''}</span>
                          </div>
                        )}

                        {apt.status === 'confirmed' && apt.mode === 'online' && (
                          <div className="mt-2">
                            <JoinMeetingButton
                              meetingDate={effectiveDate}
                              meetingTime={effectiveTime}
                              roomName={jitsiRoom}
                              displayName={memberName}
                              title={apt.appointment_types?.label}
                              size="sm"
                            />
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {requestOpen && (
          <RequestDrawer
            open={requestOpen}
            onClose={() => setRequestOpen(false)}
            types={types}
            memberId={member.memberId}
            tenantId={member.churchId}
            memberName={memberName}
            onSuccess={() => qc.invalidateQueries({ queryKey: ['member-appointments', member.memberId] })}
          />
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
