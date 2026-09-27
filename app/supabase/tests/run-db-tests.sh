#!/usr/bin/env bash
# Runs all migrations + scenario tests on a throwaway PostgreSQL 16 container.
# Usage: ./supabase/tests/run-db-tests.sh     (from the app/ folder)
set -euo pipefail

DIR="$(cd "$(dirname "$0")/.." && pwd)"
NAME="dreamland-db-test-$$"

cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT

docker run -d --rm --name "$NAME" -e POSTGRES_PASSWORD=test -e TZ=Asia/Karachi postgres:16 >/dev/null
until docker exec "$NAME" pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done
sleep 1

run() { docker exec -i "$NAME" psql -U postgres -v ON_ERROR_STOP=1 -q "$@"; }

echo "→ Supabase stub"
run < "$DIR/tests/00_supabase_stub.sql"
for f in "$DIR"/migrations/*.sql; do
  echo "→ $(basename "$f")"
  run < "$f"
done
echo "→ Scenario tests"
run -t -A < "$DIR/tests/10_business_scenarios.sql" 2>&1 | grep -v "^$" | sed "s/^psql:<stdin>:[0-9]*: //; s/^NOTICE:  /  /"
