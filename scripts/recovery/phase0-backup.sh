#!/usr/bin/env bash
# Encrypted, read-only PostgreSQL logical snapshot of the known Vestry Hub staging DB.
# Requires pg_dump 17+, age, secure PGHOST/PGUSER/PGPASSWORD or .pgpass, AGE_RECIPIENT.
# Stores encrypted data off-repository. Does NOT include Storage object bytes.
set -euo pipefail
umask 077
STAGING='xwbajophstetbnnemsyq'
ROOT="$(git rev-parse --show-toplevel)"
BACKUP_ROOT="${BACKUP_ROOT:-}"
if [[ -z "$BACKUP_ROOT" || "$BACKUP_ROOT" != /* ]]; then
  echo 'ERROR: BACKUP_ROOT must be an absolute path outside the repository.' >&2; exit 2
fi
BACKUP_ROOT="$(realpath -m "$BACKUP_ROOT")"
case "$BACKUP_ROOT/" in "$ROOT/"*) echo 'ERROR: backups must not be placed inside the Git repo.' >&2; exit 2;; esac
if [[ -z "${PGHOST:-}" || -z "${PGUSER:-}" || -z "${PGDATABASE:-}" ]]; then
  echo 'ERROR: export PGHOST, PGUSER and PGDATABASE before running (credentials never go into Git).' >&2; exit 2
fi
if [[ "$PGDATABASE" != 'postgres' ]] || { [[ "$PGHOST" != *"$STAGING"* ]] && [[ "$PGUSER" != *"$STAGING"* ]]; }; then
  echo 'ERROR: connection identity does not clearly identify the approved staging project.' >&2; exit 3
fi
if [[ -z "${AGE_RECIPIENT:-}" ]]; then echo 'ERROR: AGE_RECIPIENT public key is required for encryption.' >&2; exit 2; fi
command -v pg_dump >/dev/null || { echo 'ERROR: pg_dump not installed.' >&2; exit 2; }
command -v age >/dev/null || { echo 'ERROR: age not installed.' >&2; exit 2; }
PG_VERSION="$(pg_dump --version | sed -n 's/.* \([0-9][0-9]*\)\..*/\1/p')"
if [[ -z "$PG_VERSION" || "$PG_VERSION" -lt 17 ]]; then echo 'ERROR: pg_dump client 17+ required for staging PostgreSQL 17.' >&2; exit 2; fi
mkdir -p "$BACKUP_ROOT"
chmod 700 "$BACKUP_ROOT"
DEST="$BACKUP_ROOT/vestry-staging-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -m 700 "$DEST"
OUT="$DEST/database.pgcustom.age"
PARTIAL="$OUT.partial"
trap 'rm -f "$PARTIAL"' EXIT
printf 'Creating encrypted read-only staging snapshot in: %s\n' "$DEST"
# Do not pass database credentials via command line; PostgreSQL reads PG* env/.pgpass.
pg_dump -w --format=custom --no-owner --no-acl --file=- | age -r "$AGE_RECIPIENT" -o "$PARTIAL"
mv "$PARTIAL" "$OUT"
chmod 600 "$OUT"
sha256sum "$OUT" > "$DEST/SHA256SUMS"
cat > "$DEST/README.txt" <<'README'
Encrypted PostgreSQL logical database snapshot for Vestry Hub staging.
This is NOT proof of a successful restore: rehearse restoration only on an isolated target.
The backup includes PostgreSQL data/metadata accessible to the configured account,
but does not back up Supabase Storage object bytes and may not preserve all managed
platform configuration, external provider secrets or role passwords.
Keep the age private identity in a separate protected location; do not commit this folder.
README
chmod 600 "$DEST/README.txt" "$DEST/SHA256SUMS"
printf 'Backup created and checksummed. Verify checksum and perform an isolated restore rehearsal.\n'
