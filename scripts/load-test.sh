#!/usr/bin/env bash
# Tests de charge et de concurrence sur une base jetable (jamais la production).
# Usage : DATABASE_URL=postgres://postgres@localhost:5432/postgres scripts/load-test.sh
# Durée par scénario : DURATION (secondes, 20 par défaut). Requiert pgbench.
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL doit pointer vers un serveur Postgres de test}"
DURATION="${DURATION:-20}"
DB_NAME="pms_load_$$"
TEST_URL="${DATABASE_URL%/*}/$DB_NAME"
DIR=supabase/tests/load

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -c "create database $DB_NAME"
[ -n "${KEEP:-}" ] || trap 'psql "$DATABASE_URL" -q -c "drop database if exists $DB_NAME" >/dev/null' EXIT

q() { psql "$TEST_URL" -v ON_ERROR_STOP=1 -qAt -c "$1"; }
bench() { # nom, script, clients, options
  local out
  out=$(pgbench "$TEST_URL" -n -f "$DIR/$2" -c "$3" -j 4 $4 2>&1)
  printf '%-34s %s tps, latence moyenne %s ms\n' "$1" \
    "$(grep -oP 'tps = \K[0-9.]+' <<<"$out" | head -1)" "$(grep -oP 'latency average = \K[0-9.]+' <<<"$out")"
}

echo "→ Schéma et données"
psql "$TEST_URL" -v ON_ERROR_STOP=1 -q -f supabase/tests/00_stub_supabase.sql >/dev/null
for f in supabase/migrations/*.sql; do psql "$TEST_URL" -v ON_ERROR_STOP=1 -q -f "$f" >/dev/null; done
echo "  chambres|réservations : $(psql "$TEST_URL" -v ON_ERROR_STOP=1 -qAt -f "$DIR/seed.sql" | tail -1)"

echo
echo "── Concurrence ──────────────────────────────────────────────"
pgbench "$TEST_URL" -n -f "$DIR/race_type.pgbench" -c 50 -j 10 -t 1 >/dev/null 2>&1
won=$(q "select count(*) from public.reservations r join public.rooms m on m.id = r.room_id where m.number like 'C%' and r.status = 'option'")
lost=$(q "select count(*) from load.errors where test = 'race_type'")
echo "50 clients pour 3 chambres « Course » : $won réservations, $lost refus"
[ "$won" -eq 3 ] || { echo "ÉCHEC : surbooking ou chambres laissées libres"; exit 1; }

pgbench "$TEST_URL" -n -f "$DIR/race_room.pgbench" -c 50 -j 10 -t 1 >/dev/null 2>&1
won=$(q "select count(*) from public.reservations r join public.rooms m on m.id = r.room_id where m.number = 'C1' and r.check_in = current_date + 320")
echo "50 réceptions pour la même chambre      : $won réservation, $(q "select count(*) from load.errors where test = 'race_room'") refus"
[ "$won" -eq 1 ] || { echo "ÉCHEC : double réservation de la chambre C1"; exit 1; }

echo
echo "── Débit (${DURATION} s par scénario) ────────────────────────────"
bench "Disponibilités (20 clients)" availability.pgbench 20 "-T $DURATION"
bench "Planning réception (20 clients)" rack.pgbench 20 "-T $DURATION"
bench "Réservations en ligne (20 clients)" booking.pgbench 20 "-T $DURATION"
q "select '  dont refusées : ' || count(*) || coalesce(' (' || string_agg(distinct left(message, 60), ' | ') || ')', '') from load.errors where test = 'booking'"
overlaps=$(q "select count(*) from public.reservations a join public.reservations b on a.room_id = b.room_id and a.id < b.id and a.stay && b.stay where a.status in ('option','confirmed','checked_in') and b.status in ('option','confirmed','checked_in')")
echo "Chevauchements de séjours actifs : $overlaps"
[ "$overlaps" -eq 0 ] || { echo "ÉCHEC : surbooking"; exit 1; }

echo
echo "── Plans d'exécution ────────────────────────────────────────"
ex() { printf '%-34s %s\n' "$1" "$(q "explain (analyze, format json) $2" | grep -oP '"Execution Time": \K[0-9.]+') ms"; }
ex "availability_for (3 nuits)" "select * from public.availability_for((select property_id from load.ctx), current_date + 30, current_date + 33, 2::smallint, 0::smallint)"
ex "Planning (90 j + à venir)" "select id from public.reservations where property_id = (select property_id from load.ctx) and check_out >= current_date - 90 order by check_in desc limit 2000"
ex "Arrivées du jour" "select id from public.reservations where property_id = (select property_id from load.ctx) and check_in = current_date and status in ('confirmed','option')"
ex "Recherche client (nom)" "select id from public.guests where property_id = (select property_id from load.ctx) and full_name ilike '%client 98%'"
ex "Export iCal d'une chambre" "select * from public.reservations where room_id = (select id from public.rooms where number = '101') and check_out >= current_date"
ex "Audit de nuit" "select public.night_audit_core((select property_id from load.ctx), current_date - 1, null)"
echo
echo "Tests de charge : OK"
