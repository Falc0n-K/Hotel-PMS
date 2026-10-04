# Conformité données personnelles (Sénégal)

> **Projets à faire valider par un avocat ou un conseil inscrit auprès de la CDP.**
> Ces documents décrivent fidèlement le logiciel tel qu'il est construit, mais ne
> constituent pas un avis juridique. Le cadre légal sénégalais est en cours de révision :
> vérifier le texte en vigueur avant toute démarche.

Cadre : loi n° 2008-12 du 25 janvier 2008 sur la protection des données à caractère
personnel et son décret d'application n° 2008-721 du 30 juin 2008. Autorité de contrôle :
Commission de Protection des Données Personnelles (CDP), www.cdp.sn.

## Qui est responsable de quoi

| Données | Responsable de traitement | Rôle de l'éditeur du PMS |
|---|---|---|
| Clients de l'hôtel (réservations, fiche de police, paiements) | **L'hôtel** | Sous-traitant |
| Comptes du personnel de l'hôtel | L'hôtel | Sous-traitant |
| Comptes des clients du SaaS (propriétaires, facturation de l'abonnement) | **L'éditeur** | Responsable |
| Journaux techniques, sécurité, suivi d'erreurs | L'éditeur | Responsable |

## Documents

| Fichier | Pour qui | Usage |
|---|---|---|
| [`registre-des-traitements.md`](registre-des-traitements.md) | Éditeur et chaque hôtel | Recense les traitements, finalités, durées, destinataires, transferts |
| [`politique-de-confidentialite.md`](politique-de-confidentialite.md) | Clients des hôtels | À publier sur le site de l'hôtel et à lier depuis la page de réservation |
| [`accord-sous-traitance.md`](accord-sous-traitance.md) | Contrat éditeur ↔ hôtel | Annexe obligatoire au contrat d'abonnement |
| [`procedure-cdp.md`](procedure-cdp.md) | Éditeur et hôtels | Formalités auprès de la CDP, transferts hors du Sénégal |

## Ce que le logiciel fait déjà

- Cloisonnement strict entre établissements (RLS PostgreSQL, testé automatiquement).
- Droits par rôle : seule la direction exporte les clients ou les anonymise.
- Double authentification exigible pour la direction et la comptabilité.
- Journal d'audit non modifiable de toutes les créations, modifications et exports.
- Durée de conservation réglable par établissement, anonymisation des fiches clients
  (sauf séjour en cours ou à venir), en conservant les montants comptables.
- Consentement explicite sur la page de réservation en ligne ; consentement marketing
  séparé (`marketing_consent`), désactivé par défaut.
- Export iCal sans aucune donnée personnelle ; API partenaires limitée au nom du client.
- Chiffrement en transit (HTTPS) et au repos (stockage Supabase).
- Suivi d'erreurs Sentry sans données saisies ni en-têtes (`sendDefaultPii: false`).

## Reste à faire (hors logiciel)

1. Valider ces documents avec un conseil.
2. Déposer les formalités auprès de la CDP (voir `procedure-cdp.md`), y compris la
   demande d'autorisation de transfert vers l'Union européenne et les États-Unis.
3. Signer l'accord de sous-traitance avec chaque hôtel.
4. Publier la politique de confidentialité et ajouter son lien sur la page de
   réservation (champ « Présentation » ou pied de page).
5. Désigner un contact « données personnelles » chez l'éditeur et dans chaque hôtel.
6. Prévoir une procédure interne de gestion des incidents (voir l'accord de
   sous-traitance, article 8).
7. Purge automatique : aujourd'hui l'anonymisation est manuelle (écran Clients). Une
   tâche planifiée appliquant `guest_retention_months` est recommandée une fois la
   durée validée.
