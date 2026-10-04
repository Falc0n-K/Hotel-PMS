# Tests de charge et de concurrence

Script : `scripts/load-test.sh` (`npm run test:load`). Il crée une base jetable,
applique les migrations, charge un hôtel volumineux puis lance `pgbench`.

```bash
DATABASE_URL=postgres://postgres@localhost:5432/postgres DURATION=20 npm run test:load
```

## Jeu de données

`supabase/tests/load/seed.sql` : un établissement de **500 chambres** (10 types) et
**10 000 réservations** réparties sur deux ans (passées, en cours, à venir), 10 000
fiches clients. C'est environ dix fois un grand hôtel sénégalais.

## Concurrence (le point critique)

| Scénario | Résultat attendu | Obtenu |
|---|---|---|
| 50 réservations en ligne simultanées pour les 3 dernières chambres d'un type | 3 acceptées, 47 refusées | 3 / 47 |
| 50 réceptionnistes réservent la même chambre aux mêmes dates | 1 acceptée, 49 refusées | 1 / 49 |
| 20 clients réservent en continu pendant 20 s à des dates aléatoires | aucun chevauchement | 0 chevauchement |

La garantie repose sur la contrainte d'exclusion PostgreSQL (`reservations_no_overlap`) :
aucune course entre deux requêtes ne peut produire de surbooking, quel que soit le canal
(réception, site, API, iCal).

## Débit

Mesures sur un Postgres 16 local (4 cœurs), 20 clients simultanés, 20 s par
scénario. Le plan Supabase de production (Micro/Small) est plus lent ; garder une marge
d'un facteur 3 à 5.

| Scénario | Débit | Latence moyenne |
|---|---|---|
| Recherche de disponibilités (site, API) | ≈ 350 req/s | 57 ms |
| Chargement du planning réception (RLS active) | ≈ 300 req/s | 65 ms |
| Réservations en ligne | ≈ 250 req/s | 79 ms |

À titre de comparaison, un hôtel de 100 chambres génère quelques requêtes par seconde
en pointe.

## Requêtes clés (EXPLAIN ANALYZE, 10 000 réservations)

| Requête | Temps |
|---|---|
| Disponibilités sur 3 nuits (`availability_for`) | 14–16 ms |
| Planning 90 jours + à venir | 1,5–2 ms |
| Arrivées du jour | < 0,1 ms |
| Recherche client par nom | 5–6 ms |
| Séjours d'une chambre (export iCal) | 2–3 ms |
| Audit de nuit | 6–7 ms |

## Anomalie trouvée

Collision des références de réservation sous charge (voir `docs/securite.md`, point 3),
corrigée par la migration `20261004140000_revue_securite_codes.sql`.

## Limites

- Les Edge Functions (Deno) et le réseau ne sont pas mesurés ici, seulement la base.
  Pour un test de bout en bout, utiliser k6 contre un projet de préproduction, jamais la
  production (les réservations créées déclenchent e-mails et webhooks).
- `availability_for` parcourt les types de chambre un à un : au-delà de 50 types par
  établissement, la réécrire en une seule requête ensembliste.
