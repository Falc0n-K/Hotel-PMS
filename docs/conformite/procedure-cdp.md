# Formalités auprès de la CDP (projet)

> Projet à valider par un conseil : les formulaires, seuils et délais ci-dessous sont à
> confirmer auprès de la Commission de Protection des Données Personnelles (www.cdp.sn),
> qui publie ses formulaires et répond aux demandes de renseignement. Le cadre légal est en
> cours de révision.

## Principe

Sous la loi n° 2008-12, tout traitement de données personnelles fait l'objet d'une
formalité préalable auprès de la CDP : **déclaration** pour les traitements courants,
**demande d'autorisation** pour les traitements plus sensibles, dont certains transferts
de données vers un pays tiers. La formalité est accomplie par le **responsable de
traitement**, donc :

- par **chaque hôtel** pour ses clients et son personnel ;
- par **l'éditeur** pour ses propres clients (abonnements) et ses traitements techniques.

## Ce que l'éditeur fournit aux hôtels

Un dossier type, à joindre à leur formalité :

1. la description du logiciel et de ses mesures de sécurité (`docs/securite.md`) ;
2. le registre des traitements pré-rempli (`registre-des-traitements.md`, fiches 1 à 5) ;
3. la liste des sous-traitants et des pays de destination (accord de sous-traitance,
   annexe 1) ;
4. le modèle de politique de confidentialité.

## Étapes pour un hôtel

1. **Désigner** un contact « données personnelles » (souvent le directeur).
2. **Compléter** le registre (fiches 1 à 5) : durées de conservation choisies, personnel
   habilité, nom des prestataires effectivement activés (paiement, SMS…).
3. **Déposer** auprès de la CDP la formalité couvrant la gestion de la clientèle et la
   fiche de police (en général une déclaration ; vérifier si la collecte de la pièce
   d'identité ou le transfert hors du Sénégal impose une demande d'autorisation).
4. **Demander l'autorisation de transfert** vers l'Union européenne (hébergement) et les
   États-Unis (e-mails, SMS, carte bancaire) si la CDP l'exige pour ces pays, en joignant
   les accords de protection des données (DPA) des prestataires.
5. **Attendre** le récépissé ou l'autorisation avant de traiter les données des clients
   dans le logiciel en production.
6. **Informer** les clients : politique de confidentialité publiée et liée depuis la page
   de réservation ; mention à l'accueil ; information du personnel sur le journal
   d'audit.
7. **Régler** dans le logiciel la durée de conservation (Paramètres → Notifications et
   sécurité) et activer la double authentification obligatoire pour la direction.

## Étapes pour l'éditeur

1. Formalité pour la gestion des abonnés et les traitements techniques (fiches 6 et 7).
2. Formalité ou autorisation de transfert pour l'hébergement dans l'Union européenne.
3. Signature des DPA avec chaque prestataire (Supabase, Vercel, Resend, Twilio, Stripe,
   Sentry, Cloudflare) et archivage.
4. Accord de sous-traitance signé avec chaque hôtel avant la mise en service.
5. Tenue d'un registre des incidents de sécurité.

## Calendrier conseillé

| Quand | Quoi |
|---|---|
| Avant le premier hôtel pilote | Validation des documents par le conseil ; DPA prestataires ; formalités de l'éditeur |
| À la signature de chaque hôtel | Accord de sous-traitance ; dossier type remis à l'hôtel |
| Avant l'ouverture en production de l'hôtel | Récépissé ou autorisation CDP de l'hôtel |
| Chaque année | Revue du registre, des sous-traitants et des durées ; test de restauration |

## Données à ne pas collecter

Le logiciel ne prévoit aucun champ pour des données sensibles (santé, religion, opinions,
origine ethnique). Les zones de texte libre (« notes », « demande particulière ») ne
doivent pas en recevoir : à rappeler au personnel lors de la formation.
