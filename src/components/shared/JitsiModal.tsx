import { useEffect, useRef } from 'react';
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

declare global {
  interface Window { JitsiMeetExternalAPI: any; }
}

export function JitsiModal({ open, onClose, roomName, displayName, title }: JitsiModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);

  useEffect(() => {
    if (!open || !containerRef.current) return;

    const initJitsi = () => {
      if (!window.JitsiMeetExternalAPI || !containerRef.current) return;
      if (apiRef.current) { try { apiRef.current.dispose(); } catch {} apiRef.current = null; }

      apiRef.current = new window.JitsiMeetExternalAPI('meet.jit.si', {
        roomName,
        parentNode: containerRef.current,
        width: '100%',
        height: '100%',
        configOverwrite: {
          // ── Disable ALL waiting room / lobby / prejoin screens ──
          prejoinPageEnabled: false,
          prejoinConfig: { enabled: false },
          lobby: { autoKnock: false, enableChat: false },
          enableLobbyChat: false,
          hideLobbyButton: true,
          // ── Disable moderator requirement ──
          enableFeaturesBasedOnToken: false,
          requireDisplayName: false,
          // ── Audio/video defaults ──
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          disableDeepLinking: true,
          disableInviteFunctions: true,
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_BRAND_WATERMARK: false,
          SHOW_POWERED_BY: false,
          TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'desktop', 'fullscreen',
            'fodeviceselection', 'hangup', 'chat', 'raisehand',
            'videoquality', 'filmstrip', 'tileview', 'help',
          ],
        },
        userInfo: { displayName },
      });

      apiRef.current.addEventListener('readyToClose', onClose);
    };

    if (window.JitsiMeetExternalAPI) {
      initJitsi();
    } else {
      const existing = document.querySelector('script[src="https://meet.jit.si/external_api.js"]');
      if (existing) {
        existing.addEventListener('load', initJitsi);
      } else {
        const script = document.createElement('script');
        script.src = 'https://meet.jit.si/external_api.js';
        script.async = true;
        script.onload = initJitsi;
        document.head.appendChild(script);
      }
    }

    return () => {
      if (apiRef.current) { try { apiRef.current.dispose(); } catch {} apiRef.current = null; }
    };
  }, [open, roomName, displayName]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black flex flex-col"
        >
          <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-700 shrink-0">
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5 text-green-400" />
              <span className="text-white font-semibold text-sm font-jakarta">{title ?? 'Meeting'}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}
              className="text-slate-400 hover:text-white hover:bg-slate-700 h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div ref={containerRef} className="flex-1 w-full" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
