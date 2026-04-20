import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { requestFcmToken, onForegroundMessage } from "@/lib/firebase";
import { TABLES } from "@/lib/schema";
import { toast } from "sonner";

/**
 * Registers the FCM device token for the current user on mount.
 * Also listens for foreground push messages and shows them as toasts.
 */
export function useFcmToken(userId: string, tenantId: string) {
  useEffect(() => {
    if (!userId || !tenantId) return;

    const register = async () => {
      const token = await requestFcmToken();
      if (!token) return;

      // Upsert token — update updated_at if it already exists
      await supabase.from(TABLES.DEVICE_TOKENS).upsert(
        { user_id: userId, tenant_id: tenantId, token, device_type: "web", updated_at: new Date().toISOString() } as any,
        { onConflict: "user_id,token" }
      );
    };

    register();

    // Listen for foreground messages
    const unsub = onForegroundMessage((payload: any) => {
      const title = payload.notification?.title ?? "Vestry Hub";
      const body  = payload.notification?.body  ?? "";
      toast(title, { description: body });
    });

    return () => { if (typeof unsub === "function") unsub(); };
  }, [userId, tenantId]);
}
