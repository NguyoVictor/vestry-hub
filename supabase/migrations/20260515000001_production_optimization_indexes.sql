
-- ============================================================
-- PRODUCTION OPTIMIZATION: CRITICAL PERFORMANCE INDEXES
-- Migration: 20260515000001
-- ============================================================
--
-- Optimizes tenant-scoped queries, relationships, searches,
-- and activity reporting.
--
-- Migration safety:
-- 1. No CREATE INDEX CONCURRENTLY inside transactions.
-- 2. Missing tables or columns are skipped with a NOTICE.
-- 3. No unsupported ADD CONSTRAINT IF NOT EXISTS syntax.
-- 4. No volatile expressions in partial indexes.
-- 5. No references to services.is_published.
-- 6. No data modification or permission changes.
--
-- Unique business constraints are intentionally deferred
-- until duplicates and application rules are verified.
-- ============================================================

-- ============================================================
-- PHASE 1: CREATE VALID PERFORMANCE INDEXES
-- ============================================================

DO $migration$
DECLARE
    idx RECORD;
    missing_columns TEXT[];
    required_column TEXT;
BEGIN

    FOR idx IN
        SELECT *
        FROM (
            VALUES

            -- --------------------------------------------
            -- Core multi-tenant indexes
            -- --------------------------------------------

            (
                'idx_tenants_church_code',
                'tenants',
                ARRAY['church_code'],
                'CREATE INDEX IF NOT EXISTS idx_tenants_church_code ON public.tenants(church_code)'
            ),
            (
                'idx_users_tenant_id',
                'users',
                ARRAY['tenant_id'],
                'CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON public.users(tenant_id)'
            ),
            (
                'idx_members_tenant_id',
                'members',
                ARRAY['tenant_id'],
                'CREATE INDEX IF NOT EXISTS idx_members_tenant_id ON public.members(tenant_id)'
            ),
            (
                'idx_groups_tenant_id',
                'groups',
                ARRAY['tenant_id'],
                'CREATE INDEX IF NOT EXISTS idx_groups_tenant_id ON public.groups(tenant_id)'
            ),
            (
                'idx_events_tenant_id',
                'events',
                ARRAY['tenant_id'],
                'CREATE INDEX IF NOT EXISTS idx_events_tenant_id ON public.events(tenant_id)'
            ),
            (
                'idx_services_tenant_id',
                'services',
                ARRAY['tenant_id'],
                'CREATE INDEX IF NOT EXISTS idx_services_tenant_id ON public.services(tenant_id)'
            ),
            (
                'idx_giving_records_tenant_id',
                'giving_records',
                ARRAY['tenant_id'],
                'CREATE INDEX IF NOT EXISTS idx_giving_records_tenant_id ON public.giving_records(tenant_id)'
            ),
            (
                'idx_expenses_tenant_id',
                'expenses',
                ARRAY['tenant_id'],
                'CREATE INDEX IF NOT EXISTS idx_expenses_tenant_id ON public.expenses(tenant_id)'
            ),
            (
                'idx_volunteers_tenant_id',
                'volunteers',
                ARRAY['tenant_id'],
                'CREATE INDEX IF NOT EXISTS idx_volunteers_tenant_id ON public.volunteers(tenant_id)'
            ),
            (
                'idx_announcements_tenant_id',
                'announcements',
                ARRAY['tenant_id'],
                'CREATE INDEX IF NOT EXISTS idx_announcements_tenant_id ON public.announcements(tenant_id)'
            ),
            (
                'idx_testimonies_tenant_id',
                'testimonies',
                ARRAY['tenant_id'],
                'CREATE INDEX IF NOT EXISTS idx_testimonies_tenant_id ON public.testimonies(tenant_id)'
            ),
            (
                'idx_sermons_tenant_id',
                'sermons',
                ARRAY['tenant_id'],
                'CREATE INDEX IF NOT EXISTS idx_sermons_tenant_id ON public.sermons(tenant_id)'
            ),
            (
                'idx_songs_tenant_id',
                'songs',
                ARRAY['tenant_id'],
                'CREATE INDEX IF NOT EXISTS idx_songs_tenant_id ON public.songs(tenant_id)'
            ),
            (
                'idx_activity_log_tenant_id',
                'activity_log',
                ARRAY['tenant_id'],
                'CREATE INDEX IF NOT EXISTS idx_activity_log_tenant_id ON public.activity_log(tenant_id)'
            ),
            (
                'idx_notifications_tenant_id',
                'notifications',
                ARRAY['tenant_id'],
                'CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id ON public.notifications(tenant_id)'
            ),

            -- --------------------------------------------
            -- Members
            -- --------------------------------------------

            (
                'idx_members_tenant_status',
                'members',
                ARRAY['tenant_id', 'status'],
                'CREATE INDEX IF NOT EXISTS idx_members_tenant_status ON public.members(tenant_id, status)'
            ),
            (
                'idx_members_tenant_membership_status',
                'members',
                ARRAY['tenant_id', 'membership_status'],
                'CREATE INDEX IF NOT EXISTS idx_members_tenant_membership_status ON public.members(tenant_id, membership_status)'
            ),
            (
                'idx_members_tenant_created',
                'members',
                ARRAY['tenant_id', 'created_at'],
                'CREATE INDEX IF NOT EXISTS idx_members_tenant_created ON public.members(tenant_id, created_at DESC)'
            ),

            -- --------------------------------------------
            -- Events
            -- --------------------------------------------

            (
                'idx_events_tenant_published',
                'events',
                ARRAY['tenant_id', 'is_published'],
                'CREATE INDEX IF NOT EXISTS idx_events_tenant_published ON public.events(tenant_id, is_published)'
            ),
            (
                'idx_events_tenant_date',
                'events',
                ARRAY['tenant_id', 'event_date'],
                'CREATE INDEX IF NOT EXISTS idx_events_tenant_date ON public.events(tenant_id, event_date DESC)'
            ),
            (
                'idx_events_tenant_status_date',
                'events',
                ARRAY['tenant_id', 'is_published', 'event_date'],
                'CREATE INDEX IF NOT EXISTS idx_events_tenant_status_date ON public.events(tenant_id, is_published, event_date DESC)'
            ),

            -- --------------------------------------------
            -- Services
            -- No is_published column in staging.
            -- --------------------------------------------

            (
                'idx_services_tenant_date',
                'services',
                ARRAY['tenant_id', 'service_date'],
                'CREATE INDEX IF NOT EXISTS idx_services_tenant_date ON public.services(tenant_id, service_date DESC)'
            ),

            -- --------------------------------------------
            -- Activity log
            -- --------------------------------------------

            (
                'idx_activity_log_tenant_created',
                'activity_log',
                ARRAY['tenant_id', 'created_at'],
                'CREATE INDEX IF NOT EXISTS idx_activity_log_tenant_created ON public.activity_log(tenant_id, created_at DESC)'
            ),
            (
                'idx_activity_log_tenant_actor',
                'activity_log',
                ARRAY['tenant_id', 'actor_id', 'created_at'],
                'CREATE INDEX IF NOT EXISTS idx_activity_log_tenant_actor ON public.activity_log(tenant_id, actor_id, created_at DESC)'
            ),

            -- --------------------------------------------
            -- Giving records
            -- --------------------------------------------

            (
                'idx_giving_records_tenant_date',
                'giving_records',
                ARRAY['tenant_id', 'given_at'],
                'CREATE INDEX IF NOT EXISTS idx_giving_records_tenant_date ON public.giving_records(tenant_id, given_at DESC)'
            ),
            (
                'idx_giving_records_tenant_member',
                'giving_records',
                ARRAY['tenant_id', 'member_id', 'given_at'],
                'CREATE INDEX IF NOT EXISTS idx_giving_records_tenant_member ON public.giving_records(tenant_id, member_id, given_at DESC)'
            ),
            (
                'idx_giving_records_tenant_type',
                'giving_records',
                ARRAY['tenant_id', 'giving_type'],
                'CREATE INDEX IF NOT EXISTS idx_giving_records_tenant_type ON public.giving_records(tenant_id, giving_type)'
            ),

            -- --------------------------------------------
            -- Announcements
            -- --------------------------------------------

            (
                'idx_announcements_tenant_published',
                'announcements',
                ARRAY['tenant_id', 'is_published'],
                'CREATE INDEX IF NOT EXISTS idx_announcements_tenant_published ON public.announcements(tenant_id, is_published)'
            ),
            (
                'idx_announcements_tenant_created',
                'announcements',
                ARRAY['tenant_id', 'created_at'],
                'CREATE INDEX IF NOT EXISTS idx_announcements_tenant_created ON public.announcements(tenant_id, created_at DESC)'
            ),

            -- --------------------------------------------
            -- Group relationships
            -- --------------------------------------------

            (
                'idx_group_members_member_id',
                'group_members',
                ARRAY['member_id'],
                'CREATE INDEX IF NOT EXISTS idx_group_members_member_id ON public.group_members(member_id)'
            ),
            (
                'idx_group_members_group_id',
                'group_members',
                ARRAY['group_id'],
                'CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id)'
            ),
            (
                'idx_group_members_tenant_id',
                'group_members',
                ARRAY['tenant_id'],
                'CREATE INDEX IF NOT EXISTS idx_group_members_tenant_id ON public.group_members(tenant_id)'
            ),

            -- --------------------------------------------
            -- Event registrations
            -- --------------------------------------------

            (
                'idx_event_registrations_event_id',
                'event_registrations',
                ARRAY['event_id'],
                'CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON public.event_registrations(event_id)'
            ),
            (
                'idx_event_registrations_member_id',
                'event_registrations',
                ARRAY['member_id'],
                'CREATE INDEX IF NOT EXISTS idx_event_registrations_member_id ON public.event_registrations(member_id)'
            ),

            -- --------------------------------------------
            -- Family relationships
            -- --------------------------------------------

            (
                'idx_family_members_family_id',
                'family_members',
                ARRAY['family_id'],
                'CREATE INDEX IF NOT EXISTS idx_family_members_family_id ON public.family_members(family_id)'
            ),
            (
                'idx_family_members_member_id',
                'family_members',
                ARRAY['member_id'],
                'CREATE INDEX IF NOT EXISTS idx_family_members_member_id ON public.family_members(member_id)'
            ),
            (
                'idx_families_tenant_id',
                'families',
                ARRAY['tenant_id'],
                'CREATE INDEX IF NOT EXISTS idx_families_tenant_id ON public.families(tenant_id)'
            ),

            -- --------------------------------------------
            -- Attendance relationships
            -- --------------------------------------------

            (
                'idx_attendance_records_session_id',
                'attendance_records',
                ARRAY['session_id'],
                'CREATE INDEX IF NOT EXISTS idx_attendance_records_session_id ON public.attendance_records(session_id)'
            ),
            (
                'idx_attendance_records_member_id',
                'attendance_records',
                ARRAY['member_id'],
                'CREATE INDEX IF NOT EXISTS idx_attendance_records_member_id ON public.attendance_records(member_id)'
            ),
            (
                'idx_attendance_sessions_tenant_id',
                'attendance_sessions',
                ARRAY['tenant_id'],
                'CREATE INDEX IF NOT EXISTS idx_attendance_sessions_tenant_id ON public.attendance_sessions(tenant_id)'
            ),

            -- --------------------------------------------
            -- Volunteer relationships
            -- Guard both potential column names.
            -- --------------------------------------------

            (
                'idx_volunteer_assignments_volunteer_id',
                'volunteer_assignments',
                ARRAY['volunteer_id'],
                'CREATE INDEX IF NOT EXISTS idx_volunteer_assignments_volunteer_id ON public.volunteer_assignments(volunteer_id)'
            ),
            (
                'idx_volunteer_assignments_member_id',
                'volunteer_assignments',
                ARRAY['member_id'],
                'CREATE INDEX IF NOT EXISTS idx_volunteer_assignments_member_id ON public.volunteer_assignments(member_id)'
            ),
            (
                'idx_volunteer_assignments_event_id',
                'volunteer_assignments',
                ARRAY['event_id'],
                'CREATE INDEX IF NOT EXISTS idx_volunteer_assignments_event_id ON public.volunteer_assignments(event_id)'
            ),

            -- --------------------------------------------
            -- Member search
            -- --------------------------------------------

            (
                'idx_members_tenant_email',
                'members',
                ARRAY['tenant_id', 'email'],
                'CREATE INDEX IF NOT EXISTS idx_members_tenant_email ON public.members(tenant_id, email)'
            ),
            (
                'idx_members_tenant_phone',
                'members',
                ARRAY['tenant_id', 'phone'],
                'CREATE INDEX IF NOT EXISTS idx_members_tenant_phone ON public.members(tenant_id, phone)'
            ),
            (
                'idx_members_tenant_name',
                'members',
                ARRAY['tenant_id', 'first_name', 'last_name'],
                'CREATE INDEX IF NOT EXISTS idx_members_tenant_name ON public.members(tenant_id, first_name, last_name)'
            ),

            -- --------------------------------------------
            -- Full-text search
            -- --------------------------------------------

            (
                'idx_members_search_vector',
                'members',
                ARRAY['first_name', 'last_name', 'email'],
                $ddl$
                CREATE INDEX IF NOT EXISTS idx_members_search_vector
                ON public.members
                USING GIN (
                    to_tsvector(
                        'english'::regconfig,
                        COALESCE(first_name, '') || ' ' ||
                        COALESCE(last_name, '') || ' ' ||
                        COALESCE(email, '')
                    )
                )
                $ddl$
            ),
            (
                'idx_events_search_vector',
                'events',
                ARRAY['title', 'description'],
                $ddl$
                CREATE INDEX IF NOT EXISTS idx_events_search_vector
                ON public.events
                USING GIN (
                    to_tsvector(
                        'english'::regconfig,
                        COALESCE(title, '') || ' ' ||
                        COALESCE(description, '')
                    )
                )
                $ddl$
            ),
            (
                'idx_sermons_search_vector',
                'sermons',
                ARRAY['title', 'description'],
                $ddl$
                CREATE INDEX IF NOT EXISTS idx_sermons_search_vector
                ON public.sermons
                USING GIN (
                    to_tsvector(
                        'english'::regconfig,
                        COALESCE(title, '') || ' ' ||
                        COALESCE(description, '')
                    )
                )
                $ddl$
            ),

            -- --------------------------------------------
            -- Performance monitoring
            -- --------------------------------------------

            (
                'idx_users_last_seen',
                'users',
                ARRAY['last_seen_at'],
                $ddl$
                CREATE INDEX IF NOT EXISTS idx_users_last_seen
                ON public.users(last_seen_at DESC)
                WHERE last_seen_at IS NOT NULL
                $ddl$
            ),
            (
                'idx_members_portal_last_seen',
                'members',
                ARRAY['portal_last_seen'],
                $ddl$
                CREATE INDEX IF NOT EXISTS idx_members_portal_last_seen
                ON public.members(portal_last_seen DESC)
                WHERE portal_last_seen IS NOT NULL
                $ddl$
            ),
            (
                'idx_notifications_unread',
                'notifications',
                ARRAY['user_id', 'is_read', 'created_at'],
                $ddl$
                CREATE INDEX IF NOT EXISTS idx_notifications_unread
                ON public.notifications(user_id, is_read, created_at DESC)
                WHERE is_read = false
                $ddl$
            ),

            -- --------------------------------------------
            -- Partial indexes
            -- --------------------------------------------

            (
                'idx_members_active',
                'members',
                ARRAY['tenant_id', 'created_at', 'status'],
                $ddl$
                CREATE INDEX IF NOT EXISTS idx_members_active
                ON public.members(tenant_id, created_at DESC)
                WHERE status = 'active'
                $ddl$
            ),
            (
                'idx_events_published',
                'events',
                ARRAY['tenant_id', 'event_date', 'is_published'],
                $ddl$
                CREATE INDEX IF NOT EXISTS idx_events_published
                ON public.events(tenant_id, event_date DESC)
                WHERE is_published = true
                $ddl$
            )

        ) AS definitions(
            index_name,
            table_name,
            required_columns,
            index_sql
        )

    LOOP

        -- Skip missing tables rather than failing the replay.
        IF to_regclass(
            format('public.%I', idx.table_name)
        ) IS NULL THEN

            RAISE NOTICE
                'Skipping index %: table % does not exist',
                idx.index_name,
                idx.table_name;

            CONTINUE;
        END IF;

        -- Find missing columns required by this index.
        SELECT array_agg(col)
        INTO missing_columns
        FROM unnest(idx.required_columns) AS col
        WHERE NOT EXISTS (
            SELECT 1
            FROM information_schema.columns c
            WHERE c.table_schema = 'public'
              AND c.table_name = idx.table_name
              AND c.column_name = col
        );

        IF missing_columns IS NOT NULL THEN

            RAISE NOTICE
                'Skipping index %: missing columns %',
                idx.index_name,
                missing_columns;

            CONTINUE;
        END IF;

        -- Index name collisions should not silently pass
        -- when the index belongs to a different table.
        IF to_regclass(
            format('public.%I', idx.index_name)
        ) IS NOT NULL THEN

            IF NOT EXISTS (
                SELECT 1
                FROM pg_index pi
                JOIN pg_class ic ON ic.oid = pi.indexrelid
                JOIN pg_class tc ON tc.oid = pi.indrelid
                JOIN pg_namespace tn ON tn.oid = tc.relnamespace
                WHERE ic.relname = idx.index_name
                  AND tn.nspname = 'public'
                  AND tc.relname = idx.table_name
            ) THEN

                RAISE EXCEPTION
                    'Index name % exists but is not on expected table %',
                    idx.index_name,
                    idx.table_name;
            END IF;

            CONTINUE;
        END IF;

        -- Create the index.
        EXECUTE idx.index_sql;

        RAISE NOTICE
            'Created index % on %',
            idx.index_name,
            idx.table_name;

    END LOOP;

END;
$migration$;

-- ============================================================
-- PHASE 2: UNIQUE CONSTRAINTS
-- ============================================================
--
-- Unique indexes from the original migration are deferred.
--
-- Reasons:
-- - Existing data may contain duplicates.
-- - Application uniqueness rules must be confirmed.
-- - Uniqueness should not be guessed during schema replay.
-- - Later reconciliation migrations may define canonical
--   constraints with different names or predicates.
--
-- Candidate rules requiring separate verification:
--
-- families(tenant_id, name)
-- members(tenant_id, email)
-- groups(tenant_id, name)
-- events(tenant_id, title, event_date)
-- group_members(tenant_id, group_id, member_id)
-- family_members(family_id, member_id)
-- event_registrations(event_id, member_id)
--
-- No unique indexes are created in this migration.
-- ============================================================

-- ============================================================
-- PHASE 3: PERFORMANCE STATISTICS
-- ============================================================

DO $statistics$
DECLARE
    tbl TEXT;
BEGIN

    FOREACH tbl IN ARRAY ARRAY[
        'tenants',
        'users',
        'members',
        'groups',
        'events',
        'services',
        'giving_records',
        'activity_log',
        'notifications'
    ]
    LOOP

        IF to_regclass(format('public.%I', tbl)) IS NOT NULL THEN

            EXECUTE format(
                'ANALYZE public.%I',
                tbl
            );

        ELSE

            RAISE NOTICE
                'Skipping ANALYZE for missing table %',
                tbl;

        END IF;

    END LOOP;

END;
$statistics$;

-- ============================================================
-- PHASE 4: DOCUMENTATION
-- ============================================================

DO $comments$
BEGIN

    IF to_regclass(
        'public.idx_members_tenant_id'
    ) IS NOT NULL THEN

        COMMENT ON INDEX public.idx_members_tenant_id IS
            'Optimizes tenant-scoped member queries';

    END IF;

    IF to_regclass(
        'public.idx_activity_log_tenant_created'
    ) IS NOT NULL THEN

        COMMENT ON INDEX public.idx_activity_log_tenant_created IS
            'Optimizes tenant-scoped activity feeds ordered by date';

    END IF;

    IF to_regclass(
        'public.idx_events_tenant_published'
    ) IS NOT NULL THEN

        COMMENT ON INDEX public.idx_events_tenant_published IS
            'Optimizes tenant-scoped published event queries';

    END IF;

    IF to_regclass(
        'public.idx_members_search_vector'
    ) IS NOT NULL THEN

        COMMENT ON INDEX public.idx_members_search_vector IS
            'Full-text search index for member name and email';

    END IF;

END;
$comments$;

-- ============================================================
-- PHASE 5: VALIDATION
-- ============================================================

DO $validation$
DECLARE
    missing_indexes TEXT[];
BEGIN

    SELECT array_agg(required_index)
    INTO missing_indexes
    FROM unnest(
        ARRAY[
            'idx_members_tenant_id',
            'idx_activity_log_tenant_created'
        ]
    ) AS required_index
    WHERE to_regclass(
        format('public.%I', required_index)
    ) IS NULL;

    IF missing_indexes IS NOT NULL THEN

        RAISE EXCEPTION
            'Critical indexes missing: %',
            missing_indexes;

    END IF;

    RAISE NOTICE
        'Production optimization index migration completed';

    RAISE NOTICE
        'Unique business constraints remain deferred pending validation';

END;
$validation$;
