# API partenaires et webhooks

Destinée aux tour-opérateurs, agences et sites tiers qui vendent les chambres d'un
établissement. Une clé d'API donne accès à **un seul établissement**.

Base : `https://gqbztdprvqwewivzebsa.supabase.co/functions/v1/api`

## Authentification

Créer la clé dans **Paramètres → Distribution → Clés d'API**. Elle n'est affichée
qu'une fois (seule son empreinte SHA-256 est conservée) ; la révoquer depuis le même
écran en cas de fuite.

```
Authorization: Bearer pms_3f9c…
```

Portées possibles, choisies à la création :

| Portée | Autorise |
|---|---|
| `availability:read` | `GET /v1/availability` |
| `reservations:read` | `GET /v1/reservations`, `GET /v1/reservations/{code}` |
| `reservations:write` | `POST /v1/reservations` |

Limite : 120 requêtes par minute et par clé (réponse `429` au-delà).
Montants en francs CFA (`XOF`), entiers, sans décimales. Dates au format `AAAA-MM-JJ`,
départ exclu.

## Points d'entrée

### Disponibilités

```
GET /v1/availability?check_in=2026-12-20&check_out=2026-12-23&adults=2&children=0
```

```json
{
  "currency": "XOF",
  "room_types": [
    { "room_type_id": "0b1d…", "name": "Bungalow", "capacity": 2, "available": 3, "total": 5,
      "nightly_avg": 42000, "breakfast_included": false }
  ]
}
```

Seuls les types de chambre assez grands pour le groupe et encore disponibles sur toute
la période sont renvoyés. `nightly_avg` tient compte des tarifs saisonniers du plan
public.

### Créer une réservation

```
POST /v1/reservations
Content-Type: application/json

{
  "room_type_id": "0b1d…",
  "check_in": "2026-12-20",
  "check_out": "2026-12-23",
  "adults": 2,
  "children": 0,
  "guest": { "name": "Awa Ndiaye", "email": "awa@exemple.sn", "phone": "+221770000000" },
  "notes": "Arrivée tardive"
}
```

Réponse `201` :

```json
{ "code": "HF-2612-0042", "status": "confirmed", "total_amount": 126000, "currency": "XOF" }
```

La chambre est attribuée automatiquement. Deux demandes simultanées pour la dernière
chambre ne peuvent pas aboutir toutes les deux : la seconde reçoit `409`
(« Plus de disponibilité »). Les réservations API sont confirmées d'emblée, le
règlement se fait entre le partenaire et l'hôtel.

### Lire les réservations

```
GET /v1/reservations?from=2026-12-01&to=2026-12-31&status=confirmed
GET /v1/reservations/HF-2612-0042
```

Seules les réservations de l'établissement de la clé sont visibles (500 au plus par
appel). Les coordonnées du client ne sont pas renvoyées, seulement son nom.

### Erreurs

| Code | Cas |
|---|---|
| 400 | Paramètre manquant ou invalide |
| 401 | Clé absente, inconnue ou révoquée |
| 403 | Portée manquante |
| 404 | Route ou réservation inconnue |
| 409 | Plus de disponibilité, chambre bloquée, données refusées |
| 429 | Limite de débit atteinte |

Corps : `{ "error": "message en français" }`.

## Webhooks

Déclarer une URL **HTTPS publique** dans **Paramètres → Distribution → Webhooks** et
choisir les événements. Le secret de signature (`whsec_…`) n'est affiché qu'une fois.

| Événement | Quand |
|---|---|
| `reservation.created` | Nouvelle réservation (réception, site, API, iCal) |
| `reservation.confirmed` | Option confirmée (paiement en ligne reçu, confirmation manuelle) |
| `reservation.updated` | Dates, chambre, montant ou nombre de personnes modifiés |
| `reservation.cancelled` | Annulation ou option expirée sans paiement |
| `reservation.checked_in` / `reservation.checked_out` | Arrivée / départ du client |
| `reservation.no_show` | Client non présenté |
| `payment.received` | Encaissement enregistré (caisse ou paiement en ligne) |
| `*` | Tous les événements |

Envoi : `POST` JSON, toutes les deux minutes au plus tard.

```
X-PMS-Event: reservation.created
X-PMS-Delivery: 6c2e…            (identifiant unique, à utiliser pour dédoublonner)
X-PMS-Signature: t=1791117846,v1=5d41402abc4b2a76b9719d911017c592…
```

```json
{ "id": "6c2e…", "event": "reservation.created", "created_at": "2026-10-04T12:00:00Z",
  "data": { "reservation_id": "…", "code": "HF-2612-0042", "status": "confirmed", "room": "B1",
            "check_in": "2026-12-20", "check_out": "2026-12-23", "adults": 2, "children": 0,
            "total_amount": 126000, "currency": "XOF", "source": "api", "guest_name": "Awa Ndiaye" } }
```

### Vérifier la signature

`v1` = HMAC-SHA256, clé = secret du webhook, message = `"{t}.{corps brut}"`, en
hexadécimal. Rejeter les messages dont `t` a plus de 5 minutes.

```js
import crypto from 'node:crypto';

function verify(rawBody, header, secret) {
  const { t, v1 } = Object.fromEntries(header.split(',').map((p) => p.split('=')));
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
}
```

Répondre `2xx` en moins de 10 secondes. Sinon nouvel essai avec délai croissant
(2 min, 4, 8, 16… jusqu'à 8 tentatives), puis l'envoi passe en échec, visible dans
l'historique de l'écran Distribution. Les redirections ne sont pas suivies, les
adresses internes (localhost, réseaux privés) sont refusées.

## Calendriers iCal

Pour les plateformes sans API ouverte (Airbnb, Booking.com en hébergement
indépendant, Abritel, Google Agenda) : **Paramètres → Distribution → iCal**.

- **Export** : une URL par chambre, à coller dans la plateforme. Elle ne contient que
  les dates indisponibles (« Indisponible » ou « Hors service »), jamais le nom du
  client. Garder l'URL privée : elle vaut jeton d'accès.
- **Import** : l'URL iCal fournie par la plateforme. Synchronisée toutes les 30
  minutes ; chaque séjour devient une réservation confirmée (provenance de la
  plateforme). Un séjour retiré du calendrier est annulé. Si la chambre est déjà
  prise sur ces dates, le séjour n'est pas créé et le conflit est affiché sur le flux.

L'iCal est un protocole lent (délai de 30 minutes côté PMS, souvent plusieurs heures
côté plateformes) : le risque de double réservation n'est pas nul. Un channel manager
en temps réel (Cloudbeds, SiteMinder) reste préférable au-delà de quelques chambres.
