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

      console.log('Attempting to register FCM token for user:', userId, 'tenant:', tenantId);

      // Try upsert first
      const { error } = await supabase.from(TABLES.DEVICE_TOKENS).upsert(
        { 
          user_id: userId, 
          tenant_id: tenantId, 
          token, 
          device_type: "web", 
          updated_at: new Date().toISOString() 
        },
        { 
          onConflict: "user_id,token"
        }
      );

      if (error) {
        console.error('FCM token registration error:', error);
        console.error('FCM token registration details:', {
          userId,
          tenantId,
          token: token.substring(0, 20) + '...',
          errorCode: error.code,
          errorMessage: error.message,
          errorDetails: error.details
        });
        
        // Try a simple insert as fallback
        console.log('Trying simple insert as fallback...');
        const { error: insertError } = await supabase.from(TABLES.DEVICE_TOKENS).insert({
          user_id: userId, 
          tenant_id: tenantId, 
          token, 
          device_type: "web"
        });
        
        if (insertError) {
          console.error('FCM token simple insert also failed:', insertError);
        } else {
          console.log('FCM token registered successfully via simple insert');
        }
      } else {
        console.log('FCM token registered successfully via upsert');
      }
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
