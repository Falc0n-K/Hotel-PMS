# Accord de sous-traitance de données personnelles (modèle)

> Projet à faire valider par un conseil. Annexe au contrat d'abonnement au logiciel de
> gestion hôtelière. Les champs entre crochets sont à compléter.

**Entre** [raison sociale de l'hôtel], [adresse], NINEA [numéro], représenté par [nom,
fonction], ci-après « le Responsable de traitement »,

**et** [raison sociale de l'éditeur], [adresse], NINEA [numéro], représenté par [nom,
fonction], ci-après « le Sous-traitant ».

## Article 1 — Objet

Le Sous-traitant fournit au Responsable de traitement un logiciel de gestion hôtelière en
ligne (PMS). À ce titre, il traite pour son compte les données personnelles décrites à
l'article 2, conformément à la loi n° 2008-12 du 25 janvier 2008 et à ses textes
d'application.

## Article 2 — Description du traitement

| | |
|---|---|
| Nature | Hébergement, stockage, consultation, modification, transmission (e-mails, SMS, paiements, partenaires de distribution configurés par l'hôtel) |
| Finalités | Gestion des réservations, des séjours, de la fiche de police, des paiements, de la facturation et du personnel de l'hôtel |
| Personnes concernées | Clients de l'hôtel, personnel de l'hôtel |
| Données | Identité et coordonnées ; données de séjour ; données de la fiche de police (dont pièce d'identité) ; montants et références de paiement (jamais les numéros de carte) ; comptes et actions du personnel |
| Durée | Durée du contrat, puis restitution et suppression selon l'article 11 |

## Article 3 — Instructions

Le Sous-traitant ne traite les données que sur instruction documentée du Responsable de
traitement, constituée par le contrat, le présent accord et les réglages effectués par
l'hôtel dans le logiciel. Il informe le Responsable de traitement s'il estime qu'une
instruction est contraire à la loi.

## Article 4 — Confidentialité

Les personnes autorisées à accéder aux données chez le Sous-traitant sont soumises à une
obligation de confidentialité. Le Sous-traitant n'accède aux données d'un établissement
qu'à la demande de celui-ci (support) ou pour la sécurité du service, et chaque accès est
tracé.

## Article 5 — Sécurité

Le Sous-traitant met en œuvre au minimum :

- le cloisonnement des données par établissement au niveau de la base de données ;
- des droits d'accès par rôle définis par le Responsable de traitement ;
- la double authentification, exigible par le Responsable de traitement ;
- le chiffrement des communications (HTTPS) et du stockage ;
- un journal d'audit non modifiable des opérations ;
- des sauvegardes régulières et un plan de restauration testé ;
- la revue de sécurité du logiciel avant chaque mise en production importante.

## Article 6 — Sous-traitants ultérieurs

Le Responsable de traitement autorise le recours aux sous-traitants ultérieurs listés en
annexe 1. Le Sous-traitant informe le Responsable de traitement de tout ajout ou
remplacement au moins 30 jours à l'avance ; celui-ci peut s'y opposer et, à défaut
d'accord, résilier sans pénalité. Le Sous-traitant impose à ses sous-traitants ultérieurs
des obligations équivalentes.

## Article 7 — Transferts hors du Sénégal

Les données sont hébergées dans l'Union européenne et certains prestataires sont établis
aux États-Unis (annexe 1). Le Sous-traitant accomplit auprès de la CDP les formalités
relatives aux transferts qui lui incombent et fournit au Responsable de traitement les
éléments nécessaires aux siennes.

## Article 8 — Violation de données

Le Sous-traitant notifie au Responsable de traitement toute violation de données
personnelles dans un délai de 48 heures après en avoir pris connaissance, avec : la nature
de la violation, les catégories et le nombre approximatif de personnes et de données
concernées, les conséquences probables et les mesures prises ou proposées. Il assiste le
Responsable de traitement dans ses éventuelles notifications à la CDP et aux personnes.

## Article 9 — Droits des personnes

Le logiciel permet au Responsable de traitement de consulter, corriger, exporter et
anonymiser les données d'un client. Le Sous-traitant transmet sans délai toute demande
reçue directement d'une personne concernée et assiste le Responsable de traitement pour y
répondre.

## Article 10 — Audit

Le Sous-traitant met à disposition la documentation de sécurité (dont `docs/securite.md`)
et répond aux questionnaires raisonnables du Responsable de traitement. Un audit sur
place, à la charge du Responsable de traitement, est possible une fois par an avec un
préavis de 30 jours.

## Article 11 — Fin du contrat

À la fin du contrat, le Sous-traitant met à disposition un export complet des données
(format CSV) pendant 30 jours, puis les supprime de la base active dans les 30 jours
suivants, et des sauvegardes à l'expiration de leur cycle de rétention (au plus 90 jours),
sauf obligation légale de conservation. Il confirme la suppression par écrit.

## Article 12 — Responsabilité

Chaque partie répond des manquements qui lui sont imputables. [Clause de limitation à
rédiger avec le conseil, cohérente avec le contrat d'abonnement.]

---

Fait à [ville], le [date], en deux exemplaires.

| Le Responsable de traitement | Le Sous-traitant |
|---|---|
| | |

---

## Annexe 1 — Sous-traitants ultérieurs

| Prestataire | Service | Localisation |
|---|---|---|
| Supabase Inc. | Base de données, authentification, fonctions serveur | Union européenne (Irlande) |
| Vercel Inc. | Hébergement de l'application web | Mondial (CDN), États-Unis |
| Resend | E-mails transactionnels | États-Unis |
| Twilio Inc. | SMS et WhatsApp | États-Unis |
| Stripe | Paiement par carte (si activé par l'hôtel) | États-Unis / UE |
| PayDunya | Paiement mobile (si activé par l'hôtel) | Sénégal |
| Functional Software Inc. (Sentry) | Suivi d'erreurs techniques, sans données saisies | États-Unis / UE |
| Cloudflare Inc. | Captcha du moteur de réservation | Mondial |
