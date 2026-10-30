#!/usr/bin/env bash
set -euo pipefail

# Run ONLY the four explicitly selected smoke suites and READ-ONLY RLS probes.
# Do not use this for disposable mutation suites or production.
cd "$(dirname "$0")/.."
export PW_BASE_URL="http://127.0.0.1:4173"
export PW_MEMBER_A_STORAGE_STATE="playwright/.auth/qa-member.json"
export PW_FULL_ADMIN_STORAGE_STATE="playwright/.auth/qa-admin.json"
export PW_STAGING_ADMIN_STORAGE_STATE="playwright/.auth/staging-admin.json"
REPORT_DIR="$PWD/reports/e2e-automation"
mkdir -p "$REPORT_DIR"
SUMMARY="$REPORT_DIR/release-safe-summary.txt"
: > "$SUMMARY"

if [[ "${PW_PLATFORM_TEST_ENV:-}" == 'disposable' ]]; then
  echo 'Refusing to run while disposable mutation setting is enabled' >&2
  exit 1
fi
for f in "$PW_MEMBER_A_STORAGE_STATE" "$PW_FULL_ADMIN_STORAGE_STATE" "$PW_STAGING_ADMIN_STORAGE_STATE"; do
  [[ -f "$f" ]] || { echo "Missing required auth state: $f" >&2; exit 1; }
done
curl --fail --silent --output /dev/null "$PW_BASE_URL" || {
  echo 'Preview unavailable. Run npm run preview -- --host 127.0.0.1 --port 4173 --strictPort' >&2
  exit 1
}

echo '=== Backend authorization checks (read-only) ==='
if RLS_RESULT_FILE="$REPORT_DIR/tenant-rls.json" node scripts/verify-tenant-rls.mjs; then
  echo 'RLS critical member boundary: PASS' | tee -a "$SUMMARY"
else
  echo 'RLS critical member boundary: FAIL' | tee -a "$SUMMARY"
fi

run_group() {
  local name="$1" expected="$2"; shift 2
  local json="$REPORT_DIR/$name.json" exit_code=0
  rm -f "$json"
  echo "=== $name ($expected expected tests) ==="
  PLAYWRIGHT_JSON_OUTPUT_NAME="$json" npx playwright test "$@" \
    --project=chromium --workers=1 --reporter=line,json \
    --output="$REPORT_DIR/artifacts-$name" || exit_code=$?
  # The JSON reporter contains stats.expected (passed), unexpected, flaky, skipped.
  if [[ "$exit_code" == 0 ]] && node - "$json" "$expected" <<'NODE'
const fs = require('node:fs');
const [file, count] = process.argv.slice(2);
try {
  const s = JSON.parse(fs.readFileSync(file, 'utf8')).stats || {};
  console.log('Verified counts:', { passed: s.expected || 0, failed: s.unexpected || 0, flaky: s.flaky || 0, skipped: s.skipped || 0 });
  if (s.expected !== Number(count) || (s.unexpected || 0) !== 0 || (s.flaky || 0) !== 0 || (s.skipped || 0) !== 0) process.exit(1);
} catch (e) { console.error('Could not validate reporter:', e.message); process.exit(1); }
NODE
  then
    echo "$name: PASS ($expected)" | tee -a "$SUMMARY"
  else
    echo "$name: FAIL (including skipped or missing tests)" | tee -a "$SUMMARY"
  fi
}
run_group member-registration 2 e2e/platform/people/member-registration.spec.ts
run_group member-routes 35 e2e/platform/routes.spec.ts --grep 'member route'
run_group admin-routes 100 e2e/platform/routes.spec.ts --grep 'admin route'
run_group public-routes 25 e2e/platform/routes.spec.ts --grep 'public route'
echo '=== FINAL SUMMARY ==='
cat "$SUMMARY"
if grep -q 'FAIL' "$SUMMARY"; then exit 1; fi
