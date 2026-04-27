import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Video } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { JitsiModal } from './JitsiModal';

interface JoinMeetingButtonProps {
  meetingDate: string;    // yyyy-MM-dd
  meetingTime?: string;   // HH:mm or HH:mm:ss  (start time)
  endTime?: string;       // HH:mm or HH:mm:ss  (optional end time)
  roomName: string;
  displayName: string;
  title?: string;
  size?: 'sm' | 'default';
}

/**
 * Returns true when:
 *   - date matches today (local timezone)
 *   - current time >= startTime - 10 minutes
 *   - current time <= endTime  (if provided, else no upper bound)
 */
function isMeetingActive(meetingDate: string, meetingTime?: string, endTime?: string): boolean {
  const now = new Date();

  // Compare date in local timezone
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (meetingDate !== todayStr) return false;

  if (!meetingTime) return true; // date matches, no time restriction

  // Parse start time
  const [sh, sm] = meetingTime.slice(0, 5).split(':').map(Number);
  const startMinutes = sh * 60 + sm;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // Allow entry 10 minutes before start
  if (nowMinutes < startMinutes - 10) return false;

  // Check end time if provided
  if (endTime) {
    const [eh, em] = endTime.slice(0, 5).split(':').map(Number);
    const endMinutes = eh * 60 + em;
    if (nowMinutes > endMinutes) return false;
  }

  return true;
}

function formatTooltip(meetingDate: string, meetingTime?: string): string {
  try {
    const date = parseISO(meetingDate);
    const dateStr = format(date, 'EEE d MMM');
    if (!meetingTime) return `Meeting on ${dateStr}`;
    const [h, m] = meetingTime.slice(0, 5).split(':').map(Number);
    const d = new Date(); d.setHours(h, m, 0, 0);
    const timeStr = format(d, 'h:mm aa');
    return `Meeting on ${dateStr} at ${timeStr}`;
  } catch {
    return 'Meeting not yet started';
  }
}

function formatMobileLabel(meetingDate: string, meetingTime?: string): string {
  try {
    const date = parseISO(meetingDate);
    const dateStr = format(date, 'dd MMM yyyy');
    if (!meetingTime) return `Meeting starts ${dateStr}`;
    const [h, m] = meetingTime.slice(0, 5).split(':').map(Number);
    const d = new Date(); d.setHours(h, m, 0, 0);
    const timeStr = format(d, 'h:mm aa');
    return `Meeting starts ${dateStr} at ${timeStr}`;
  } catch {
    return 'Meeting not yet started';
  }
}

export function JoinMeetingButton({
  meetingDate, meetingTime, endTime, roomName, displayName, title, size = 'default',
}: JoinMeetingButtonProps) {
  const [active, setActive] = useState(() => isMeetingActive(meetingDate, meetingTime, endTime));
  const [jitsiOpen, setJitsiOpen] = useState(false);

  // Re-check every 30 seconds so the button unlocks automatically
  useEffect(() => {
    const tick = () => setActive(isMeetingActive(meetingDate, meetingTime, endTime));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [meetingDate, meetingTime, endTime]);

  const tooltipText = formatTooltip(meetingDate, meetingTime);
  const mobileLabel = formatMobileLabel(meetingDate, meetingTime);

  const btn = (
    <motion.div
      animate={{ opacity: active ? 1 : 0.55 }}
      transition={{ duration: 0.3 }}
      className="inline-flex"
    >
      <Button
        size={size}
        disabled={!active}
        onClick={() => active && setJitsiOpen(true)}
        className={`gap-2 font-jakarta font-semibold transition-all duration-300 ${
          active
            ? 'bg-green-500 hover:bg-green-600 text-white shadow-sm shadow-green-200 cursor-pointer'
            : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed pointer-events-none'
        }`}
      >
        <Video className="h-4 w-4" />
        Join Meeting
      </Button>
    </motion.div>
  );

  return (
    <>
      {/* Desktop: tooltip when inactive */}
      <div className="hidden sm:block">
        {!active ? (
          <Tooltip>
            <TooltipTrigger asChild>
              {/* Wrap in span so tooltip works on disabled button */}
              <span className="inline-flex cursor-not-allowed">{btn}</span>
            </TooltipTrigger>
            <TooltipContent side="top" className="font-jakarta text-xs max-w-[200px] text-center">
              {tooltipText}
            </TooltipContent>
          </Tooltip>
        ) : btn}
      </div>

      {/* Mobile: static label when inactive */}
      <div className="sm:hidden flex flex-col items-start gap-1">
        {btn}
        {!active && (
          <p className="text-xs text-slate-400 font-jakarta">{mobileLabel}</p>
        )}
      </div>

      <JitsiModal
        open={jitsiOpen}
        onClose={() => setJitsiOpen(false)}
        roomName={roomName}
        displayName={displayName}
        title={title}
      />
    </>
  );
}
