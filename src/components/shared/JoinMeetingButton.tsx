import { useState } from 'react';
import { motion } from 'framer-motion';
import { Video } from 'lucide-react';
import { format, isToday, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { JitsiModal } from './JitsiModal';

interface JoinMeetingButtonProps {
  meetingDate: string;       // yyyy-MM-dd
  meetingTime?: string;      // HH:mm or HH:mm:ss
  roomName: string;
  displayName: string;
  title?: string;
  size?: 'sm' | 'default';
}

export function JoinMeetingButton({ meetingDate, meetingTime, roomName, displayName, title, size = 'default' }: JoinMeetingButtonProps) {
  const [jitsiOpen, setJitsiOpen] = useState(false);
  const active = isToday(parseISO(meetingDate));
  const timeLabel = meetingTime ? meetingTime.slice(0, 5) : '';
  const dateLabel = format(parseISO(meetingDate), 'dd MMM yyyy');
  const tooltipText = `Meeting on ${dateLabel}${timeLabel ? ` at ${timeLabel}` : ''}`;

  const btn = (
    <motion.div
      animate={{ opacity: active ? 1 : 0.5 }}
      transition={{ duration: 0.3 }}
      className="inline-flex"
    >
      <Button
        size={size}
        disabled={!active}
        onClick={() => active && setJitsiOpen(true)}
        className={`gap-2 font-jakarta font-semibold transition-all duration-300 ${
          active
            ? 'bg-green-500 hover:bg-green-600 text-white shadow-sm shadow-green-200'
            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
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
            <TooltipTrigger asChild>{btn}</TooltipTrigger>
            <TooltipContent side="top" className="font-jakarta text-xs">{tooltipText}</TooltipContent>
          </Tooltip>
        ) : btn}
      </div>

      {/* Mobile: static label when inactive */}
      <div className="sm:hidden flex flex-col items-start gap-1">
        {btn}
        {!active && (
          <p className="text-xs text-slate-400 font-jakarta">Meeting starts {dateLabel}{timeLabel ? ` at ${timeLabel}` : ''}</p>
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
