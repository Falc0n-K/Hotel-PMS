-- Nouvelles provenances de réservation (séparé : une valeur d'enum ajoutée
-- n'est utilisable qu'après validation de la transaction qui l'ajoute).
alter type public.booking_source add value if not exists 'website';
alter type public.booking_source add value if not exists 'api';
