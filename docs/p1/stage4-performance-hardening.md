# Phase 1 Stage 4 - Database Performance Hardening

## Scope

This milestone intentionally addresses only justified, high-value relationship indexes. It does **not** index every advisor finding.

## Live baseline

- Supabase project: `crjdsxxkspvdwknrmijs`
- Performance advisor baseline: **128** unindexed foreign-key findings.
- Live table statistics showed the most relevant Phase 1 traffic concentrated around members, giving, messaging, events, services, notifications/communications, and related tenant-scoped tables.

## Selection criteria

Indexes were added only where at least one of these was true:

1. the application repeatedly filters or joins on the relationship;
2. the relationship participates in tenant-scoped access patterns;
3. the table is part of a Phase 1 priority area: People, Events/Attendance, Engagement, Messaging, Finance, or Operations;
4. the index also covers a composite foreign key and therefore removes more than one advisor finding.

Creator/audit-only relationships and low-use tables were intentionally deferred unless a clear query pattern justified them.

## Applied migration

`20261005092533_p1_performance_index_hardening.sql`

The migration adds indexes for targeted relationships in:

- accounts payable;
- attendance sessions;
- budgets and budget categories;
- giving records;
- messages;
- announcement comments, reactions, and read receipts;
- events and services branch relationships;
- facilities and facility booking responses;
- families;
- service attendance;
- volunteer hours;
- appointments.

## Live result

After applying the migration and rerunning the Supabase performance advisor:

- Before: **128** unindexed foreign-key findings
- After: **103** unindexed foreign-key findings
- Reduction: **25 findings**

The reduction is larger than the raw count of some individual index statements because a single composite index can cover multiple related foreign-key findings.

## Deferred findings

The remaining 103 findings are not treated as failures by default. Many are low-volume, creator/audit relationships, or tables without demonstrated Phase 1 traffic. They should be revisited using production query statistics rather than indexed mechanically.

Examples intentionally left for later review include various `created_by`, `approved_by`, audit-log, training/media, and rarely populated feature relationships.

## Verification

Before the Stage 4 commit:

```bash
npm run test:security:secrets
npm run test:p1:performance:contract
git diff --check
npx tsc --noEmit
npm run build
```

The live migration is already deployed. The repository migration file must remain aligned with version `20261005092533`.
