
-- ============================================================
-- Uniqueness Constraints
-- Migration: 20260516104411
-- ============================================================
-- Create only valid constraints without duplicating equivalent
-- unique indexes or failing on existing duplicate data.
-- All skipped constraints are logged for later review.

DO $migration$
DECLARE
    rule RECORD;
    duplicate_exists BOOLEAN;
    equivalent_index_exists BOOLEAN;
    missing_columns TEXT[];
BEGIN
    FOR rule IN
        SELECT *
        FROM (
            VALUES
                (
                    'groups',
                    'unique_group_name_per_tenant',
                    ARRAY['tenant_id', 'name']::TEXT[]
                ),
                (
                    'events',
                    'unique_event_title_date_per_tenant',
                    ARRAY['tenant_id', 'title', 'event_date']::TEXT[]
                ),
                (
                    'group_members',
                    'unique_group_member',
                    ARRAY['group_id', 'member_id']::TEXT[]
                ),
                (
                    'family_members',
                    'unique_family_member',
                    ARRAY['family_id', 'member_id']::TEXT[]
                ),
                (
                    'event_registrations',
                    'unique_event_rsvp',
                    ARRAY['event_id', 'member_id']::TEXT[]
                ),
                (
                    'families',
                    'unique_family_name_per_tenant',
                    ARRAY['tenant_id', 'name']::TEXT[]
                ),
                (
                    'members',
                    'unique_member_email_per_tenant',
                    ARRAY['tenant_id', 'email']::TEXT[]
                )
        ) AS definitions(table_name, constraint_name, columns_to_check)
    LOOP
        -- Confirm table exists.
        IF to_regclass(format('public.%I', rule.table_name)) IS NULL THEN
            RAISE NOTICE 'SKIPPED %: table % does not exist',
                rule.constraint_name, rule.table_name;
            CONTINUE;
        END IF;

        -- Confirm every required column exists.
        -- Verify every required column exists.
        SELECT array_agg(required.col)
        INTO missing_columns
        FROM unnest(rule.columns_to_check) AS required(col)
        WHERE NOT EXISTS (
            SELECT 1
            FROM information_schema.columns AS c
            WHERE c.table_schema = 'public'
            AND c.table_name = rule.table_name
            AND c.column_name = required.col
        );
        IF missing_columns IS NOT NULL THEN
            RAISE NOTICE 'SKIPPED %: missing columns %',
                rule.constraint_name, missing_columns;
            CONTINUE;
        END IF;

        -- Skip an existing named constraint.
        IF EXISTS (
            SELECT 1
            FROM pg_constraint c
            WHERE c.conrelid =
                to_regclass(format('public.%I', rule.table_name))
              AND c.conname = rule.constraint_name
        ) THEN
            RAISE NOTICE 'EXISTS: constraint %', rule.constraint_name;
            CONTINUE;
        END IF;

        -- Check for an equivalent valid, unconditional, unique index.
        SELECT EXISTS (
            SELECT 1
            FROM pg_index i
            JOIN pg_class t ON t.oid = i.indrelid
            JOIN pg_namespace n ON n.oid = t.relnamespace
            WHERE n.nspname = 'public'
              AND t.relname = rule.table_name
              AND i.indisunique
              AND i.indisvalid
              AND i.indpred IS NULL
              AND i.indexprs IS NULL
              AND i.indnkeyatts = cardinality(rule.columns_to_check)
              AND (
                  SELECT array_agg(a.attname::TEXT ORDER BY k.ordinality)
                  FROM unnest(i.indkey::INT2[]) WITH ORDINALITY
                      AS k(attnum, ordinality)
                  JOIN pg_attribute a
                    ON a.attrelid = t.oid
                   AND a.attnum = k.attnum
                  WHERE k.ordinality <= i.indnkeyatts
              ) = rule.columns_to_check
        )
        INTO equivalent_index_exists;

        IF equivalent_index_exists THEN
            RAISE NOTICE 'SKIPPED %: equivalent unique index exists',
                rule.constraint_name;
            CONTINUE;
        END IF;

        -- Check duplicate non-null key combinations.
        EXECUTE format(
            'SELECT EXISTS (
                SELECT 1
                FROM public.%I
                WHERE %s
                GROUP BY %s
                HAVING COUNT(*) > 1
            )',
            rule.table_name,
            (
                SELECT string_agg(format('%I IS NOT NULL', col), ' AND ')
                FROM unnest(rule.columns_to_check) AS col
            ),
            (
                SELECT string_agg(format('%I', col), ', ')
                FROM unnest(rule.columns_to_check) AS col
            )
        )
        INTO duplicate_exists;

        IF duplicate_exists THEN
            RAISE WARNING
                'SKIPPED %: duplicate values must be resolved',
                rule.constraint_name;
            CONTINUE;
        END IF;

        -- Add the uniqueness constraint.
        EXECUTE format(
            'ALTER TABLE public.%I ADD CONSTRAINT %I UNIQUE (%s)',
            rule.table_name,
            rule.constraint_name,
            (
                SELECT string_agg(format('%I', col), ', ')
                FROM unnest(rule.columns_to_check) AS col
            )
        );

        RAISE NOTICE 'CREATED constraint %', rule.constraint_name;
    END LOOP;
END;
$migration$;
