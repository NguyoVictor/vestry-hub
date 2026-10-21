
-- ============================================================
-- Staff Directory Display Names
-- Migration: 20260615120000
-- ============================================================
--
-- Backfill staff-directory conversation names.
--
-- Some environments do not yet have staff_user_id or
-- is_staff_directory on public.conversations.
--
-- Skip the backfill until the required schema exists.
-- Later messaging migrations must reconcile the data.
-- ============================================================

DO $migration$
BEGIN
    -- Verify required tables exist.
    IF to_regclass('public.conversations') IS NULL
       OR to_regclass('public.users') IS NULL THEN

        RAISE NOTICE
            'Skipping staff directory backfill: required table is missing';

        RETURN;
    END IF;

    -- Verify required conversation columns.
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'conversations'
          AND column_name = 'staff_user_id'
    )
    OR NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'conversations'
          AND column_name = 'is_staff_directory'
    )
    OR NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'conversations'
          AND column_name = 'name'
    ) THEN

        RAISE NOTICE
            'Skipping staff directory backfill: conversation columns are missing';

        RETURN;
    END IF;

    -- Verify required user columns.
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'users'
          AND column_name = 'first_name'
    )
    OR NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'users'
          AND column_name = 'last_name'
    ) THEN

        RAISE NOTICE
            'Skipping staff directory backfill: user name columns are missing';

        RETURN;
    END IF;

    -- Execute dynamically so missing columns do not
    -- cause compilation errors before validation.
    EXECUTE $update$
        UPDATE public.conversations AS c
        SET name = COALESCE(
            NULLIF(TRIM(u.first_name), ''),
            NULLIF(
                TRIM(
                    CONCAT(
                        u.first_name,
                        ' ',
                        u.last_name
                    )
                ),
                ''
            )
        )
        FROM public.users AS u
        WHERE c.staff_user_id::TEXT = u.id::TEXT
          AND c.is_staff_directory = TRUE
          AND (
              c.name IS NULL
              OR TRIM(c.name) = ''
          )
    $update$;

    RAISE NOTICE
        'Staff directory display-name backfill completed';

END;
$migration$;
