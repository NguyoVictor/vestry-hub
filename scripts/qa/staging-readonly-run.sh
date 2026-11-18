#!/usr/bin/env bash
# Run from Vestry Hub repository root after reviewing the Vercel Preview target.
set -euo pipefail
node --test scripts/qa/staging-readonly-guard.node.test.mjs scripts/qa/staging-preview-auth.node.test.mjs
if [[ "${PW_VERCEL_PREVIEW_AUTH:-}" == "oidc" && -z "${VERCEL_OIDC_TOKEN:-}" ]]; then
  echo 'ERROR: Vercel Preview OIDC token missing. Authenticate and run: vc env run -- bash scripts/qa/staging-readonly-run.sh' >&2
  exit 2
fi
npm run test:e2e:staging:readonly
