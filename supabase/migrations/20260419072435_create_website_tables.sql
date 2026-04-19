-- Consultation requests table
CREATE TABLE IF NOT EXISTS website_consultation_requests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT,
  contact_name TEXT NOT NULL,
  church_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE website_consultation_requests ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can insert their own request
CREATE POLICY "wcr_insert" ON website_consultation_requests
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Only the submitter can read their own
CREATE POLICY "wcr_select" ON website_consultation_requests
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT users.tenant_id FROM users WHERE (users.id)::text = (auth.uid())::text LIMIT 1)::text);

-- Website reviews table (cross-tenant visible)
CREATE TABLE IF NOT EXISTS website_reviews (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL,
  church_name TEXT NOT NULL,
  reviewer_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_website_reviews_created ON website_reviews(created_at DESC);

ALTER TABLE website_reviews ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read all reviews (cross-tenant social proof)
CREATE POLICY "wr_select" ON website_reviews
  FOR SELECT TO authenticated
  USING (true);

-- Authenticated users can insert their own review
CREATE POLICY "wr_insert" ON website_reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = (SELECT users.tenant_id FROM users WHERE (users.id)::text = (auth.uid())::text LIMIT 1)::text
  );

-- Users can update/delete only their own tenant's review
CREATE POLICY "wr_update" ON website_reviews
  FOR UPDATE TO authenticated
  USING (
    tenant_id = (SELECT users.tenant_id FROM users WHERE (users.id)::text = (auth.uid())::text LIMIT 1)::text
  );

CREATE POLICY "wr_delete" ON website_reviews
  FOR DELETE TO authenticated
  USING (
    tenant_id = (SELECT users.tenant_id FROM users WHERE (users.id)::text = (auth.uid())::text LIMIT 1)::text
  );;
