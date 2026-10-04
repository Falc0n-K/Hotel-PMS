# Senegal Hotels PMS

Système de gestion hôtelière multi-établissement (React + Vite, Supabase).

## État du produit

Reliés à la base Supabase, avec droits appliqués par le serveur (RLS et fonctions SQL) :

- connexion, création de compte, mot de passe oublié, verrouillage de poste ;
- organisations, établissements, rôles par établissement, gestion de l'équipe ;
- tableau de bord (indicateurs du jour, encaissements, occupation, arrivées, départs, ménage) ;
- inventaire des chambres et types de chambre ;
- réservations : création avec contrôle de disponibilité (aucun chevauchement possible
  sur une même chambre), check-in, check-out avec solde nul exigé, annulation, no-show ;
- encaissements (espèces, carte, Wave, Orange Money, virement), remboursements réservés
  à la direction et à la finance, pièces non modifiables ;
- factures à numérotation continue par établissement, TVA 18 % extraite du TTC ;
- tâches de ménage créées au départ, statut des chambres ;
- journal d'audit écrit par trigger.

Encore en données de démonstration (marqués « Démo » dans le menu, rien n'est enregistré) :
Hub Hôtels, CRM, Paiements & Finance, Lieux d'événements, Marché Expériences, Forfaits
Marketing, Retours clients, Deep Analytics, Annuaire Staff, Messagerie, Paramètres.

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
Les tests (isolation entre hôtels, rôles, surbooking, facturation) sont dans
`supabase/tests/` et tournent sur un Postgres local :

```bash
DATABASE_URL=postgres://postgres@localhost:5432/postgres npm run test:db
```

## Contribuer

Le modèle de branches est décrit dans [BRANCHING.md](BRANCHING.md) : jamais de push
direct sur `main` ou `develop`, tout passe par une branche `feature/*`, `fix/*` ou
`hotfix/*` et une pull request.

Avant une PR : `npm run typecheck`, `npm run build` et, si le schéma change,
`npm run test:db`.
