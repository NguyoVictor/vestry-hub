export type MediaType = 'image' | 'audio' | 'video';
export type MediaVisibility = 'members' | 'leaders' | 'admin' | 'featured';
export type AlbumVisibility = 'members' | 'leaders' | 'admin';
export type CategoryStatus = 'active' | 'inactive';

export interface StoragePlan {
  id: string;
  name: string;
  storage_limit: number;
  price_usd: number;
  description: string | null;
  features: string[];
  sort_order: number;
  created_at: string;
}

export interface ChurchStorage {
  id: string;
  tenant_id: string;
  storage_plan_id: string;
  storage_used_bytes: number;
  plan_activated_at: string | null;
  plan_expires_at: string | null;
  upgrade_requested_at: string | null;
  upgrade_requested_plan_id: string | null;
  storage_warning_sent_at: string | null;
  storage_full_notified_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  storage_plans?: StoragePlan;
}

export interface StorageStats {
  used_bytes: number;
  limit_bytes: number;
  percentage: number;
  plan_name: string;
  plan_price: number;
  is_over_limit: boolean;
  is_near_limit: boolean;
  upgrade_pending: boolean;
}

export interface MediaCategory {
  id: string;
  tenant_id: string;
  name: string;
  color: string;
  description: string | null;
  status: CategoryStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface MediaAlbum {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  cover_media_id: string | null;
  visibility: AlbumVisibility;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Derived
  item_count?: number;
  cover_url?: string | null;
  preview_urls?: string[];
}

export interface ChurchMediaItem {
  id: string;
  tenant_id: string;
  album_id: string | null;
  category_id: string | null;
  media_type: MediaType;
  title: string | null;
  description: string | null;
  category: string | null;
  file_url: string;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  storage_path: string | null;
  visibility: MediaVisibility;
  is_featured: boolean;
  download_enabled: boolean;
  view_count: number;
  duration: number | null;
  thumbnail_url: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  media_categories?: Pick<MediaCategory, 'name' | 'color'> | null;
  media_albums?: Pick<MediaAlbum, 'name'> | null;
}
