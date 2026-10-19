import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { requestFcmToken, onForegroundMessage } from "@/lib/firebase";
import { toast } from "sonner";

export function useFcmToken(userId: string | null, tenantId: string | null) {
  useEffect(() => {
    if (!userId || !tenantId) return;

    // Register FCM token
    requestFcmToken().then(async (token) => {
      if (!token) return;
      let memberSessionToken: string | undefined;
      try {
        const raw = localStorage.getItem("member_session");
        const memberSession = raw ? JSON.parse(raw) : null;
        if (memberSession?.memberId === userId && memberSession?.tenantId === tenantId) {
          memberSessionToken = memberSession.sessionToken;
        }
      } catch {
        memberSessionToken = undefined;
      }

      const { error } = await supabase.functions.invoke("register-device-token", {
        body: { user_id: userId, tenant_id: tenantId, token, device_type: "web", member_session_token: memberSessionToken },
      });
      if (error) console.warn("Push token registration was not accepted");
    }).catch(() => {});

    // Handle foreground messages (app is open)
    const unsubscribe = onForegroundMessage((payload) => {
      toast(payload.notification?.title ?? "New Notification", {
        description: payload.notification?.body,
        duration: 6000,
      });
    });

    return () => { if (typeof unsubscribe === "function") unsubscribe(); };
  }, [userId, tenantId]);
}