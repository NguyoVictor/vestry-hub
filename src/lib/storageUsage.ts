// T12 — storage usage is computed on the server from the church's files in
// Storage (migration 20261123130000). Browsers no longer write
// tenant_subscriptions.storage_used_gb (that write was always refused).
import { supabase } from "@/integrations/supabase/client";

export interface StorageUsage { used_bytes: number; used_gb: number; limit_gb: number }

export const STORAGE_CHANGED_EVENT = "vestry:storage-changed";

export async function fetchStorageUsage(tenantId: string): Promise<StorageUsage | null> {
  const { data, error } = await supabase.rpc("refresh_storage_usage", { p_tenant_id: tenantId });
  if (error) return null;
  return data as unknown as StorageUsage;
}

/** Call after an upload or delete: recomputes on the server and tells open screens to reload usage. Never throws. */
export async function refreshStorageUsage(tenantId: string | null | undefined): Promise<void> {
  if (!tenantId) return;
  try {
    await fetchStorageUsage(tenantId);
  } finally {
    try { window.dispatchEvent(new CustomEvent(STORAGE_CHANGED_EVENT, { detail: { tenantId } })); } catch { /* non-browser */ }
  }
}
