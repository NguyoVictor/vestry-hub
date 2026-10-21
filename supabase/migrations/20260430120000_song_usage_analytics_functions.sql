-- ============================================================
-- Song Usage Analytics - Duplicate Migration
-- Migration: 20260430120000
-- ============================================================
--
-- The analytics functions were already created by:
-- 20260430000003_song_usage_analytics_functions.sql
--
-- This migration previously redefined the same four functions
-- and repeated execution grants.
--
-- Intentionally no-op to avoid unnecessary redefinition and
-- restoring unrestricted access to privileged functions.
--
-- No schema changes are required in this migration.
-- ============================================================

SELECT 1;
