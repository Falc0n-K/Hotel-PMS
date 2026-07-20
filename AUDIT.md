# Audit Complet — Senegal Hotels PMS

**Date :** 20 juillet 2026 · **Version auditée :** branche `main` (commit `a2b7143`) · **Périmètre :** 100 % du code source (14 765 lignes, 21 composants, 14 consoles), parcours simulés pour les rôles Propriétaire, Réceptionniste, Directeur Financier, Responsable Ménage, plus les angles Client / Gouvernante / Comptable / Administrateur.

**Équipe d'audit simulée :** Product Manager, UX/UI Designer, QA Lead, Software Architect, Consultant Hospitality, Expert Sécurité, Expert Performance, Expert Accessibilité.

---

## 0. Synthèse Exécutive (TL;DR)

Le produit est aujourd'hui un **prototype frontend de très bonne qualité visuelle**, mais ce n'est **pas encore un PMS** : il n'y a **aucun backend, aucune base de données, aucune authentification réelle et aucune persistance**. Un rechargement de page (F5) efface toutes les réservations, chambres, clients, paiements et paramètres. Le typage TypeScript est propre (`tsc` passe sans erreur), le build fonctionne, et la direction artistique (orange/bleu nuit, cartes arrondies) est cohérente et moderne.

Pour rivaliser avec Cloudbeds, Mews ou Opera Cloud, trois chantiers structurants sont incontournables, dans cet ordre :

1. **Backend + persistance + authentification réelle** (tout le reste en dépend) ;
2. **Modèle de réservation par dates** (calendrier/planning « tape chart », disponibilité par plage de dates, occupants liés aux dates — cf. vos remarques) ;
3. **Channel manager OTA réel + moteur tarifaire** (stop-sell, mise à jour des états sur Booking/Expedia, plans tarifaires).

**Bilan chiffré des constats :** 9 Critiques · 14 Hautes · 15 Moyennes · 10 Faibles, plus une feuille de route « Enterprise » (§ 9).

---

## 1. Constats CRITIQUES (bloquants pour une mise en production)

### C1. Aucune persistance des données
- **Description :** Toutes les données (chambres, réservations, clients, transactions, staff, messages, paramètres) vivent dans des `useState` locaux (`App.tsx:48-51`, `BookingsDesk.tsx:65`, `GuestsCRM.tsx:60`, `PaymentsFinance.tsx:72`, etc.). Aucun appel réseau, aucun `localStorage`, aucune API.
- **Cause probable :** Prototype généré pour démonstration (AI Studio), jamais raccordé à un backend.
- **Solution :** Backend (Supabase/PostgreSQL ou Node+Prisma) avec API REST/GraphQL, ou a minima persistance `localStorage`/IndexedDB en transition. Modéliser : `hotels`, `rooms`, `room_types`, `rate_plans`, `reservations`, `guests`, `folios`, `payments`, `housekeeping_tasks`, `users`, `audit_log`.
- **Priorité : Critique** · **Impact :** perte totale de données à chaque session — le produit est inutilisable en réel. **Complexité :** Élevée (3–6 semaines).

### C2. Aucune authentification réelle — RBAC purement décoratif
- **Description :** Le rôle est un simple `<select>` dans la sidebar (`Sidebar.tsx:120-130`) : n'importe qui bascule en « Propriétaire » en un clic. L'écran de verrouillage (`Modals.tsx:25`) accepte le PIN `1234`, `admin` **ou un champ vide**, affiche l'astuce à l'écran, et propose un bouton « Bypass rapide » (`Modals.tsx:83-89`).
- **Cause probable :** Mode démo assumé (« Simuler les vues RBAC »).
- **Solution :** Authentification serveur (JWT/session, MFA optionnel), rôles attachés au compte, vérification des permissions **côté serveur** sur chaque endpoint. Supprimer le bypass et l'astuce.
- **Priorité : Critique** · **Impact :** n'importe quel utilisateur accède aux finances, supprime des chambres, annule des réservations. Non conforme RGPD (données clients : noms, téléphones, emails). **Complexité :** Moyenne-Élevée.

### C3. Pas de réservation par plage de dates → surréservation (double booking) possible
- **Description :** Une chambre a un statut global unique (`occupied`/`reserved`…), pas un calendrier. Impossible de réserver la chambre 104 pour deux clients sur des dates différentes. Le formulaire de réservation (`BookingsDesk.tsx:779-791`) liste **toutes** les chambres, y compris occupées, sans contrôle de chevauchement de dates : on peut créer deux réservations sur la même chambre aux mêmes dates.
- **Cause probable :** Modèle de données simplifié (statut ponctuel au lieu d'un axe temporel).
- **Solution :** Table `reservations(room_id, date_arrivee, date_depart)` + contrainte d'exclusion de chevauchement ; le statut affiché devient une **projection à la date du jour**. Ajouter un planning visuel par dates (tape chart) — standard chez Opera/Mews/Cloudbeds.
- **Priorité : Critique** · **Impact :** surréservations, clients sans chambre à l'arrivée — le risque métier n° 1 d'un hôtel. **Complexité :** Élevée.

### C4. Incohérence de devise — les montants facturés sont faux
- **Description :** Les tarifs générés sont en dollars (120–380, affichés `$…/nuit` dans `RoomGrid.tsx:157` et `MetricCards` en USD), mais `BookingsDesk` calcule `totalAmount = nightlyRate × nuits + petit-déjeuner (17 000 FCFA/nuit)` et affiche le tout en **FCFA** (`BookingsDesk.tsx:193-198`) : ex. 3 nuits en Standard = 120×3 + 51 000 = « 51 360 FCFA » au lieu de ~213 000 FCFA. `RoomInventory.tsx:135-141` tente de compenser avec une heuristique fragile (`val < 1000 → ×450`). Les réservations mockées, elles, sont en FCFA (510 000).
- **Cause probable :** Deux générations de données mélangées (USD puis FCFA) sans normalisation.
- **Solution :** Stocker tous les montants dans **une seule devise de référence** (FCFA, en entier), avec un service de formatage central (`Intl.NumberFormat('fr-SN')`) et une conversion d'affichage pilotée par le paramètre devise de `GlobalSettings` (aujourd'hui sans effet).
- **Priorité : Critique** · **Impact :** factures et KPI financiers faux — perte de confiance immédiate, risque comptable. **Complexité :** Faible-Moyenne.

### C5. Double source de vérité : réservations ↔ chambres désynchronisées
- **Description :** Le registre de réservations vit dans `BookingsDesk` (état local), l'état des chambres dans `App`. Un check-out fait depuis le **dashboard** (`RoomGrid`) ne clôt pas la réservation correspondante ; un « Annuler » sur une chambre réservée du dashboard libère la chambre mais laisse la réservation « Confirmé » ; un check-in dashboard ne crée aucun dossier. En quittant la console Réservations, tout nouveau dossier est perdu (état non remonté).
- **Cause probable :** État non hissé dans `App` (ou un store global).
- **Solution :** Store unique (Zustand/Redux ou contexte + reducer) : `reservations` comme entité maîtresse, statut chambre dérivé. Toute action check-in/check-out passe par la réservation.
- **Priorité : Critique** · **Impact :** incohérences opérationnelles constantes entre réception et gouvernance. **Complexité :** Moyenne.

### C6. Multi-établissement factice et chiffres incohérents
- **Description :** Les 3 hôtels partagent le **même** tableau de 120 chambres, filtré arbitrairement (`App.tsx:60-89`). Bugs concrets : le filtre `parseInt(r.number) % 10 <= 18` de Nema Kadior est toujours vrai (un modulo 10 est ≤ 9) → 90 chambres affichées au lieu des « 72 » annoncées en commentaire ; Les Pélicans affiche 54 chambres au lieu de 40. Ajouter/supprimer une chambre dans un hôtel modifie les autres. Le « TOTAL ALL ROOMS 120 » est codé en dur (`RoomGrid.tsx:77`) quel que soit l'hôtel, et `HotelsHub` a ses propres statistiques déconnectées des chambres réelles.
- **Cause probable :** Simulation par filtre au lieu d'une vraie relation `hotel_id → rooms`.
- **Solution :** Chaque chambre appartient à un `hotel_id` ; les inventaires, KPI et graphiques sont calculés par hôtel.
- **Priorité : Critique** · **Impact :** tous les chiffres multi-hôtels sont faux ; inutilisable pour un groupe. **Complexité :** Moyenne.

### C7. KPI et graphiques partiellement fabriqués
- **Description :** « Clients partis » = `notReady + 2` (`App.tsx:104`) ; revenus = base 58 240 × multiplicateur ; pourcentages de croissance (+15.6 %, +12.4 %…) codés en dur (`MetricCards.tsx`) ; `RevenueChart` et `OccupancyChart` affichent des données statiques identiques pour les 3 hôtels et tous les rôles ; le sélecteur de période (« 6 Derniers Mois ») ne change pas les données.
- **Cause probable :** Données de démonstration.
- **Solution :** Calculer chaque KPI depuis les données réelles (réservations du jour, encaissements) ; brancher les sélecteurs de période ; sinon retirer les éléments non fonctionnels (un faux chiffre est pire qu'aucun chiffre).
- **Priorité : Critique** (confiance dans le produit) · **Impact :** décisions managériales sur des chiffres inventés. **Complexité :** Moyenne (dépend de C1/C3).

### C8. Aucune version mobile — layout cassé sous ~1024 px
- **Description :** Sidebar fixe de 288 px (`w-72 … fixed`, `Sidebar.tsx:54`) + `pl-72` permanent sur le main (`App.tsx:256`) : sur mobile/tablette, le contenu est écrasé ou hors écran ; aucun menu burger, aucune version repliée. La recherche du header disparaît en mobile (`max-sm:hidden`) sans alternative.
- **Cause probable :** Développement desktop-first sans passe responsive.
- **Solution :** Sidebar en drawer sous `lg:`, `pl-0 lg:pl-72`, navigation bottom-bar mobile pour les rôles terrain (gouvernante, réception). Les gouvernantes de Mews/Cloudbeds travaillent sur smartphone — c'est un cas d'usage cœur, pas un bonus.
- **Priorité : Critique** · **Impact :** gouvernantes et réceptionnistes ne peuvent pas travailler en mobilité. **Complexité :** Moyenne.

### C9. Fuite RBAC réelle dans l'inventaire
- **Description :** Le Responsable Ménage a accès à `rooms-inventory` et à l'édition inline. Le garde-fou (`RoomInventory.tsx:118`) ne bloque que certains **statuts** : il peut toujours **modifier les tarifs des chambres et les noms des clients** tant qu'il choisit « Disponible »/« En nettoyage ». Le Directeur Financier est « bloqué » sur le dashboard par un simple `alert` (`App.tsx:351`) mais garde l'édition via d'autres chemins.
- **Cause probable :** Contrôles éparpillés dans l'UI au lieu d'une matrice de permissions par action.
- **Solution :** Matrice centrale `can(role, action, resource)` appliquée à chaque bouton **et** (à terme) côté serveur ; l'édition tarifaire réservée à Direction/Revenue Manager.
- **Priorité : Critique** · **Impact :** intégrité tarifaire et données clients compromise. **Complexité :** Faible-Moyenne.

---

## 2. Constats HAUTS

### H1. Vos remarques : « Relier les dates d'occupation au nombre d'occupants »
- **Constat :** Le champ `occupants` existe (`types.ts:19`) mais n'apparaît **nulle part** dans le formulaire de réservation, n'est pas éditable, et le petit-déjeuner est facturé pour 2 personnes en dur (`8500 × nuits × 2`, `BookingsDesk.tsx:196`) quel que soit le nombre réel d'occupants.
- **Solution :** Ajouter adultes/enfants au formulaire, valider contre la capacité max du type de chambre, calculer petit-déjeuner/taxes de séjour **par personne et par nuit**, afficher l'occupation (pax) sur le planning et dans l'inspecteur de chambre.
- **Priorité : Haute** · **Impact :** facturation fausse, pas de prévision F&B ni de taxe de séjour. **Complexité :** Faible (UI) à Moyenne (tarification par occupation).

### H2. Vos remarques : « Stop service / stop-sell » absent
- **Constat :** Aucun mécanisme pour fermer une chambre, un type de chambre ou une date à la vente (travaux, surbooking, événement privé). Le statut `not-ready` est le seul proxy et il est écrasé par le ménage.
- **Solution :** Ajouter les statuts `out-of-service` (hors service, non vendable, compte dans l'inventaire) et `out-of-order` (hors inventaire), avec motif, dates de début/fin et responsable ; plus un « stop-sell » par type de chambre × plage de dates propagé aux OTA.
- **Priorité : Haute** · **Impact :** vente de chambres indisponibles, distinction impossible ménage/maintenance. **Complexité :** Moyenne.

### H3. Vos remarques : « Mise à jour des états sur les OTA »
- **Constat :** La « synchronisation OTA » de `GlobalSettings.tsx:136-163` est un `setTimeout` qui affiche « Succès (3 OTA à jour) » sans rien synchroniser. Les sources de réservation (Booking, Expedia) sont des données statiques.
- **Solution :** Intégrer un channel manager (SiteMinder, D-EDGE, Cubilis — ou API directes Booking.com Connectivity / Expedia EPS) : push disponibilité/tarifs/stop-sell, pull réservations/annulations, avec file de synchronisation, journal des échanges et alertes d'échec. C'est **la** fonctionnalité qui différencie un PMS d'un tableau interne.
- **Priorité : Haute** · **Impact :** sans cela, double saisie manuelle et risque permanent de surréservation OTA. **Complexité :** Élevée (certification partenaire requise).

### H4. Vos remarques : « Check-in / Check-out » incomplets
- **Constat :** Le check-in/check-out fonctionne (dashboard + guichet) mais : aucun contrôle de date (on peut « check-in » une arrivée prévue dans 3 semaines) ; les dates inversées donnent un nombre de nuits positif (`Math.abs`, `BookingsDesk.tsx:178`) — un départ **avant** l'arrivée passe sans erreur ; le check-out ignore le solde dû (un dossier « Non Payé » part sans alerte) ; pas de liste « Arrivées du jour / Départs du jour » ; pas de no-show ; pas de check-in en ligne côté client.
- **Solution :** Écran « Arrivées & Départs du jour » comme vue d'accueil réception ; validation `checkOut > checkIn` ; blocage/alerte check-out si solde ≠ 0 avec encaissement intégré ; statut `No-show` automatique ; à terme, pré-check-in en ligne (standard Mews).
- **Priorité : Haute** · **Impact :** cœur du métier réception, fiabilité de la facturation. **Complexité :** Moyenne.

### H5. Vos remarques : « Interface maintenance chambres claire pour la réception »
- **Constat :** Aucune console gouvernance/maintenance dédiée. La réception voit seulement une couleur grise « Non prête », sans savoir : pourquoi, depuis quand, qui s'en occupe, pour quand. Les tâches du dashboard (`BottomSections`) sont une simple to-do non liée aux chambres.
- **Solution :** Console « Gouvernance & Maintenance » : tableau par chambre (statut ménage : sale / en cours / propre / inspectée ; tickets maintenance avec photo, priorité, assignation, échéance), file de priorités pilotée par les départs/arrivées du jour, et un panneau synthétique côté réception (« Ch. 204 : fuite lavabo, technicien assigné, prête à 15 h »). Notifications croisées réception ↔ étages.
- **Priorité : Haute** · **Impact :** coordination réception/étages = satisfaction client à l'arrivée. **Complexité :** Moyenne.

### H6. Silos de données entre consoles
- **Constat :** CRM clients, paiements, réservations, avis, messagerie sont des mondes séparés : un paiement n'est lié à aucune réservation, une fiche CRM à aucun séjour, un avis à aucun dossier. Aucune fiche client 360°.
- **Solution :** Entité `guest` centrale référencée par réservations, folios, avis, messages ; fiche client avec historique de séjours, dépenses totales, préférences.
- **Priorité : Haute** · **Impact :** pas de vision client, pas de fidélisation, double saisie. **Complexité :** Moyenne (avec C1/C5).

### H7. Aucune facturation réelle (folio)
- **Constat :** `PaymentsFinance` enregistre des écritures libres ; pas de folio par séjour, pas de TVA appliquée (le taux paramétré ne sert à rien), pas de facture PDF conforme, pas de split billing, pas de clôture de caisse / night audit.
- **Solution :** Folio par réservation (nuitées + extras + taxes), génération PDF numérotée conforme (mentions légales sénégalaises, NINEA), encaissements multiples (Wave/OM/carte/espèces — déjà bien anticipés dans l'UI), rapport de clôture journalière.
- **Priorité : Haute** · **Impact :** obligation légale et comptable. **Complexité :** Moyenne-Élevée.

### H8. Effet de bord React : revenus comptés en double
- **Constat :** `setDeltaEarnings` est appelé **à l'intérieur** du updater de `setRooms` (`App.tsx:117`, `App.tsx:158`). En StrictMode/React 19, les updaters peuvent être ré-exécutés → revenus incrémentés deux fois.
- **Solution :** Sortir les effets de bord des updaters (calculer la transition avant, puis dispatcher les deux mises à jour).
- **Priorité : Haute** · **Impact :** chiffres de revenus faux de façon intermittente. **Complexité :** Faible.

### H9. Titre du header figé « Tableau de Bord »
- **Constat :** `Header.tsx:34` affiche toujours « Tableau de Bord », même dans Paiements, CRM, etc. Le fil d'Ariane n'existe pas.
- **Solution :** Titre dynamique selon la console active + breadcrumb (Hôtel › Console).
- **Priorité : Haute** (désorientation permanente) · **Complexité :** Triviale.

### H10. Recherche globale trompeuse
- **Constat :** La recherche du header ne filtre que la grille du dashboard ; le placeholder promet « chambre, client, statut » mais les statuts sont indexés en anglais (`occupied`) alors que l'UI est en français ; la recherche est inopérante sur les 13 autres consoles.
- **Solution :** Recherche globale (command palette ⌘K) multi-entités : chambres, réservations, clients, factures — standard chez Mews.
- **Priorité : Haute** · **Complexité :** Moyenne.

### H11. Boutons factices et `alert()` natifs (15 occurrences)
- **Constat :** « Télécharger le rapport d'audit » (`App.tsx:480`), le centre d'assistance (`Header.tsx:65`), le rattachement e-mailing (`MarketingPackages.tsx:758`)… déclenchent des `alert()` navigateur ; les confirmations destructives utilisent `confirm()` natif (12 occurrences), non stylées, non accessibles, bloquantes.
- **Solution :** Composants `<ConfirmDialog>` et `<Toast>` réutilisables (le toast existe déjà, en 3 copies locales — à factoriser) ; retirer ou implémenter chaque bouton mort.
- **Priorité : Haute** · **Impact :** perception « démo » immédiate. **Complexité :** Faible.

### H12. IDs de réservation non uniques
- **Constat :** `RES-XX-${100 + Math.floor(Math.random()*900)}` (`BookingsDesk.tsx:230`) : 900 valeurs possibles → collisions rapides ; `Date.now()` utilisé ailleurs peut coïncider sur actions rapprochées.
- **Solution :** UUID (`crypto.randomUUID()`) en interne + numéro séquentiel lisible par hôtel/année (RS-2026-00123) pour l'affichage.
- **Priorité : Haute** · **Complexité :** Triviale.

### H13. Valeurs par défaut fabriquées dans les données clients
- **Constat :** Email manquant → `clients@senegalhotels.sn`, téléphone → `+221 33 000 00 00` (`BookingsDesk.tsx:235-236`) : de fausses coordonnées entrent en base et pollueront emailing et facturation.
- **Solution :** Laisser vide + affichage « Non renseigné » ; validation format email/téléphone (E.164).
- **Priorité : Haute** · **Complexité :** Triviale.

### H14. Grille du dashboard incapable d'afficher les nouvelles chambres
- **Constat :** `RoomGrid` itère sur des étages codés en dur `[4,3,2,1]` — une chambre créée à l'étage 5 (permis par le formulaire, max=5) n'apparaît jamais ; `room.number.slice(1)` affiche un numéro faux pour tout format non « X0Y » ; l'en-tête « Chambres 101 à 130 » est faux pour les hôtels filtrés.
- **Solution :** Étages dérivés des données (`[...new Set(rooms.map(r=>r.floor))]`), numéro complet affiché, en-têtes calculés.
- **Priorité : Haute** · **Complexité :** Triviale.

---

## 3. Constats MOYENS

| # | Constat | Détail / Localisation | Solution | Complexité |
|---|---------|----------------------|----------|------------|
| M1 | Accessibilité quasi nulle | 0 attribut `aria-*` dans tout le projet ; statuts codés uniquement par couleur ; modales sans focus-trap, sans fermeture Échap, sans `role="dialog"` ; panneau notifications sans fermeture au clic extérieur | Passe WCAG 2.1 AA : aria-labels, focus management, `useId`, pictogrammes en plus des couleurs | Moyenne |
| M2 | Typographies illisibles | Corps de texte massivement en 8,5–11 px (`text-[8.5px]`, `text-[9px]`…) — sous le seuil de lisibilité, échec WCAG | Base 13–14 px, min 11 px pour les méta-labels | Faible |
| M3 | Classes Tailwind invalides (~40) | `text-slate-405/404/450/605/705/750/755`, `orange-650/655/850`, `blue-650`, `sky-650`, `red-105`, `emerald-650`, `border-slate-150`, `duration-350/355/360/365` — silencieusement ignorées : les styles voulus ne s'appliquent pas | Corriger vers la palette réelle ; ajouter un lint (eslint-plugin-tailwindcss) | Faible |
| M4 | Notifications sans horodatage réel | `time: 'À l'instant'` figé pour toujours (`App.tsx:124`) | Stocker `createdAt: Date` + affichage relatif recalculé | Triviale |
| M5 | Aucun « undo » ni corbeille | Suppressions chambre/client/transaction définitives après un simple `confirm` | Soft-delete + toast « Annuler » (pattern Gmail) | Faible |
| M6 | Paramètres sans effet | Devise, TVA, prix petit-déjeuner, sauvegardes de `GlobalSettings` ne pilotent rien | Contexte de configuration consommé par les modules de calcul | Moyenne |
| M7 | Édition inline sans validation | Tarif négatif ou 0 possible (`parseInt(e.target.value) \|\| 0`, `RoomInventory.tsx:455`) ; étage libre ; catégorie de chambre non liée au tarif | Validations min/max + règles métier | Faible |
| M8 | Le formulaire de réservation présélectionne une chambre occupée si rien n'est libre | `BookingsDesk.tsx:394-399` | Ne proposer que les chambres disponibles sur les dates choisies (dépend C3) | Faible |
| M9 | Dates par défaut codées en dur | Check-in `2026-05-22` en dur — déjà dans le passé | `new Date()` / demain | Triviale |
| M10 | Pas d'export nulle part | Aucun CSV/Excel/PDF (réservations, transactions, inventaire, staff) | Export CSV natif + PDF pour factures/rapports | Faible |
| M11 | Bundle monolithique 646 kB | 1 seul chunk JS (warning Vite au build) ; toutes les consoles chargées d'emblée | `React.lazy` par console + `manualChunks` ; viser < 200 kB initial | Faible |
| M12 | Logo hébergé sur Google Drive | `Sidebar.tsx:59` (`lh3.googleusercontent.com`) : dépendance externe fragile (le fallback existe, bien vu) | Servir l'asset localement (`/public`) | Triviale |
| M13 | SEO/branding de la coquille HTML | `index.html` : titre « My Google AI Studio App », `lang="en"` pour une app française, aucune meta description/OG, pas de favicon, pas de manifest PWA | Titre/lang/meta/favicon/manifest ; PWA installable pour les équipes terrain | Triviale |
| M14 | Fautes et libellés | « KATERING PB » (en-tête de colonne incompréhensible, `BookingsDesk.tsx:531`), « NÉTTOYAGE », « Cettte », « encours de services », « Sérieux ? Voulez-vous radier… » (ton inadapté, `EventVenues.tsx:359`) | Relecture complète + glossaire hôtelier ; ton professionnel constant | Triviale |
| M15 | Conflits de calques (z-index) | Toasts et modales tous en `z-50` : le toast passe sous/derrière selon l'ordre DOM ; le dropdown notifications peut être recouvert | Échelle z-index tokenisée (dropdown 30 / modal 40 / toast 50) | Triviale |

---

## 4. Constats FAIBLES

| # | Constat | Solution |
|---|---------|----------|
| F1 | Dépendances inutilisées lourdes : `@google/genai`, `express`, `dotenv`, `motion` ne sont importés nulle part | Les retirer du `package.json` |
| F2 | `package.json` nommé `react-example`, version `0.0.0` | Renommer `senegal-hotels-pms`, versionner semver |
| F3 | Code mort : `seedShuffle` no-op (`data.ts:108`), imports inutilisés (~15 dans `RoomInventory`, `App`) | Activer `noUnusedLocals` + ESLint |
| F4 | 3 implémentations locales dupliquées du toast, 2 de `formatValue` | Extraire `components/ui/` partagés |
| F5 | `console` (mot-clé réservé conceptuellement) comme nom de prop ; mélange français/anglais dans le code | Convention de nommage unique (anglais code / français UI) |
| F6 | Graphiques SVG faits main sans virtualisation ni resize observer complet | Migrer vers Recharts/visx (accessibilité + tooltips gratuits) |
| F7 | `select` d'hôtel avec émoji `🦤` (dodo) pour « Les Pélicans » | Icône pélican/cohérente |
| F8 | Footer « Serveur Multi-hôtels en ligne (Port 3000) » — faux statut codé en dur | Vrai healthcheck ou suppression |
| F9 | Aucune gestion d'erreur (ErrorBoundary absent) : une exception blanchit tout l'écran | ErrorBoundary par console + page d'erreur |
| F10 | Pas de tests (0 test unitaire/E2E) ni CI | Vitest + Playwright sur les parcours critiques (réservation, check-in/out, paiement) |

---

## 5. Parcours par rôle — frictions UX relevées

**Réceptionniste.** Il lui manque l'essentiel du quotidien : liste « Arrivées / Départs du jour » (il doit filtrer un tableau), état ménage/maintenance détaillé des chambres (cf. H5), alerte solde au check-out, délogement (room move), walk-in rapide (le formulaire complet est le seul chemin). Le bouton « Réceptionner un Voyageur (Nouveau) » est ambigu : il crée une **réservation**, pas un check-in.

**Gouvernante.** Son dashboard épuré est une bonne idée, mais elle n'a ni liste de tâches par chambre, ni priorisation par départs, ni mobile (C8), ni moyen de signaler un problème technique depuis une chambre. Elle peut en revanche modifier des tarifs (C9).

**Comptable / Directeur Financier.** Pas de rapprochement paiements↔réservations, pas de TVA, pas d'export comptable, pas de clôture journalière ; la suppression d'écritures de caisse est permise (avec un simple confirm) — un journal comptable doit être **immuable** (contre-passation, pas suppression).

**Manager / Propriétaire.** KPI fabriqués (C7), pas de comparaison inter-hôtels réelle, pas d'ADR/RevPAR/TrevPAR calculés (l'« ADR » de l'inventaire est une moyenne de grille tarifaire, pas un ADR), pas d'alertes (occupation faible à J+7, avis négatif).

**Client final.** Inexistant : pas de moteur de réservation en ligne, pas de confirmation email, pas de portail de pré-check-in, pas de paiement en ligne.

**Administrateur.** Pas de gestion des utilisateurs (création de comptes, rôles), pas de journal d'audit des actions (qui a changé ce tarif ?), pas de sauvegarde réelle.

---

## 6. Sécurité — synthèse

Au-delà de C2/C9 : données personnelles (noms, emails, téléphones clients) en clair dans le bundle JS livré au navigateur ; aucun chiffrement, aucune notion de session, aucun rate-limiting (sans objet tant qu'il n'y a pas d'API, mais à prévoir) ; `confirm()` comme unique garde-fou destructif ; aucune trace d'audit. À la mise en place du backend : HTTPS obligatoire, hash de mots de passe (argon2), permissions serveur, journal d'audit immuable, conformité RGPD (consentement, droit à l'effacement, registre des traitements) — les OTA l'exigent contractuellement.

## 7. Performance — synthèse

Le build passe en 2,6 s ; le vrai sujet est le chunk unique de **646 kB** (M11) et l'absence de code-splitting. Les listes (120 chambres × re-render à chaque frappe de recherche) restent fluides à cette échelle mais nécessiteront `useDeferredValue`/virtualisation au-delà de ~500 lignes. Icônes lucide importées à l'unité : bon point. Pas d'images lourdes. Score attendu Lighthouse correct une fois M11/M13 traités.

## 8. Qualité de code — synthèse

Points forts : TypeScript strict qui compile sans erreur, composants bien découpés par console, données typées, cohérence visuelle remarquable. Points faibles : composants de 900–1 300 lignes à découper (table / modale / stats en sous-composants), duplication (toasts, badges de statut, cartes KPI ×6 variantes copiées), aucune couche « domaine » (les règles métier vivent dans les handlers JSX), zéro test, classes Tailwind invalides (M3), mélange de langues.

---

## 9. Écart vs PMS Enterprise (Cloudbeds, Mews, Opera Cloud, RoomRaccoon, Little Hotelier, Hotelogix, RMS)

Fonctionnalités **absentes** classées par criticité concurrentielle :

**Indispensables (parité minimale) :**
1. Planning de réservation par dates (tape chart) drag & drop — le cœur de tout PMS
2. Channel manager OTA bidirectionnel (H3) + moteur de réservation direct sur le site de l'hôtel
3. Plans tarifaires : saisons, jours de semaine, tarifs par occupation, restrictions (min-stay, stop-sell — H2), codes promo reliés aux réservations
4. Folio & facturation conforme, encaissement en ligne (Stripe + Wave/Orange Money via agrégateur local type PayDunya/CinetPay)
5. Gouvernance & maintenance opérationnelles (H5) avec app mobile
6. Gestion des utilisateurs + journal d'audit
7. Emails transactionnels automatiques (confirmation, pré-arrivée, facture, demande d'avis)

**Différenciants (niveau Mews/Cloudbeds) :**
8. Check-in en ligne / kiosque, clés mobiles
9. Revenue management : suggestions tarifaires selon occupation prévisionnelle (l'onglet « simulation » de DeepAnalytics est une bonne base UX à brancher sur de vraies données)
10. Réservations de groupe & allotements, segments corporate
11. POS restaurant/bar imputable au folio chambre
12. Rapports planifiés (night audit, manager flash report par email)
13. API publique + webhooks (écosystème)
14. Multi-langue (FR/EN au minimum pour le staff, + WO pour l'accueil) et multi-devise réelle

**Bonnes idées déjà présentes à conserver :** paiements mobiles locaux (Wave/Orange Money) — un vrai différenciant face aux PMS internationaux mal adaptés au Sénégal ; console Expériences/Excursions (peu de PMS l'ont en natif) ; identité visuelle forte ; simulateur de scénarios tarifaires.

---

## 10. Feuille de route recommandée

| Phase | Contenu | Durée estimée |
|-------|---------|---------------|
| **P0 — Quick wins** (peut démarrer aujourd'hui) | H9, H12, H13, H14, M2, M3, M4, M9, M12, M13, M14, M15, F1, F2, F3, F7, F8 + remplacement des `alert()`/`confirm()` (H11) | 1–2 semaines |
| **P1 — Fondations** | Backend + auth + persistance (C1, C2), store unifié (C5), multi-hôtel réel (C6), devise unique (C4), matrice RBAC (C9) | 4–8 semaines |
| **P2 — Cœur PMS** | Réservations par dates + tape chart (C3), check-in/out complets (H4), occupants (H1), stop-sell & statuts maintenance (H2), console gouvernance (H5), folio/facturation (H7), responsive mobile (C8) | 6–10 semaines |
| **P3 — Distribution** | Channel manager (H3), moteur de réservation direct, paiement en ligne, emails transactionnels | 8–12 semaines |
| **P4 — Enterprise** | Revenue management, groupes, POS, API publique, rapports planifiés, multi-langue | continu |

---

## 11. Méthodologie et limites

Audit statique exhaustif du code (lecture intégrale des modules cœur : `App`, `types`, `data`, `Sidebar`, `Header`, `RoomGrid`, `Modals`, `MetricCards`, `BookingsDesk`, `RoomInventory` ; analyse structurelle par motifs des 11 autres consoles), vérification de compilation (`tsc --noEmit` : 0 erreur) et de build production (Vite : succès, 1 warning taille de chunk). L'application étant 100 % mockée, les « tests de bout en bout » correspondent à l'exécution mentale et statique de chaque workflow ; les constats de logique (C3, C4, C6, H8, H14…) sont vérifiés directement dans le code aux lignes citées.
