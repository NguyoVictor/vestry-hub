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
      await supabase.from("device_tokens").upsert(
        { user_id: userId, tenant_id: tenantId, token, device_type: "web" },
        { onConflict: "user_id,token" }
      );
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