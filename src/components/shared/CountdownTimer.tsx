import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface CountdownTimerProps {
  targetDate: string;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export const CountdownTimer = ({ targetDate }: CountdownTimerProps) => {
  const calculateTimeRemaining = (): TimeRemaining => {
    const now = new Date().getTime();
    const target = new Date(targetDate).getTime();
    const diff = target - now;

    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000)
    };
  };

  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(calculateTimeRemaining());

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining());
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  const units: Array<{ label: string; value: number }> = [
    { label: 'DAYS', value: timeRemaining.days },
    { label: 'HOURS', value: timeRemaining.hours },
    { label: 'MINS', value: timeRemaining.minutes },
    { label: 'SECS', value: timeRemaining.seconds }
  ];

  return (
    <div className="grid grid-cols-4 gap-3 sm:gap-4">
      {units.map((unit) => (
        <div
          key={unit.label}
          className="rounded-xl bg-slate-100 dark:bg-slate-800 p-3 sm:p-4 text-center"
        >
          <motion.span
            key={unit.value}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="block text-2xl sm:text-3xl font-bold font-mono text-slate-900 dark:text-slate-100"
          >
            {String(unit.value).padStart(2, '0')}
          </motion.span>
          <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1 font-jakarta font-medium">
            {unit.label}
          </p>
        </div>
      ))}
    </div>
  );
};
