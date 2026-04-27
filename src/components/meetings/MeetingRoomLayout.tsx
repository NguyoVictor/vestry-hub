import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, PhoneOff, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MeetingMinutesInline } from './MeetingMinutesInline';

interface MeetingRoomLayoutProps {
  meetingId: string;
  meetingTitle: string;
  meetingDate: string;
  startTime?: string;
  status?: string;
  onClose: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

export function MeetingRoomLayout({
  meetingId, meetingTitle, meetingDate, startTime, status = 'scheduled', onClose,
}: MeetingRoomLayoutProps) {
  const navigate = useNavigate();
  const [minutesOpen, setMinutesOpen] = useState(true);
  const [isNarrow, setIsNarrow] = useState(window.innerWidth < 1024);

  // Detect narrow screens
  useEffect(() => {
    const handler = () => setIsNarrow(window.innerWidth < 1024);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // On narrow screens, minutes panel starts closed
  useEffect(() => {
    if (isNarrow) setMinutesOpen(false);
  }, [isNarrow]);

  const jitsiSrc = [
    `https://jitsi.riot.im/vestryhub-bm-${meetingId}`,
    `#config.prejoinPageEnabled=false`,
    `&config.lobby.enabled=false`,
    `&config.enableLobbyChat=false`,
    `&config.hideLobbyButton=true`,
    `&config.startWithAudioMuted=false`,
    `&config.startWithVideoMuted=false`,
    `&config.disableDeepLinking=true`,
    `&config.requireDisplayName=false`,
    `&config.enableFeaturesBasedOnToken=false`,
    `&config.disableInviteFunctions=true`,
  ].join('');

  const dateLabel = (() => {
    try { return format(parseISO(meetingDate), 'EEE d MMM yyyy'); } catch { return meetingDate; }
  })();

  const handleEnd = () => {
    onClose();
    navigate('/board-meetings');
  };

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-slate-950 font-jakarta">
      {/* ── Header bar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-700 shrink-0 h-12">
        <div className="flex items-center gap-3 min-w-0">
          <Video className="h-4 w-4 text-green-400 shrink-0" />
          <span className="text-white font-semibold text-sm truncate">{meetingTitle}</span>
          <span className="text-slate-400 text-xs hidden sm:block shrink-0">{dateLabel}{startTime ? ` · ${startTime.slice(0, 5)}` : ''}</span>
          {status && (
            <span className={`hidden sm:inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0 ${STATUS_COLORS[status] ?? STATUS_COLORS.scheduled}`}>
              {status.replace('_', ' ')}
            </span>
          )}
        </div>
        <Button
          size="sm"
          onClick={handleEnd}
          className="bg-red-600 hover:bg-red-700 text-white gap-1.5 h-8 px-3 shrink-0"
        >
          <PhoneOff className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">End Meeting</span>
        </Button>
      </div>

      {/* ── Body: Jitsi + divider + minutes ── */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Jitsi panel */}
        <motion.div
          className="flex-shrink-0 h-full"
          animate={{ width: minutesOpen && !isNarrow ? '60%' : '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <iframe
            key={meetingId}
            src={jitsiSrc}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            title={meetingTitle}
          />
        </motion.div>

        {/* Toggle button — sits on the divider */}
        <div
          className="absolute top-1/2 -translate-y-1/2 z-10 flex items-center"
          style={{
            left: minutesOpen && !isNarrow ? 'calc(60% - 14px)' : 'calc(100% - 28px)',
            transition: 'left 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <button
            onClick={() => setMinutesOpen(v => !v)}
            className="h-8 w-7 rounded-r-lg bg-slate-700 hover:bg-slate-600 border border-slate-600 flex items-center justify-center text-slate-300 hover:text-white transition-colors shadow-lg"
            title={minutesOpen ? 'Collapse minutes' : 'Open minutes'}
          >
            <motion.div
              animate={{ rotate: minutesOpen && !isNarrow ? 0 : 180 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              <ChevronRight className="h-4 w-4" />
            </motion.div>
          </button>
        </div>

        {/* Minutes panel */}
        <AnimatePresence>
          {minutesOpen && (
            <motion.div
              key="minutes-panel"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: isNarrow ? '80%' : '40%' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`h-full bg-slate-50 dark:bg-slate-900 border-l border-slate-700 overflow-y-auto overflow-x-hidden flex-shrink-0 ${isNarrow ? 'absolute right-0 top-0 z-20 shadow-2xl' : ''}`}
            >
              <MeetingMinutesInline meetingId={meetingId} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
