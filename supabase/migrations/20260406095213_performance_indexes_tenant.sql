-- Phase 8 new tables
CREATE INDEX IF NOT EXISTS idx_discipleship_resources_tenant ON discipleship_resources(tenant_id);
CREATE INDEX IF NOT EXISTS idx_resource_assignments_tenant ON resource_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_resource_collections_tenant ON resource_collections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_products_tenant ON store_products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_tenant ON store_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_tenant ON course_enrollments(tenant_id);
-- Phase 9 new tables
CREATE INDEX IF NOT EXISTS idx_saved_reports_tenant ON saved_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_prayer_requests_tenant ON prayer_requests(tenant_id);;
