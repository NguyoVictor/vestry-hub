
#!/usr/bin/env bash
set -euo pipefail

# Vestry Hub: non-destructive E2E test runner.
# Does not run cross-tenant UPDATE/DELETE tests.

export PW_BASE_URL="http://127.0.0.1:4173"

export PW_MEMBER_A_STORAGE_STATE="playwright/.auth/qa-member.json"

export PW_FULL_ADMIN_STORAGE_STATE="playwright/.auth/qa-admin.json"

if [ ! -f "$PW_FULL_ADMIN_STORAGE_STATE" ]; then
  echo "ERROR: Administrator authentication state is missing."
  exit 1
fi

mkdir -p reports/e2e-automation

echo "======================================"
echo " VESTRY HUB AUTOMATED TEST RUN"
echo "======================================"

# Verify the expected local application is running.
if ! curl --fail --silent --output /dev/null "$PW_BASE_URL"; then
  echo "ERROR: Preview server is unavailable."
  echo "Start it with:"
  echo "npm run preview -- --host 127.0.0.1 --port 4173 --strictPort"
  exit 1
fi

# Protect against accidental destructive testing.
if [ "${PW_PLATFORM_TEST_ENV:-}" = "disposable" ]; then
  echo "ERROR: This runner must not use disposable mutation settings."
  exit 1
fi

run_group() {
  local name="$1"
  shift

  echo ""
  echo "Running: $name"

  if npx playwright test "$@" \
    --project=chromium \
    --workers=1 \
    --reporter=line \
    --output="reports/e2e-automation/$name"
  then
    echo "$name: PASSED" | tee -a reports/e2e-automation/summary.txt
  else
    echo "$name: FAILED" | tee -a reports/e2e-automation/summary.txt
  fi
}

: > reports/e2e-automation/summary.txt

# Previously verified functional tests.
run_group "member-registration" \
  e2e/platform/people/member-registration.spec.ts

run_group "member-routes" \
  e2e/platform/routes.spec.ts \
  --grep "member route"

# Administrator route tests
run_group "admin-routes" \
  e2e/platform/routes.spec.ts \
  --grep "admin route"

# Public route smoke tests (25 tests)
run_group "public-routes" \
  e2e/platform/routes.spec.ts \
  --grep "public route"

echo ""
echo "======================================"
echo " TEST SUMMARY"
echo "======================================"

cat reports/e2e-automation/summary.txt

if grep -q "FAILED" reports/e2e-automation/summary.txt; then
  exit 1
fi
