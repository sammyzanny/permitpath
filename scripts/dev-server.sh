#!/usr/bin/env bash
# Start the production build locally in dev-auth mode (used by e2e tests).
cd "$(dirname "$0")/.."
export ALLOW_DEV_AUTH=1 ADMIN_EMAILS=admin@permitpath.app CRON_SECRET=devsecret NEXT_PUBLIC_APP_URL=http://localhost:3210
exec npx next start -p 3210
