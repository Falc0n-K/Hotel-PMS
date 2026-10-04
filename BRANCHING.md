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

## Branches de fonctionnalités prévues (suite de la feuille de route)

| Branche | Périmètre |
|---|---|
| `feature/channel-manager` | Cloudbeds / OTA (après obtention de l'accès partenaire) |
| `feature/booking-engine` | Moteur de réservation public (avec captcha et limitation de débit) |
| `feature/api-publique` | API et webhooks pour partenaires |
| `feature/i18n-ecrans` | Traduction anglaise des écrans métier |
| `feature/staging` | Projet Supabase de préproduction pour les previews |

### Fichiers partagés (ne pas modifier depuis une feature sans coordination)

- `src/App.tsx` : routage des écrans et transitions de statut
- `src/lib/pmsData.ts` : accès aux données et actions serveur
- `src/lib/auth.tsx`, `src/lib/roles.ts`, `src/lib/nav.ts` : session, rôles, menu
- `src/components/ui.tsx` : composants d'interface communs
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
3. Après merge dans `main`, le workflow « Déploiement Supabase » l'applique (après votre
   approbation dans l'environnement GitHub `production`) ; contrôler ensuite les « Advisors ».

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
