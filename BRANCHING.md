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
5. La CI (typage, build, tests de base de données, audit, secrets, et version pour `main`)
   doit être verte avant merge.
6. Une migration SQL n'est appliquée en production qu'après merge dans `main`
   (voir « Migrations » plus bas).

## Branches de fonctionnalités prévues (suite de la feuille de route)

| Branche | Périmètre |
|---|---|
| `feature/channel-manager` | Cloudbeds / OTA temps réel (après obtention de l'accès partenaire) |
| `feature/staging` | Projet Supabase de préproduction pour les previews |
| `feature/super-admin` | Accès support plateforme, en lecture et journalisé |
| `feature/multi-devise` | Établissements hors zone FCFA |

Déjà livrés dans 1.0.0-alpha.1 : moteur de réservation, API publique et webhooks,
iCal, traduction anglaise (voir le CHANGELOG).

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

## Versioning

Versioning sémantique ([SemVer](https://semver.org/lang/fr/)) : `MAJEURE.MINEURE.CORRECTIF`.
La version vit dans `package.json`, chaque version est décrite dans
[CHANGELOG.md](CHANGELOG.md) et taguée `vX.Y.Z` sur `main`.

| Position | Type | Quand l'augmenter ? | Exemple | Branche habituelle |
|---|---|---|---|---|
| 1 (X.0.0) | Majeure | Changement qui casse la compatibilité : API partenaires modifiée de façon incompatible, migration qui impose une reprise de données, suppression d'une fonction utilisée | `v2.0.0` | `release/*` |
| 2 (0.X.0) | Mineure | Nouvelle fonctionnalité, tout le reste continue de marcher | `v1.3.0` | `release/*` |
| 3 (0.0.X) | Correctif | Simple correction de bug (hotfix), sans aucun ajout | `v1.2.4` | `hotfix/*` (ou `release/*` de stabilisation) |

Règles :

1. On remet à zéro les chiffres de droite : `1.4.2` + mineure = `1.5.0`, + majeure = `2.0.0`.
2. **Préversions** tant qu'aucun hôtel n'est en production : `1.0.0-alpha.N`, puis
   `1.0.0-beta.N` pour l'hôtel pilote, puis `1.0.0` pour la première version
   commercialisée. Ordre : `1.0.0-alpha.2` < `1.0.0-beta.1` < `1.0.0`.
3. Pendant le développement, chaque PR vers `develop` ajoute une ligne dans la section
   `## [Unreleased]` du CHANGELOG (Added, Changed, Fixed, Removed, Security).
4. La version ne change **que** sur une branche `release/*` ou `hotfix/*`, avec
   `npm run version:bump -- <major|minor|patch|prerelease>` : le script met à jour
   `package.json` et transforme `[Unreleased]` en `[X.Y.Z] - date`.
5. Une API partenaire (`/v1/…`) ne change jamais de façon incompatible dans une même
   version majeure ; une rupture passe par `/v2/` et une version majeure.
6. La version est affichée en bas du menu de l'application et envoyée à Sentry
   (`hotel-pms@X.Y.Z`) : chaque erreur est rattachée à sa version.

Contrôles automatiques :

- **CI** (job « Version et CHANGELOG », sur toute PR vers `main`) : refuse une version
  déjà publiée, inférieure à la dernière, ou absente du CHANGELOG.
- **Release automatique** (`.github/workflows/release.yml`, à chaque arrivée sur `main`) :
  crée le tag `vX.Y.Z`, la release GitHub avec les notes du CHANGELOG (marquée
  « pre-release » pour une alpha ou une bêta), puis **envoie le lien** :
  - par e-mail via Resend si le secret `RESEND_API_KEY` et la variable
    `RELEASE_NOTIFY_TO` (adresses séparées par des virgules) existent ;
  - sur la messagerie d'équipe (Slack, Google Chat, Teams, Discord) si le secret
    `RELEASE_WEBHOOK_URL` existe.
  Si la version n'a pas changé, le workflow ne fait rien.

## Processus de release

```bash
git checkout develop && git pull
git checkout -b release/v1.1.0
npm run version:bump -- minor          # 1.0.x → 1.1.0, CHANGELOG daté
git commit -am "chore(release): v1.1.0"
git push -u origin release/v1.1.0       # PR release/v1.1.0 → main (CI + job Version)
# … corrections de stabilisation uniquement …
```

Après le merge dans `main` : le tag, la release GitHub et l'envoi du lien sont
automatiques ; le workflow « Déploiement Supabase » applique les migrations après votre
approbation. Reporter ensuite `main` dans `develop` (PR `main` → `develop`, ou
`git checkout develop && git merge --no-ff main`) et supprimer la branche de release.

## Processus de hotfix

```bash
git checkout main && git pull
git checkout -b hotfix/v1.1.1-description
# … correctif …
npm run version:bump -- patch          # 1.1.0 → 1.1.1
git commit -am "fix: … (v1.1.1)"
# PR hotfix/… → main ; après merge : release automatique, puis report dans develop
```

## Protection des branches (à régler sur GitHub)

Settings → Branches → règles pour `main` et `develop` :
pull request obligatoire, checks « CI » requis, pas de force-push, pas de suppression.
Pour `main`, ajouter le check « Version et CHANGELOG » aux checks requis.

Settings → Actions → General → Workflow permissions : « Read and write permissions »
(le workflow de release crée le tag et la release).
