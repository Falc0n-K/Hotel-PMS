# Variables, secrets et réglages à renseigner

Trois endroits : Vercel (le front), GitHub (la CI et le déploiement de la base),
Supabase (la base, l'authentification et les fonctions serveur).

Règle : tout ce qui commence par `VITE_` finit dans le JavaScript envoyé au
navigateur, donc public. Aucun secret ne doit porter ce préfixe. Les secrets
(clés Stripe, PayDunya, Twilio, Resend, service role) vivent uniquement dans les
secrets des Edge Functions Supabase.

Choix des prestataires retenus dans le code (modifiables) :

| Besoin | Prestataire |
|---|---|
| Paiement mobile (Wave, Orange Money, Free Money) | PayDunya |
| Paiement carte internationale | Stripe |
| E-mail transactionnel et e-mails d'authentification | Resend |
| SMS et WhatsApp | Twilio |
| Suivi d'erreurs | Sentry |
| Channel manager | Cloudbeds : **pas encore intégré** (accès partenaire API à obtenir d'abord) |

Tout est facultatif sauf la section « Obligatoire » : une intégration sans ses
clés reste simplement désactivée dans l'interface.

---

## 1. Vercel — projet `hotel-pms`

Settings → Environment Variables. Cocher **Production** et **Preview** pour chacune.
Redéployer après tout ajout (les `VITE_` sont lues à la compilation).

### Obligatoire

| Nom | Valeur |
|---|---|
| `VITE_SUPABASE_URL` | `https://gqbztdprvqwewivzebsa.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_pFhQD59_LBBdjD9W5s92KA_eD-1a1GD` (clé publique par conception, protégée par la RLS) |

### Facultatif

| Nom | Où la trouver |
|---|---|
| `VITE_SENTRY_DSN` | sentry.io → projet → Settings → Client Keys (DSN). Public par conception. |
| `VITE_APP_ENV` | `production` en Production, `preview` en Preview (étiquette dans Sentry et bandeau « Préproduction ») |
| `VITE_TURNSTILE_SITE_KEY` | dash.cloudflare.com → Turnstile → Add widget (domaine Vercel) → Site Key. Public par conception. Requis pour la réservation en ligne. |

### Captcha Cloudflare Turnstile (réservation en ligne), pas à pas

1. Créer un compte gratuit sur dash.cloudflare.com (aucun domaine à transférer).
2. Menu **Turnstile** → **Add widget** : nom « Hotel PMS », domaines
   `hotel-pms-mu.vercel.app` (et votre domaine personnalisé, `localhost` pour les
   tests), mode **Managed** → Create.
3. Copier la **Site Key** → Vercel → Settings → Environment Variables →
   `VITE_TURNSTILE_SITE_KEY` (Production et Preview) → **redéployer** (la clé est lue à
   la compilation).
4. Copier la **Secret Key** → Supabase → Project Settings → Edge Functions → Secrets →
   `TURNSTILE_SECRET_KEY` (ou `supabase secrets set TURNSTILE_SECRET_KEY=…`). Aucun
   redéploiement de fonction nécessaire.
5. Vérifier : ouvrir `/reserver/<adresse>`, choisir une chambre ; le widget doit
   apparaître au-dessus du bouton « Réserver et payer ».

Sans ces deux clés, la page publique s'affiche mais toute réservation est refusée
(« Vérification anti-robot échouée »). Clés de test Cloudflare pour le local :
site `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA`.

### Réglages Vercel (pas des variables)

- Settings → Deployment Protection : activer **Vercel Authentication** sur les Previews
  (et sur la Production tant qu'aucun hôtel réel n'utilise le service).
- Settings → Git : Production Branch = `main`.
- Settings → Functions : région `cdg1` (Paris) si des fonctions Vercel sont ajoutées un jour.

---

## 2. GitHub — dépôt `Falc0n-K/Hotel-PMS`

Settings → Secrets and variables → Actions.

### Secrets (onglet « Secrets »)

| Nom | Où le trouver | Sert à |
|---|---|---|
| `SUPABASE_ACCESS_TOKEN` | supabase.com → Account → Access Tokens → Generate | Déployer migrations et Edge Functions depuis la CI |
| `SUPABASE_DB_PASSWORD` | Supabase → Project Settings → Database → mot de passe défini à la création (le réinitialiser si perdu) | `supabase db push` en CI |
| `SENTRY_AUTH_TOKEN` *(facultatif)* | sentry.io → Settings → Auth Tokens (scope `project:releases`) | Envoyer les source maps |

`GITHUB_TOKEN` est fourni automatiquement. Gitleaks n'a pas besoin de licence pour un
dépôt personnel.

### Variables (onglet « Variables », non secrètes)

| Nom | Valeur |
|---|---|
| `SUPABASE_PROJECT_REF` | `gqbztdprvqwewivzebsa` |
| `SENTRY_ORG` *(facultatif)* | slug de l'organisation Sentry |
| `SENTRY_PROJECT` *(facultatif)* | slug du projet Sentry |

### Releases automatiques et envoi du lien (facultatif)

Le workflow `.github/workflows/release.yml` crée le tag et la release GitHub à chaque
nouvelle version arrivée sur `main`, puis envoie le lien par les canaux configurés :

| Où | Nom | Valeur |
|---|---|---|
| Secret | `RESEND_API_KEY` | Même clé Resend que pour Supabase (ou une clé dédiée) |
| Variable | `RELEASE_NOTIFY_TO` | Destinataires, séparés par des virgules (ex. `direction@votre-domaine.sn, dev@votre-domaine.sn`) |
| Variable | `RELEASE_MAIL_FROM` | Expéditeur d'un domaine vérifié dans Resend (ex. `Hotel PMS <releases@votre-domaine.sn>`) |
| Secret | `RELEASE_WEBHOOK_URL` | URL de webhook entrant Slack, Google Chat, Teams ou Discord |
| Variable | `APP_URL` | URL de production, rappelée dans le message (défaut `https://hotel-pms-mu.vercel.app`) |

Le lien pointe vers la page de release GitHub : seules les personnes ayant accès au
dépôt peuvent l'ouvrir s'il est privé.

### Environnement GitHub « production »

Settings → Environments → New environment `production` → Required reviewers : vous.
Le workflow `.github/workflows/deploy-supabase.yml` y est rattaché : après chaque merge
dans `main` touchant `supabase/`, il applique les migrations (`supabase db push`) et
redéploie les Edge Functions, mais seulement après votre approbation.

### Protection des branches

Settings → Branches → Add rule, pour `main` puis pour `develop` :
pull request obligatoire, status checks requis (`Typage et build`,
`Migrations et tests SQL`, `Audit des dépendances`, `Detect leaked secrets`),
pas de force-push, pas de suppression.

---

## 3. Supabase — projet « Hotel PMS » (`gqbztdprvqwewivzebsa`)

### 3.1 Secrets des Edge Functions

Project Settings → Edge Functions → Secrets (ou `supabase secrets set NOM=valeur`).
`SUPABASE_URL`, `SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY` sont injectés
automatiquement : ne pas les créer.

| Nom | Où le trouver | Obligatoire pour |
|---|---|---|
| `APP_URL` | `https://hotel-pms-mu.vercel.app` (ou votre domaine) | Liens de retour des paiements et des e-mails |
| `CRON_SECRET` | Générer : `openssl rand -base64 32` | Appels planifiés (pg_cron → fonctions) |
| `PAYDUNYA_MASTER_KEY` | app.paydunya.com → Intégrez notre API → votre application | Wave / Orange Money |
| `PAYDUNYA_PRIVATE_KEY` | idem (clé privée, test ou live) | idem |
| `PAYDUNYA_TOKEN` | idem | idem |
| `PAYDUNYA_MODE` | `test` puis `live` | idem |
| `STRIPE_SECRET_KEY` | dashboard.stripe.com → Developers → API keys (`sk_test_…` puis `sk_live_…`) | Carte bancaire |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Developers → Webhooks → endpoint ci-dessous → Signing secret (`whsec_…`) | idem |
| `RESEND_API_KEY` | resend.com → API Keys | E-mails de confirmation de réservation |
| `MAIL_FROM` | ex. `Senegal Hotels <reservations@votre-domaine.sn>` (domaine vérifié dans Resend) | idem |
| `TWILIO_ACCOUNT_SID` | console.twilio.com → Account Info | SMS / WhatsApp |
| `TWILIO_AUTH_TOKEN` | idem | idem |
| `TWILIO_SMS_FROM` | numéro ou Sender ID Twilio | SMS |
| `TWILIO_WHATSAPP_FROM` | ex. `whatsapp:+14155238886` (sandbox) puis votre numéro validé | WhatsApp |
| `TURNSTILE_SECRET_KEY` | dash.cloudflare.com → Turnstile → votre widget → Secret Key | Réservation en ligne (anti-robots) |
| `CLOUDBEDS_CLIENT_ID` | Cloudbeds → programme partenaire API | Plus tard : intégration non développée |
| `CLOUDBEDS_CLIENT_SECRET` | idem | idem |

### 3.2 URL à déclarer chez les prestataires

| Prestataire | Champ | URL |
|---|---|---|
| Stripe | Webhook endpoint (événements `checkout.session.completed`, `charge.refunded`) | `https://gqbztdprvqwewivzebsa.supabase.co/functions/v1/stripe-webhook` |
| PayDunya | URL de notification (IPN) | `https://gqbztdprvqwewivzebsa.supabase.co/functions/v1/paydunya-ipn` |
| Twilio | Aucune (envoi seulement) | |
| Partenaires (API) | Base de l'API publique | `https://gqbztdprvqwewivzebsa.supabase.co/functions/v1/api/v1` (voir `docs/api.md`) |
| Airbnb, Booking.com… | Export iCal d'une chambre | URL copiée depuis Paramètres → Distribution |

### 3.3 Coffre (Vault) pour les tâches planifiées

SQL Editor, une fois :

```sql
select vault.create_secret('https://gqbztdprvqwewivzebsa.supabase.co', 'project_url');
select vault.create_secret('<même valeur que CRON_SECRET>', 'cron_secret');
```

pg_cron lit ces deux valeurs pour appeler les fonctions d'envoi de rappels, de webhooks
et de synchronisation iCal. L'audit de
nuit, lui, tourne entièrement en SQL et n'a besoin de rien.

### 3.4 Authentification

Authentication → URL Configuration :

- Site URL : `https://hotel-pms-mu.vercel.app`
- Redirect URLs : `https://hotel-pms-mu.vercel.app/**`,
  `https://hotel-pms-*-falc0n-ks-projects.vercel.app/**` (adapter au nom d'équipe Vercel),
  `http://localhost:5173/**`

Authentication → Sign In / Providers → Email :

- Confirm email : activé
- Minimum password length : 10
- Leaked password protection : activé (plan Pro)

Authentication → Multi-Factor : activer **TOTP**. L'application l'exige ensuite pour
les rôles propriétaire, directeur et comptabilité.

Authentication → Emails → SMTP Settings (sinon Supabase limite à quelques e-mails par heure) :

| Champ | Valeur |
|---|---|
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | votre `RESEND_API_KEY` |
| Sender email | adresse du domaine vérifié |

### 3.5 Base de données

- Database → Extensions : `pg_cron` et `pg_net` (activés par la migration, à vérifier).
- Database → Backups : vérifier la rétention du plan ; Point-in-Time Recovery conseillé
  avant le premier hôtel réel. Faire un essai de restauration sur un projet jetable.
- Migrations en attente, appliquées dans l'ordre par le workflow de déploiement au
  prochain merge dans `main` (ou à coller dans cet ordre dans le SQL Editor) :
  `20261004150000_separer_policies_ecriture.sql`, `20261004160000_exploitation_7_types.sql`,
  `20261004160100_exploitation_7_politiques_groupes_import.sql`. Les correctifs de la revue
  de sécurité (`20261004130013`) sont déjà appliqués. Le front de cette version appelle
  les nouvelles fonctions : déployer front et migrations ensemble.
- Données de recette : exécuter une fois `scripts/cleanup-e2e.sql` (compte de test désactivé,
  établissement « Hôtel Test E2E » à supprimer).
- Avis Supabase « Extension in Public » sur `pg_net` : l'extension était déjà installée dans
  `public` ; la déplacer impose de la recréer (`drop extension pg_net; create extension pg_net
  with schema extensions;`) puis de recréer la tâche `pms-send-notifications`.

### 3.6 Préproduction (recommandé avant le premier hôtel réel)

Créer un second projet Supabase « Hotel PMS Staging » dans la même région, puis :

- Vercel : surcharger `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` pour l'environnement
  **Preview** uniquement avec les valeurs du projet de staging ;
- GitHub : variable `SUPABASE_STAGING_PROJECT_REF` et secret `SUPABASE_STAGING_DB_PASSWORD`.

---

## Récapitulatif

| Où | Obligatoire | Facultatif (active une fonction) |
|---|---|---|
| Vercel | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | `VITE_SENTRY_DSN`, `VITE_APP_ENV`, `VITE_TURNSTILE_SITE_KEY` |
| GitHub secrets | `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD` | `SENTRY_AUTH_TOKEN`, `RESEND_API_KEY`, `RELEASE_WEBHOOK_URL` |
| GitHub variables | `SUPABASE_PROJECT_REF` | `SENTRY_ORG`, `SENTRY_PROJECT`, `RELEASE_NOTIFY_TO`, `RELEASE_MAIL_FROM`, `APP_URL` |
| Supabase secrets | `APP_URL`, `CRON_SECRET` | `PAYDUNYA_*` (4), `STRIPE_*` (2), `RESEND_API_KEY`, `MAIL_FROM`, `TWILIO_*` (4), `TURNSTILE_SECRET_KEY`, `CLOUDBEDS_*` (2) |
| Supabase Vault | `project_url`, `cron_secret` | |
| Supabase Auth | Site URL, Redirect URLs, MFA TOTP | SMTP Resend |
