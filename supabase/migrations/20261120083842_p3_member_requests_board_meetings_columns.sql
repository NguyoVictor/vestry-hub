-- Recovery Phase 3 — manual testing report Findings 5 and 6.
-- Verified read-only against staging (xwbajophstetbnnemsyq) on 2026-11-20:
--
-- Finding 5: MemberRequests.updateStatus writes member_requests.resolved_by,
--   which does not exist (every status change -> PostgREST 400). The live
--   trigger private.protect_member_request_fields ALSO references
--   NEW/OLD.resolved_by, so member self-service edits fail with 42703.
--   Adding the column fixes both and records who resolved a request.
--
-- Finding 6: BoardMeetings saves end_time, type, location_type, online_link,
--   pre_meeting_notes and status; board_meetings has none of them (every save
--   -> 400). The product needs them (status pipeline, online/hybrid meetings).
--   Allowed values mirror src/pages/operations/BoardMeetings.tsx constants.
--   Staging had 0 board_meetings rows; defaults keep any existing rows valid.
--
-- Additive and idempotent: ADD COLUMN IF NOT EXISTS + guarded constraints.
-- No data is modified. Rollback: drop the added columns/constraints.

ALTER TABLE public.member_requests
  ADD COLUMN IF NOT EXISTS resolved_by varchar;

DO $fk$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conrelid = 'public.member_requests'::regclass
                    AND conname = 'member_requests_resolved_by_fkey') THEN
    ALTER TABLE public.member_requests
      ADD CONSTRAINT member_requests_resolved_by_fkey
      FOREIGN KEY (resolved_by) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END
$fk$;

ALTER TABLE public.board_meetings
  ADD COLUMN IF NOT EXISTS end_time time,
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'board_meeting',
  ADD COLUMN IF NOT EXISTS location_type text NOT NULL DEFAULT 'on_site',
  ADD COLUMN IF NOT EXISTS online_link text,
  ADD COLUMN IF NOT EXISTS pre_meeting_notes text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'scheduled';

DO $chk$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.board_meetings'::regclass
                  AND conname = 'board_meetings_type_check') THEN
    ALTER TABLE public.board_meetings ADD CONSTRAINT board_meetings_type_check
      CHECK (type IN ('board_meeting', 'elders_meeting', 'staff_meeting', 'finance_committee',
                      'general_assembly', 'special_meeting', 'other'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.board_meetings'::regclass
                  AND conname = 'board_meetings_location_type_check') THEN
    ALTER TABLE public.board_meetings ADD CONSTRAINT board_meetings_location_type_check
      CHECK (location_type IN ('on_site', 'online', 'hybrid'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.board_meetings'::regclass
                  AND conname = 'board_meetings_status_check') THEN
    ALTER TABLE public.board_meetings ADD CONSTRAINT board_meetings_status_check
      CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled'));
  END IF;
END
$chk$;
