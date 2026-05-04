import { motion } from "framer-motion";
import { Eye } from "lucide-react";

interface StreamPlayerProps {
  provider: 'youtube' | 'facebook' | 'jitsi' | 'custom';
  streamUrl?: string;
  jitsiRoom?: string;
  isLive: boolean;
  viewerCount: number;
}

export const StreamPlayer = ({
  provider,
  streamUrl,
  jitsiRoom,
  isLive,
  viewerCount
}: StreamPlayerProps) => {
  const renderPlayer = () => {
    switch (provider) {
      case 'youtube':
        if (!streamUrl) return null;
        return (
          <iframe
            src={`${streamUrl}?autoplay=1`}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="YouTube Live Stream"
          />
        );

      case 'facebook':
        if (!streamUrl) return null;
        return (
          <iframe
            src={`https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(streamUrl)}&autoplay=1`}
            className="absolute inset-0 w-full h-full"
            allowFullScreen
            title="Facebook Live Stream"
          />
        );

      case 'jitsi':
        if (!jitsiRoom) return null;
        return (
          <iframe
            src={`https://meet.jit.si/${jitsiRoom}#config.prejoinPageEnabled=false&config.startWithAudioMuted=true&config.startWithVideoMuted=true`}
            className="absolute inset-0 w-full h-full"
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            allowFullScreen
            title="Jitsi Live Stream"
          />
        );

      case 'custom':
        if (!streamUrl) return null;
        return (
          <iframe
            src={streamUrl}
            className="absolute inset-0 w-full h-full"
            allowFullScreen
            title="Custom Live Stream"
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="relative w-full aspect-video bg-slate-900 rounded-2xl overflow-hidden shadow-lg">
      {/* Stream Player */}
      {renderPlayer()}

      {/* Live Badge - Top Left */}
      {isLive && (
        <motion.div
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="absolute top-4 left-4 z-10"
        >
          <div className="flex items-center gap-2 bg-red-500 text-white rounded-full px-3 py-1.5 shadow-lg">
            <div className="w-2 h-2 bg-white rounded-full" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              LIVE
            </span>
          </div>
        </motion.div>
      )}

      {/* Viewer Count - Top Right */}
      {isLive && viewerCount > 0 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute top-4 right-4 z-10"
        >
          <div className="flex items-center gap-2 bg-black/70 backdrop-blur-sm text-white rounded-full px-3 py-1.5 shadow-lg">
            <Eye className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">
              {viewerCount.toLocaleString()} watching
            </span>
          </div>
        </motion.div>
      )}

      {/* Fallback for no stream */}
      {!streamUrl && !jitsiRoom && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-violet-600 to-violet-900">
          <div className="text-center text-white/70">
            <p className="text-sm font-medium">Stream not configured</p>
          </div>
        </div>
      )}
    </div>
  );
};
