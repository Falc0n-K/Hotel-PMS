import { createClient } from '@supabase/supabase-js';
import { tr } from './i18n';

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
  if (!error) return tr('Erreur inconnue', 'Unknown error');
  const e = error as { message?: string; code?: string };
  if (e.code === '42501') return e.message || tr('Droits insuffisants.', 'Insufficient permissions.');
  if (e.message === 'Invalid login credentials') return tr('E-mail ou mot de passe incorrect.', 'Incorrect email or password.');
  if (e.message === 'Email not confirmed') return tr('Adresse e-mail non confirmée : ouvrez le lien reçu par e-mail.', 'Email address not confirmed: open the link sent by email.');
  if (e.message?.includes('row-level security')) return tr('Action non autorisée pour votre rôle.', 'Action not allowed for your role.');
  if (e.message === 'Failed to fetch') return tr('Serveur injoignable : vérifiez la connexion internet.', 'Server unreachable: check the internet connection.');
  if (e.message?.includes('duplicate key')) return tr('Cet élément existe déjà.', 'This item already exists.');
  return e.message || tr('Erreur inconnue', 'Unknown error');
}
