# Registre des traitements (projet)

> Projet à valider par un conseil. Chaque hôtel tient son propre registre pour les
> traitements dont il est responsable (fiches 1 à 5) ; l'éditeur tient le sien (fiches 6
> et 7). Les durées indiquées sont des propositions.

## Hébergeurs et prestataires (communs à toutes les fiches)

| Prestataire | Rôle | Localisation des données | Garanties à vérifier |
|---|---|---|---|
| Supabase Inc. | Base de données, authentification, fonctions serveur | Union européenne (Irlande, région `eu-west-1`) | DPA Supabase, clauses contractuelles types |
| Vercel Inc. | Hébergement de l'application web (aucune donnée client stockée) | Mondial (CDN), journaux aux États-Unis | DPA Vercel |
| PayDunya (PayDunya SAS) | Paiement mobile (Wave, Orange Money) | Sénégal | Contrat marchand |
| Stripe | Paiement par carte | États-Unis / UE | DPA Stripe, certification PCI-DSS |
| Resend | Envoi des e-mails | États-Unis | DPA Resend |
| Twilio | SMS et WhatsApp | États-Unis | DPA Twilio |
| Sentry (Functional Software Inc.) | Suivi d'erreurs techniques (sans données saisies) | États-Unis ou UE selon le compte | DPA Sentry |
| Cloudflare | Captcha Turnstile du moteur de réservation | Mondial | DPA Cloudflare |

---

## 1. Gestion des réservations et des séjours — *responsable : l'hôtel*

| | |
|---|---|
| Finalité | Réserver, accueillir et facturer les clients ; gérer le planning des chambres |
| Base légale | Exécution du contrat d'hébergement |
| Personnes concernées | Clients, accompagnants (nombre seulement) |
| Données | Nom, e-mail, téléphone, dates de séjour, chambre, nombre de personnes, préférences et demandes particulières, statut VIP, historique de séjours |
| Destinataires | Personnel habilité de l'hôtel selon son rôle ; partenaires de distribution pour les réservations qu'ils ont apportées (nom seulement) |
| Durée | Durée du séjour puis `guest_retention_months` (36 mois proposés) après le dernier séjour, puis anonymisation |
| Transferts hors Sénégal | Oui (hébergement UE ; e-mails/SMS États-Unis) |
| Sécurité | RLS par établissement, rôles, double authentification, journal d'audit |

## 2. Fiche de police (registre des voyageurs) — *responsable : l'hôtel*

| | |
|---|---|
| Finalité | Obligation légale de tenue du registre des voyageurs et de transmission aux autorités |
| Base légale | Obligation légale (réglementation des établissements d'hébergement — **référence exacte à faire préciser par le conseil**) |
| Données | Nom, date et lieu de naissance, nationalité, profession, adresse et pays de résidence, type, numéro et date d'expiration de la pièce d'identité, provenance et destination |
| Destinataires | Réception, direction ; autorités de police sur réquisition |
| Durée | Durée imposée par la réglementation (**à préciser**) puis anonymisation |
| Point d'attention | Le numéro de pièce d'identité est une donnée à protéger particulièrement : accès limité aux rôles réception et direction |

## 3. Paiements et facturation — *responsable : l'hôtel*

| | |
|---|---|
| Finalité | Encaisser, facturer, tenir la comptabilité (SYSCOHADA) |
| Base légale | Contrat ; obligations comptables et fiscales |
| Données | Montants, moyen de paiement, référence de transaction, factures et avoirs (nom du client, NINEA de l'hôtel) |
| Non collecté | Numéros de carte : saisis uniquement chez Stripe ou PayDunya, jamais dans le PMS |
| Destinataires | Direction, comptabilité, auditeur ; administration fiscale |
| Durée | 10 ans pour les pièces comptables (Acte uniforme OHADA relatif au droit comptable). Les montants restent après anonymisation du client |

## 4. Messages aux clients — *responsable : l'hôtel*

| | |
|---|---|
| Finalité | Confirmation, annulation, rappel la veille de l'arrivée |
| Base légale | Exécution du contrat |
| Données | Nom, e-mail, téléphone, dates, référence |
| Destinataires | Resend (e-mail), Twilio (SMS, WhatsApp) |
| Durée | Journal d'envoi conservé 12 mois (proposé) |
| Marketing | Hors périmètre actuel ; toute prospection exige le consentement `marketing_consent` |

## 5. Comptes du personnel et journal d'audit — *responsable : l'hôtel*

| | |
|---|---|
| Finalité | Contrôle d'accès, traçabilité des opérations (caisse, factures, exports) |
| Base légale | Intérêt légitime (sécurité, prévention de la fraude) ; obligations comptables |
| Données | Nom, e-mail, rôle, facteur de double authentification, actions horodatées |
| Destinataires | Direction de l'hôtel ; éditeur pour le support (sur demande) |
| Durée | Compte : durée d'emploi. Journal d'audit : 10 ans pour les opérations comptables, 3 ans pour le reste (proposé) |
| Information | Le personnel doit être informé de l'existence du journal d'audit |

## 6. Clients du SaaS et abonnements — *responsable : l'éditeur*

| | |
|---|---|
| Finalité | Création de compte, facturation de l'abonnement, support |
| Base légale | Contrat |
| Données | Nom, e-mail, organisation, établissements, échanges de support |
| Durée | Durée du contrat + 5 ans (prescription commerciale, proposé) ; pièces comptables 10 ans |

## 7. Sécurité et exploitation technique — *responsable : l'éditeur*

| | |
|---|---|
| Finalité | Disponibilité, sécurité, correction des erreurs, limitation des abus |
| Base légale | Intérêt légitime |
| Données | Journaux techniques (Supabase, Vercel), erreurs applicatives sans données saisies (Sentry), empreinte hachée de l'adresse IP pour la limitation de débit du moteur de réservation |
| Durée | Journaux : 90 jours maximum (selon les plans des hébergeurs) ; limitation de débit : 24 heures |
