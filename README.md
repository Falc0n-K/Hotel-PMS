# Senegal Hotels PMS

Système de gestion hôtelière multi-établissement (React + Vite, Supabase).

## Fonctions

Toutes les données sont dans Supabase ; les droits sont appliqués par la base (RLS et
fonctions SQL), l'interface ne fait que refléter ce que le serveur autorise.

- **Accès** : connexion, mot de passe oublié, double authentification (TOTP, exigible par
  établissement pour la direction et la finance), verrouillage de poste, rôles par
  établissement (propriétaire, direction, réservations, réception, gouvernante, ménage,
  maintenance, comptabilité, auditeur).
- **Réception** : console du jour, planning des chambres (glisser-déposer), réservations avec
  contrôle de disponibilité (aucun chevauchement possible), options, provenance, modification
  et délogement, check-in, check-out (solde nul exigé), annulation, no-show.
- **Tarifs** : tarif de base par type, plans tarifaires, prix par période, fermetures à la
  vente, durée minimale ; le prix est toujours calculé par le serveur.
- **Folio et facturation** : prestations, encaissements (espèces, carte, Wave, Orange Money,
  virement), liens de paiement en ligne (PayDunya, Stripe), factures à numérotation continue
  avec TVA et taxe de séjour, avoirs, pièces non modifiables.
- **Caisse** : ouverture, clôture avec écart, validation par une autre personne.
- **Audit de nuit** : automatique chaque nuit (pg_cron), no-show et indicateurs figés.
- **Ménage et maintenance** : tâches créées au départ, assignation, inspection ; signalements
  et retrait d'une chambre de la vente sur une période.
- **Clients** : fiche de police, historique, VIP, consentement, anonymisation.
- **Pilotage** : tableau de bord, statistiques (TO, PMC, RevPAR, provenance), exports CSV
  journalisés, journal comptable SYSCOHADA, journal d'audit.
- **Communications** : confirmation, annulation et rappel J-1 par e-mail, SMS, WhatsApp.
- **Technique** : application installable (PWA), copie hors ligne en lecture seule, Sentry
  optionnel, interface FR/EN pour l'ossature.

Pas encore fait : channel manager (Cloudbeds), moteur de réservation public, API publique.

Variables et secrets à renseigner : [docs/configuration.md](docs/configuration.md).

## Démarrer en local

Prérequis : Node.js 20 ou plus.

```bash
npm install
cp .env.example .env.local   # puis coller la clé anon du projet Supabase
npm run dev
```

Premier lancement : créer un compte, confirmer l'e-mail, puis créer l'organisation et le
premier établissement. Ajouter ensuite les chambres depuis l'inventaire et l'équipe depuis
« Équipe & Accès » (chaque collaborateur crée d'abord son compte).

## Base de données

Les migrations sont dans `supabase/migrations/`, appliquées dans l'ordre des noms.
Les tests (isolation entre hôtels, rôles, surbooking, tarifs, folio, caisse, ménage,
maintenance, audit de nuit, MFA, liens de paiement) sont dans `supabase/tests/` et tournent
sur un Postgres local :

```bash
DATABASE_URL=postgres://postgres@localhost:5432/postgres npm run test:db
```

Les Edge Functions (`supabase/functions/`) se vérifient avec Deno :

```bash
cd supabase/functions && deno check --config deno.json */index.ts && deno test --config deno.json _shared/
```

## Contribuer

Le modèle de branches est décrit dans [BRANCHING.md](BRANCHING.md) : jamais de push
direct sur `main` ou `develop`, tout passe par une branche `feature/*`, `fix/*` ou
`hotfix/*` et une pull request.

Avant une PR : `npm run typecheck`, `npm run build` et, si le schéma change,
`npm run test:db`.
