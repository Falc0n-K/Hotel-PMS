# Revue de sécurité interne

Revue menée le 4 octobre 2026 sur la base Supabase « Hotel PMS », les Edge Functions et
le front. Ce n'est pas un test d'intrusion externe : à prévoir avant d'ouvrir le service
à des hôtels tiers.

## Méthode

1. Inventaire des droits réels en base (`has_function_privilege` sur chaque fonction,
   avis de sécurité Supabase).
2. Lecture des fonctions `security definer` accessibles aux utilisateurs connectés :
   chacune doit vérifier le rôle de l'appelant **dans l'établissement concerné**.
3. Lecture des policies RLS (lecture, écriture, cas du propriétaire).
4. Lecture des Edge Functions exposées sans session (paiement, réservation publique,
   API, iCal, webhooks).
5. Tests automatisés : `supabase/tests/40_revue_securite.test.sql` et
   `scripts/load-test.sh` (concurrence).

## Constat global

| Point | État |
|---|---|
| Rôle `anon` (visiteur non connecté) | N'exécute **aucune** fonction et ne lit aucune table |
| Fonctions internes (tâches planifiées, moteur public, API, triggers) | Réservées à `service_role` |
| Fonctions métier (36) | Accessibles aux connectés, chacune vérifie le rôle dans l'établissement (avis Supabase 0029 attendu) |
| `search_path` des fonctions | Fixé à `''` partout (pas de détournement par schéma) |
| Tables sans policy (séquences de factures, secrets de webhooks, limitation de débit) | Volontaire : lisibles par le seul `service_role` |
| Écritures comptables (paiements, factures, avoirs) | Immuables (trigger), numérotation continue |
| Double authentification | Exigible par établissement, contrôlée en base (niveau `aal2`) |
| Surbooking | Impossible : contrainte d'exclusion, vérifiée sous 50 clients simultanés |

## Failles trouvées et corrigées

Migration `20261004140000_revue_securite_codes.sql`, testée par
`40_revue_securite.test.sql`.

### 1. Lecture hors établissement par trois fonctions de calcul (moyenne)

`price_stay`, `room_is_blocked` et `reservation_balance` ne vérifiaient pas que
l'appelant appartenait à l'établissement. Tout compte connecté (l'inscription est
libre) pouvait obtenir les prix d'un autre hôtel, savoir si une chambre était bloquée ou
lire le solde d'une réservation, à condition d'en connaître l'identifiant. Les
identifiants de types de chambre sont publics via le moteur de réservation.

Correction : les versions d'origine deviennent internes (`*_unchecked`, non
exécutables par les utilisateurs) ; les fonctions publiques vérifient l'appartenance à
l'établissement.

### 2. Rétrogradation du propriétaire par un directeur (moyenne)

`add_member_by_email` refusait qu'un directeur **nomme** un propriétaire, mais pas qu'il
**change le rôle** d'un propriétaire existant (mise à jour sur conflit). Un directeur
pouvait donc réduire le propriétaire à « femme de chambre » et prendre la main sur
l'équipe. Il pouvait aussi modifier son propre rôle.

Correction : seul un propriétaire modifie le rôle d'un propriétaire ; personne d'autre
que le propriétaire ne modifie son propre rôle.

### 3. Réservations refusées par collision de référence (fiabilité)

Les références (`R261004-A1B2C`) n'ont que 5 caractères aléatoires par jour. Le test de
charge a provoqué des échecs (« duplicate key ») dès quelques milliers de réservations
le même jour : un client se voyait refuser une chambre libre.

Correction : un trigger tire une nouvelle référence tant qu'elle existe déjà dans
l'établissement. Plus aucune collision sur 5 000 réservations parallèles.

## Points vérifiés sans anomalie

- **Webhook Stripe** : signature HMAC vérifiée en temps constant, tolérance 5 min.
- **IPN PayDunya** : empreinte SHA-512 de la clé maître vérifiée, puis facture relue
  chez PayDunya avant toute écriture ; montant comparé au lien de paiement.
- **Liens de paiement** : montant borné au solde, droits contrôlés avec le jeton de
  l'utilisateur (`prepare_payment_link`), clé d'idempotence Stripe.
- **Moteur de réservation public** : captcha Turnstile obligatoire, limitation de
  débit, option bloquée temporairement puis libérée, aucune donnée interne renvoyée.
- **API partenaires** : clés stockées sous forme d'empreinte SHA-256, révocables,
  portées minimales, 120 requêtes/min, données client limitées au nom.
- **Webhooks sortants** : signés (HMAC-SHA256 horodaté), secret jamais relisible, URL
  HTTPS publiques seulement, redirections non suivies, délai 10 s.
- **iCal** : jeton de 192 bits, export sans donnée personnelle, import borné
  (2 Mo, 15 s, HTTPS public).
- **Front** : aucune clé secrète dans le bundle, CSP stricte (`script-src 'self'` +
  Turnstile), `frame-ancestors 'none'`, verrouillage de session.

## Risques résiduels et actions recommandées

| Risque | Gravité | Action |
|---|---|---|
| Protection contre les mots de passe divulgués désactivée | Moyenne | Activer dans Authentication → Passwords (plan Pro) |
| Limitation de débit du moteur public fondée sur le premier `X-Forwarded-For`, possiblement falsifiable selon la chaîne de proxys Supabase | Faible (le captcha reste obligatoire pour réserver) | Vérifier les en-têtes reçus en production ; à défaut, utiliser l'adresse ajoutée par le dernier proxy de confiance |
| Protection SSRF par nom d'hôte : un domaine public qui résout vers une adresse privée (DNS rebinding) n'est pas bloqué | Faible (l'environnement Edge Supabase n'expose pas de réseau interne sensible) | Réserver webhooks et iCal à la direction (déjà le cas) ; revoir si des fonctions sont auto-hébergées |
| `add_member_by_email` révèle si un e-mail a un compte | Faible (réservé à la direction) | Accepté |
| Extension `pg_net` dans le schéma `public` | Faible | Voir `docs/configuration.md` §3.5 |
| Pas de test d'intrusion externe | — | À commander avant la commercialisation |
| Sauvegardes : restauration jamais testée | Moyenne | Essai de restauration sur un projet jetable, puis PITR |

## Rejouer la revue

```bash
DATABASE_URL=postgres://postgres@localhost:5432/postgres npm run test:db   # tests de droits
DATABASE_URL=postgres://postgres@localhost:5432/postgres npm run test:load # concurrence et charge
```

Côté Supabase : Advisors → Security, à relire après chaque migration.
