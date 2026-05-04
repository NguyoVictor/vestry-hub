import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect } from 'react';
import { format } from 'date-fns';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  recording: {
    id: string;
    title: string;
    recording_url: string;
    stream_date?: string;
    ended_at?: string;
    pastor_name?: string;
    series_name?: string;
    scripture?: string;
    recording_duration?: number;
  };
}

export function VideoModal({ isOpen, onClose, recording }: VideoModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Detect video type from URL
  const getVideoType = (url: string): 'youtube' | 'vimeo' | 'direct' => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return 'youtube';
    }
    if (url.includes('vimeo.com')) {
      return 'vimeo';
    }
    return 'direct';
  };

  // Extract YouTube video ID
  const getYouTubeId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  // Extract Vimeo video ID
  const getVimeoId = (url: string): string | null => {
    const regExp = /vimeo.com\/(\d+)/;
    const match = url.match(regExp);
    return match ? match[1] : null;
  };

  const videoType = getVideoType(recording.recording_url);
  const displayDate = recording.ended_at || recording.stream_date;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
              aria-label="Close video modal"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Video Player */}
            <div className="aspect-video bg-black">
              {videoType === 'youtube' && getYouTubeId(recording.recording_url) && (
                <iframe
                  src={`https://www.youtube.com/embed/${getYouTubeId(recording.recording_url)}?autoplay=1`}
                  title={recording.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              )}

              {videoType === 'vimeo' && getVimeoId(recording.recording_url) && (
                <iframe
                  src={`https://player.vimeo.com/video/${getVimeoId(recording.recording_url)}?autoplay=1`}
                  title={recording.title}
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              )}

              {videoType === 'direct' && (
                <video
                  src={recording.recording_url}
                  controls
                  autoPlay
                  className="w-full h-full"
                >
                  Your browser does not support the video tag.
                </video>
              )}
            </div>

            {/* Metadata */}
            <div className="p-6 space-y-3">
              {/* Title */}
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {recording.title}
              </h2>

              {/* Date */}
              {displayDate && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {format(new Date(displayDate), 'EEEE, MMMM d, yyyy')}
                </p>
              )}

              {/* Metadata Row */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                {recording.pastor_name && (
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium">Pastor:</span>
                    <span>{recording.pastor_name}</span>
                  </div>
                )}
                {recording.series_name && (
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium">Series:</span>
                    <span>{recording.series_name}</span>
                  </div>
                )}
                {recording.scripture && (
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium">Scripture:</span>
                    <span>{recording.scripture}</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
