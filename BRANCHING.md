# Modèle de branches — Senegal Hotels PMS

Même politique que Sénémap.

## Architecture des branches

```
main                    ← Production stable (Vercel production)
  │
  develop               ← Intégration (Vercel preview « develop »)
    │
    ├─ feature/*        ← Nouvelles fonctionnalités
    ├─ fix/*            ← Corrections non urgentes
    ├─ chore/*, ci/*    ← Outillage, dépendances, CI
    │
    release/*           ← Stabilisation avant production
    hotfix/*            ← Corrections urgentes de production
```

## Workflow obligatoire

```
feature/* ──► develop ──► release/* ──► main
                                         │
hotfix/*  ──────────────────────────────►─┤
          ──► develop                     │
```

### Règles

1. **Jamais de push direct sur `main` ou `develop`.**
2. Toute modification passe par une branche dédiée et une pull request.
3. Merge dans `develop` uniquement via PR (ou `merge --no-ff`).
4. Merge dans `main` uniquement depuis `release/*` ou `hotfix/*`.
5. La CI (typage, build, tests de base de données, audit, secrets) doit être verte avant merge.
6. Une migration SQL n'est appliquée en production qu'après merge dans `main`
   (voir « Migrations » plus bas).

## Branches de fonctionnalités prévues (feuille de route de l'audit)

| Branche | Périmètre |
|---|---|
| `feature/room-rack` | Calendrier de réservation (chambres × dates) |
| `feature/folio-facturation` | Folio, avoirs, export facture PDF |
| `feature/caisse` | Clôture de caisse, rapprochement Wave / Orange Money |
| `feature/housekeeping` | Assignation des tâches, inspection, vue mobile |
| `feature/maintenance` | Ordres de travail, chambres hors service datées |
| `feature/night-audit` | Audit de nuit, no-show automatique |
| `feature/tarifs` | Plans tarifaires, saisons, restrictions |
| `feature/crm` | Fiches clients reliées à la base, fiche de police |
| `feature/paiements-en-ligne` | PayDunya, Stripe |
| `feature/channel-manager` | Cloudbeds / OTA |

### Fichiers partagés (ne pas modifier depuis une feature sans coordination)

- `src/App.tsx` — routage des écrans et transitions de statut
- `src/lib/pmsData.ts` — accès aux données et actions serveur
- `src/lib/auth.tsx`, `src/lib/roles.ts` — session et rôles
- `supabase/migrations/*` — une migration par PR, jamais de modification d'une migration déjà appliquée

## Vercel

| Branche | Environnement Vercel |
|---|---|
| `main` | Production (hotel-pms-mu.vercel.app) |
| `develop` | Preview « develop » |
| `feature/*`, `release/*`, `hotfix/*` | Preview automatique par PR |

`vercel.json` n'active le déploiement automatique sur push que pour `main` et `develop` ;
les autres branches sont déployées en preview via leurs pull requests. Configuration des
variables : [docs/vercel-setup.md](docs/vercel-setup.md).

## Migrations

1. Écrire la migration dans `supabase/migrations/AAAAMMJJHHMMSS_description.sql`.
2. La vérifier en local : `npm run test:db` (ajouter un test dans `supabase/tests/` si elle
   touche aux droits ou aux règles métier).
3. Après merge dans `main`, l'appliquer sur le projet Supabase « Hotel PMS »
   (`supabase db push` ou éditeur SQL), puis contrôler les « Advisors » du projet.

## Processus de release

```bash
git checkout develop && git pull
git checkout -b release/v0.6.0
# … corrections de stabilisation uniquement …
git checkout main && git merge --no-ff release/v0.6.0
git tag -a v0.6.0 -m "Release v0.6.0"
git checkout develop && git merge --no-ff release/v0.6.0
git branch -d release/v0.6.0
```

## Processus de hotfix

```bash
git checkout main && git checkout -b hotfix/description
# … correctif …
git checkout main && git merge --no-ff hotfix/description
git checkout develop && git merge --no-ff hotfix/description
git branch -d hotfix/description
```

## Protection des branches (à régler sur GitHub)

Settings → Branches → règles pour `main` et `develop` :
pull request obligatoire, checks « CI » requis, pas de force-push, pas de suppression.
