#!/usr/bin/env bash
# LOCAL STACK ONLY — a minimal Supabase (Postgres + GoTrue + PostgREST) for
# development and integration tests. Production uses supabase.com.
#   ./supabase/local/stack.sh up     start + apply migrations, writes .env.local
#   ./supabase/local/stack.sh down   stop and delete everything
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
APP="$(cd "$DIR/../.." && pwd)"
NET=dreamland-local
SECRET=local-dev-jwt-secret-at-least-32-characters-long

down() {
  docker rm -f dl-db dl-auth dl-rest >/dev/null 2>&1 || true
  docker network rm $NET >/dev/null 2>&1 || true
  [ -f "$DIR/.proxy.pid" ] && kill "$(cat "$DIR/.proxy.pid")" 2>/dev/null || true
  rm -f "$DIR/.proxy.pid"
}

up() {
  down
  docker network create $NET >/dev/null
  docker run -d --name dl-db --network $NET -p 55432:5432 -e POSTGRES_PASSWORD=postgres -e TZ=Asia/Karachi postgres:16 >/dev/null
  until docker exec dl-db pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done; sleep 2
  docker exec -i dl-db psql -q -U postgres -v ON_ERROR_STOP=1 < "$DIR/init-roles.sql"

  docker run -d --name dl-auth --network $NET -p 59999:9999 \
    -e GOTRUE_API_HOST=0.0.0.0 -e PORT=9999 -e API_EXTERNAL_URL=http://localhost:54321/auth/v1 \
    -e GOTRUE_DB_DRIVER=postgres -e "GOTRUE_DB_DATABASE_URL=postgres://supabase_auth_admin:local-dev@dl-db:5432/postgres?sslmode=disable" \
    -e GOTRUE_SITE_URL=http://localhost:5173 -e GOTRUE_URI_ALLOW_LIST="http://localhost:5173/**" \
    -e GOTRUE_JWT_SECRET=$SECRET -e GOTRUE_JWT_EXP=3600 -e GOTRUE_JWT_AUD=authenticated \
    -e GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated -e GOTRUE_JWT_ADMIN_ROLES=service_role \
    -e GOTRUE_DISABLE_SIGNUP=true -e GOTRUE_EXTERNAL_EMAIL_ENABLED=true -e GOTRUE_MAILER_AUTOCONFIRM=true \
    supabase/gotrue:v2.164.0 >/dev/null
  echo -n "waiting for auth"
  until curl -sf http://localhost:59999/health >/dev/null; do echo -n .; sleep 1; done; echo

  for f in "$APP"/supabase/migrations/*.sql; do
    docker exec -i dl-db psql -q -U postgres -v ON_ERROR_STOP=1 < "$f" >/dev/null
  done
  echo "migrations applied"

  docker run -d --name dl-rest --network $NET -p 53000:3000 \
    -e "PGRST_DB_URI=postgres://authenticator:local-dev@dl-db:5432/postgres" \
    -e PGRST_DB_SCHEMAS=public -e PGRST_DB_ANON_ROLE=anon -e PGRST_JWT_SECRET=$SECRET \
    postgrest/postgrest:v12.2.3 >/dev/null
  until curl -s http://localhost:53000/ >/dev/null; do sleep 1; done

  nohup node "$DIR/proxy.mjs" > "$DIR/.proxy.log" 2>&1 &
  echo $! > "$DIR/.proxy.pid"
  sleep 1

  eval "$(node "$DIR/jwt.mjs" $SECRET)"
  cat > "$APP/.env.local" <<ENV
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=$ANON_KEY
# local stack only (used by integration tests to create users)
LOCAL_SERVICE_KEY=$SERVICE_KEY
ENV
  echo "local stack ready → http://localhost:54321  (.env.local written)"
}

case "${1:-up}" in up) up ;; down) down ;; *) echo "usage: $0 up|down"; exit 1 ;; esac
