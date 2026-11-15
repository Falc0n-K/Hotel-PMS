# Changelog

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versions selon
[Semantic Versioning](https://semver.org/lang/fr/) (règles dans [BRANCHING.md](BRANCHING.md#versioning)).

## [Unreleased]

### Added
- **Back-office sur téléphone** : sous 1024 px, le menu latéral devient un tiroir
  (bouton dans l'en-tête, fermeture par Échap ou en touchant à côté). La gouvernante,
  les femmes et valets de chambre et la maintenance ont en plus une barre d'onglets en
  bas d'écran (Accueil, Chambres, Ménage, Maintenance, Menu) ; la maintenance arrive
  directement sur ses interventions. L'écran Chambres affiche une fiche par chambre
  avec les actions « Ménage terminé » et « Lever la maintenance ». Les écrans prévus
  pour un écran large (planning, finance, paramètres…) restent accessibles et sont
  signalés dans le menu. Tests navigateur sur téléphone en CI.
- **Réception sur tablette** : en paysage (1024 à 1280 px), le menu devient un rail
  d'icônes libellées qui laisse la place aux écrans et s'ouvre en menu complet d'un
  geste ; en portrait, menu en tiroir. Sur écran tactile, boutons et champs d'au moins
  44 px, champs en 16 px (pas de zoom automatique de l'iPad), boutons Check-in /
  Check-out agrandis. La liste des réservations masque Provenance et Montant sous
  1280 px (visibles dans la fiche). Le planning indique de toucher un séjour pour le
  modifier ou déloger, le glisser-déposer ne fonctionnant pas au doigt. Tests
  navigateur sur tablette (portrait et paysage).

### Fixed
- Le bouton « CRM Clients » de la console réception ne menait nulle part.
- Le pied de page affichait la version 0.6.0 au lieu de la version réelle.

## [1.0.0-alpha.1] - 2026-11-15

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
  captcha Turnstile, lien vers la politique de confidentialité), API partenaires à clés
  et portées, webhooks signés, synchronisation iCal (Airbnb, Booking.com…). Recherche de
  disponibilités en une seule requête (≈ 5 500 req/s sur le banc de charge).
- **Messages** : confirmation, annulation et rappel J-1 par e-mail, SMS, WhatsApp, en
  français ou en anglais selon la langue du client (page de réservation, API ou fiche
  client).
- **Devise par établissement** parmi les devises sans décimales (XOF, XAF, GNF, KMF,
  RWF, BIF, DJF, MGA), verrouillée après le premier encaissement ; PayDunya reste limité
  au XOF.
- **Accès du support** : le propriétaire ou le directeur ouvre au support de l'éditeur
  un accès en lecture seule de 1 heure à 7 jours, révocable ; chaque consultation est
  inscrite au journal d'audit.
- **Pilotage** : tableau de bord orienté action, statistiques (TO, PMC/ADR, RevPAR),
  exports CSV journalisés, journal comptable SYSCOHADA, journal d'audit.
- **Reprise de données** : import CSV des chambres, clients et réservations d'un autre
  logiciel (montants d'origine conservés, aucun message envoyé aux clients).
- **Ergonomie** : recherche globale (Ctrl+K), raccourcis clavier, pagination de
  l'inventaire, verrouillage optimiste (une modification concurrente est refusée au lieu
  d'écraser celle d'un collègue).
- **Interface bilingue** français / anglais, application installable (PWA), copie
  hors ligne en lecture seule.
- **Exploitation** : CI (typage, build, tests SQL, tests Deno, tests navigateur
  Playwright sur API simulée, audit, secrets),
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
