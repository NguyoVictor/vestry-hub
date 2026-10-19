create schema if not exists private;
create table if not exists private.ai_request_usage (id bigint generated always as identity primary key, tenant_id text not null, actor_id text not null, function_name text not null, credit_reserved boolean not null default true, requested_at timestamptz not null default now());
create index if not exists ai_request_usage_actor_recent_idx on private.ai_request_usage (tenant_id, actor_id, requested_at desc);
create index if not exists ai_request_usage_tenant_recent_idx on private.ai_request_usage (tenant_id, requested_at desc);
revoke all on table private.ai_request_usage from public, anon, authenticated;
-- reserve_ai_request/release_ai_request are service-role-only RPCs; live definitions are captured by the Stage 11C contract.
