#!/usr/bin/env bash
# Applique les migrations sur une base vierge puis exécute les tests SQL.
# Usage : DATABASE_URL=postgres://user@host:port/postgres scripts/test-db.sh
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL doit pointer vers un serveur Postgres de test (jamais la production)}"
DB_NAME="pms_test_$$"
ADMIN_URL="$DATABASE_URL"
TEST_URL="${DATABASE_URL%/*}/$DB_NAME"

psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -q -c "create database $DB_NAME"
trap 'psql "$ADMIN_URL" -q -c "drop database if exists $DB_NAME" >/dev/null' EXIT

run() { echo "→ $1"; psql "$TEST_URL" -v ON_ERROR_STOP=1 -q -f "$1" >/dev/null; }

run supabase/tests/00_stub_supabase.sql
for f in supabase/migrations/*.sql; do run "$f"; done
for f in supabase/tests/[1-9]*.test.sql; do run "$f"; done

echo "Tests de base de données : OK"
