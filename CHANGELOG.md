# Changelog

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versions selon
[Semantic Versioning](https://semver.org/lang/fr/) (règles dans [BRANCHING.md](BRANCHING.md#versioning)).

## [Unreleased]

### Added
- **Accès du support** : le propriétaire ou le directeur ouvre au support de l'éditeur
  un accès en lecture seule de 1 heure à 7 jours, avec un motif, révocable à tout
  moment (Paramètres → Notifications et sécurité). Le support ne peut rien modifier ;
  chaque ouverture et chaque consultation sont inscrites au journal d'audit.
- **Devise par établissement** parmi les devises sans décimales (XOF, XAF, GNF, KMF,
  RWF, BIF, DJF, MGA), verrouillée après le premier encaissement. Affichage, factures,
  messages, API, webhooks et paiement Stripe suivent la devise ; PayDunya reste limité
  au XOF.

- **Messages aux clients en français ou en anglais** : la langue est celle de la page
  de réservation au moment de réserver, du champ `guest.language` de l'API, ou se règle
  sur la fiche client. Confirmation, annulation et rappel J-1, par e-mail, SMS et WhatsApp.
- **Lien vers la politique de confidentialité** sur la page de réservation publique, à
  côté du consentement (Paramètres → Distribution).

### Changed
- **Tests navigateur** (Playwright, 12 parcours) sur une API Supabase simulée, en CI :
  connexion et rôles, réservations, annulation avec frais, check-in et encaissement,
  recherche globale, langue, import CSV, page de réservation publique.
- Recherche de disponibilités (site public, API) en une seule requête : débit
  multiplié par 15 sur le banc de charge (≈ 5 500 req/s, 3,6 ms).
- Annulation depuis le planning : les frais d'annulation sont annoncés avant de
  confirmer.

### Fixed
- Les rechargements de données (après une modification des paramètres, au retour sur
  l'onglet) ne démontent plus l'écran affiché : le rapport d'import restait invisible et
  les Paramètres revenaient sur le premier onglet.

## [1.0.0-alpha.1] - 2026-10-04

Première version du PMS sur une vraie base de données : la maquette Google AI Studio
(v4.2.0-orange) est remplacée. Suite de l'audit du 4 octobre 2026.

### Added
- **Socle** : base Supabase « Hotel PMS » (eu-west-1), organisations, établissements,
  rôles par établissement (9 rôles), RLS multi-hôtels testée automatiquement.
- **Accès** : connexion, mot de passe oublié, double authentification TOTP exigible par
  établissement, verrouillage de poste.
- **Réservations** : contrôle de disponibilité sans surbooking possible (contrainte
  d'exclusion), options, provenance, modification et délogement, prolongation,
  check-in, check-out, annulation, no-show, room rack par glisser-déposer.
- **Conditions commerciales** : annulation gratuite jusqu'à N jours, frais d'annulation
  tardive et de no-show (y compris à l'audit de nuit), exonération par la direction,
  acompte attendu par plan tarifaire.
- **Groupes** : réservation de plusieurs chambres en une fois (tout ou rien),
  confirmation et annulation groupées, liste nominative.
- **Tarifs** : plans tarifaires, prix par période, fermetures, durée minimale.
- **Folio et facturation** : prestations, remises, encaissements (espèces, carte, Wave,
  Orange Money, virement), factures à numérotation continue avec TVA et taxe de séjour,
  avoirs, pièces non modifiables, facture des seuls frais d'une réservation annulée.
- **Caisse** : ouverture, clôture avec écart, validation par une autre personne.
- **Audit de nuit** automatique, ménage (tâches, assignation, inspection, actions en
  masse), maintenance et retrait de chambres de la vente.
- **Clients** : fiche de police, historique, VIP, consentement, anonymisation manuelle
  et automatique (au-delà de la durée de conservation, activable par établissement).
- **Paiement en ligne** : PayDunya (Wave, Orange Money) et Stripe, liens de paiement,
  écran de rapprochement des paiements en ligne.
- **Distribution** : page de réservation publique `/reserver/<adresse>` (FR/EN,
  captcha Turnstile), API partenaires à clés et portées, webhooks signés,
  synchronisation iCal (Airbnb, Booking.com…).
- **Messages** : confirmation, annulation et rappel J-1 par e-mail, SMS, WhatsApp.
- **Pilotage** : tableau de bord orienté action, statistiques (TO, PMC/ADR, RevPAR),
  exports CSV journalisés, journal comptable SYSCOHADA, journal d'audit.
- **Reprise de données** : import CSV des chambres, clients et réservations d'un autre
  logiciel (montants d'origine conservés, aucun message envoyé aux clients).
- **Ergonomie** : recherche globale (Ctrl+K), raccourcis clavier, pagination de
  l'inventaire, verrouillage optimiste (une modification concurrente est refusée au lieu
  d'écraser celle d'un collègue).
- **Interface bilingue** français / anglais, application installable (PWA), copie
  hors ligne en lecture seule.
- **Exploitation** : CI (typage, build, tests SQL, tests Deno, audit, secrets),
  déploiement Supabase sur approbation, Sentry, tests de charge (`npm run test:load`),
  releases automatiques avec envoi du lien, version affichée dans l'application.
- **Documentation** : configuration, API partenaires, revue de sécurité, tests de
  charge, conformité CDP et CGU (projets à faire valider par un avocat).

### Changed
- Politique de branches de Sénémap : `main`, `develop`, `feature/*`, `release/*`,
  `hotfix/*`, Dependabot sur `develop`.

### Removed
- Traces Google AI Studio (titre, métadonnées, dépendances `@google/genai`, `express`,
  mention « Port 3000 ») et modules de démonstration codés en dur.

### Security
- Revue interne : cloisonnement de trois fonctions de calcul entre établissements,
  impossibilité pour un directeur de rétrograder le propriétaire, références de
  réservation sans collision sous charge (voir `docs/securite.md`).
