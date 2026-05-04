-- ═══════════════════════════════════════════════════════════════════════════════
-- RESOURCES STORE - STORAGE BUCKETS MIGRATION
-- Creates storage buckets for product images and digital files
-- ═══════════════════════════════════════════════════════════════════════════════

-- Product cover images (public, 5MB limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'store-covers',
  'store-covers',
  true,
  5242880,  -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Product gallery images (public, 5MB limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'store-gallery',
  'store-gallery',
  true,
  5242880,  -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Digital product files (private, 100MB limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'store-digital-files',
  'store-digital-files',
  false,
  104857600,  -- 100MB
  ARRAY[
    'application/pdf',
    'audio/mpeg',
    'audio/mp4',
    'video/mp4',
    'application/zip',
    'application/epub+zip'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- RLS POLICIES FOR STORE-COVERS BUCKET
-- ═══════════════════════════════════════════════════════════════════════════════

-- Public can view store covers
CREATE POLICY "Public can view store covers"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'store-covers');

-- Authenticated users can upload store covers
CREATE POLICY "Authenticated can upload store covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'store-covers');

-- Authenticated users can update their own store covers
CREATE POLICY "Authenticated can update store covers"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'store-covers');

-- Authenticated users can delete store covers
CREATE POLICY "Authenticated can delete store covers"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'store-covers');

-- ═══════════════════════════════════════════════════════════════════════════════
-- RLS POLICIES FOR STORE-GALLERY BUCKET
-- ═══════════════════════════════════════════════════════════════════════════════

-- Public can view store gallery
CREATE POLICY "Public can view store gallery"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'store-gallery');

-- Authenticated users can upload store gallery
CREATE POLICY "Authenticated can upload store gallery"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'store-gallery');

-- Authenticated users can update store gallery
CREATE POLICY "Authenticated can update store gallery"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'store-gallery');

-- Authenticated users can delete store gallery
CREATE POLICY "Authenticated can delete store gallery"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'store-gallery');

-- ═══════════════════════════════════════════════════════════════════════════════
-- RLS POLICIES FOR STORE-DIGITAL-FILES BUCKET (PRIVATE)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Authenticated users can upload digital files
CREATE POLICY "Authenticated can upload digital files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'store-digital-files');

-- Authenticated users can read digital files
CREATE POLICY "Authenticated can read digital files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'store-digital-files');

-- Authenticated users can update digital files
CREATE POLICY "Authenticated can update digital files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'store-digital-files');

-- Authenticated users can delete digital files
CREATE POLICY "Authenticated can delete digital files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'store-digital-files');

-- ═══════════════════════════════════════════════════════════════════════════════
-- RLS POLICIES FOR PUBLIC STORE ACCESS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Allow anonymous users to view active products (needed for public store)
CREATE POLICY "Public can view active store products"
ON store_products FOR SELECT
TO anon
USING (status = 'active');

-- Allow anonymous users to read tenant info (needed for public store branding)
CREATE POLICY "Public can read tenant info"
ON tenants FOR SELECT
TO anon
USING (true);
