import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
    `https://jitsi.riot.im/${roomName}`,
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

  // Lock body scroll when open to prevent page jumping
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const modal = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          // Use position:fixed with explicit viewport dimensions so it works
          // inside any scroll container (member portal, admin layout, etc.)
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100dvh', // dvh = dynamic viewport height, handles mobile browser chrome
            zIndex: 9999,
            background: '#000',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            height: 48,
            background: '#0f172a',
            borderBottom: '1px solid #1e293b',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Video style={{ width: 18, height: 18, color: '#4ade80' }} />
              <span style={{ color: '#fff', fontWeight: 600, fontSize: 14, fontFamily: 'inherit' }}>
                {title ?? 'Meeting'}
              </span>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'transparent', border: 'none',
                color: '#94a3b8', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#1e293b'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8'; }}
              aria-label="Close meeting"
            >
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>

          {/* Jitsi iframe — fills all remaining space */}
          <iframe
            key={roomName}
            src={src}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            style={{
              width: '100%',
              flex: 1,
              border: 'none',
              display: 'block',
              // Explicit min-height prevents iframe from collapsing on mobile
              minHeight: 0,
            }}
            title={title ?? 'Meeting'}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Render via portal so it escapes any parent scroll container
  return createPortal(modal, document.body);
}
