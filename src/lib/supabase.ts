import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = Boolean(url && anonKey);

// La clé anon est publique par conception : la sécurité repose sur la RLS.
// Sans configuration, on crée quand même un client (les appels échoueront)
// pour que l'écran de connexion puisse afficher un message clair.
export const supabase = createClient(url ?? 'http://localhost', anonKey ?? 'missing', {
  auth: { persistSession: true, autoRefreshToken: true },
});

// Messages d'erreur Postgres et Supabase Auth rendus lisibles pour l'utilisateur.
export function errorMessage(error: unknown): string {
  if (!error) return 'Erreur inconnue';
  const e = error as { message?: string; code?: string };
  if (e.code === '42501') return e.message || 'Droits insuffisants.';
  if (e.message === 'Invalid login credentials') return 'E-mail ou mot de passe incorrect.';
  if (e.message === 'Email not confirmed') return 'Adresse e-mail non confirmée : ouvrez le lien reçu par e-mail.';
  if (e.message?.includes('row-level security')) return 'Action non autorisée pour votre rôle.';
  if (e.message === 'Failed to fetch') return 'Serveur injoignable : vérifiez la connexion internet.';
  if (e.message?.includes('duplicate key')) return 'Cet élément existe déjà.';
  return e.message || 'Erreur inconnue';
}
