import { motion } from "framer-motion";
import { Play, Eye } from "lucide-react";
import { format } from "date-fns";

/**
 * Props for the RecordingCard component
 * Used to display past service recordings in a card format
 */
export interface RecordingCardProps {
  /** Unique identifier for the recording */
  id: string;
  /** Title of the recorded service */
  title: string;
  /** Optional thumbnail image URL */
  thumbnailUrl?: string;
  /** Duration of the recording in seconds */
  duration: number;
  /** ISO date string of when the service was streamed */
  streamDate: string;
  /** Optional series name the service belongs to */
  seriesName?: string;
  /** Number of times the recording has been viewed */
  viewCount: number;
  /** Callback function when the card is clicked */
  onClick: () => void;
}

/**
 * RecordingCard Component
 * 
 * Displays a past service recording with thumbnail, metadata, and hover effects.
 * Used in the Watch Live page recordings tab and recent recordings strip.
 */
export const RecordingCard = ({
  id,
  title,
  thumbnailUrl,
  duration,
  streamDate,
  seriesName,
  viewCount,
  onClick,
}: RecordingCardProps) => {
  /**
   * Format duration from seconds to MM:SS format
   */
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={onClick}
      className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer group"
    >
      {/* Thumbnail Area */}
      <div className="aspect-video relative overflow-hidden">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-violet-600 to-violet-900 flex items-center justify-center">
            <Play className="h-12 w-12 text-white/50" />
          </div>
        )}
        
        {/* Hover Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          className="absolute inset-0 bg-black/50 flex items-center justify-center"
        >
          <motion.div
            whileHover={{ scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center"
          >
            <Play className="h-6 w-6 text-white" />
          </motion.div>
        </motion.div>
        
        {/* Duration Chip */}
        <div className="absolute bottom-2 right-2 bg-black/70 text-white rounded-lg px-2 py-0.5 text-xs font-medium">
          {formatDuration(duration)}
        </div>
      </div>
      
      {/* Card Body */}
      <div className="p-3">
        <h3 className="font-medium text-sm line-clamp-2 text-slate-900 dark:text-slate-100">
          {title}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {format(new Date(streamDate), 'MMM d, yyyy')}
        </p>
        
        {/* Series Badge */}
        {seriesName && (
          <span className="inline-flex items-center rounded-full bg-violet-100 dark:bg-violet-900/20 px-2 py-0.5 text-xs text-violet-700 dark:text-violet-300 mt-2">
            {seriesName}
          </span>
        )}
        
        {/* View Count */}
        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-2">
          <Eye className="h-3 w-3" />
          <span>{viewCount.toLocaleString()}</span>
        </div>
      </div>
    </motion.div>
  );
};
