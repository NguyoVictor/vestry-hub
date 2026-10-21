
-- ============================================================
-- Migration: 20260524130000
-- Original: Fix FINAL DESTINATION PayHero configuration
-- ============================================================
--
-- This migration previously updated a specific tenant:
-- FINAL DESTINATION
--
-- Tenant-specific payment configuration is not portable
-- across staging, development, and production environments.
--
-- PayHero connection status must be established through
-- an authorized configuration workflow after validating
-- the correct tenant, payment channel, and credentials.
--
-- No schema changes are required by this migration.
-- ============================================================

DO $migration$
BEGIN
    RAISE NOTICE
        'Skipping tenant-specific PayHero configuration. Configure through the authorized payment settings workflow.';
END;
$migration$;
