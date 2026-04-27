import { motion, AnimatePresence } from 'framer-motion';
import { X, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface JitsiModalProps {
  open: boolean;
  onClose: () => void;
  roomName: string;
  displayName: string;
  title?: string;
}

export function JitsiModal({ open, onClose, roomName, displayName, title }: JitsiModalProps) {
  const encodedName = encodeURIComponent(displayName);

  const src = [
    `https://meet.jit.si/${roomName}`,
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
    `&userInfo.displayName=${encodedName}`,
  ].join('');

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] bg-black flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-700 shrink-0">
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5 text-green-400" />
              <span className="text-white font-semibold text-sm font-jakarta">
                {title ?? 'Meeting'}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-slate-400 hover:text-white hover:bg-slate-700 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Jitsi iframe — fills remaining space */}
          <iframe
            key={roomName}
            src={src}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            style={{ width: '100%', height: '100%', border: 'none', flex: 1 }}
            title={title ?? 'Meeting'}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
