import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

export type Lang = 'fr' | 'en';

// Libellés de l'ossature (menu, en-tête, connexion, compte), par clé.
// Les écrans métier traduisent en ligne : tr('Réservations', 'Reservations').
const dict = {
  'nav.reception': { fr: 'Console Réception', en: 'Front desk' },
  'nav.dashboard': { fr: 'Tableau de bord', en: 'Dashboard' },
  'nav.rack': { fr: 'Planning chambres', en: 'Room rack' },
  'nav.bookings': { fr: 'Réservations', en: 'Reservations' },
  'nav.guests': { fr: 'Clients', en: 'Guests' },
  'nav.rooms': { fr: 'Chambres', en: 'Rooms' },
  'nav.housekeeping': { fr: 'Ménage', en: 'Housekeeping' },
  'nav.maintenance': { fr: 'Maintenance', en: 'Maintenance' },
  'nav.finance': { fr: 'Caisse & Finance', en: 'Cashier & finance' },
  'nav.analytics': { fr: 'Statistiques', en: 'Analytics' },
  'nav.communications': { fr: 'Communications', en: 'Messages' },
  'nav.hotels': { fr: 'Établissements', en: 'Properties' },
  'nav.team': { fr: 'Équipe & Accès', en: 'Team & access' },
  'nav.settings': { fr: 'Paramètres & Tarifs', en: 'Settings & rates' },
  'nav.audit': { fr: 'Journal d’audit', en: 'Audit log' },
  'nav.account': { fr: 'Mon compte', en: 'My account' },
  'shell.property': { fr: 'Établissement actif', en: 'Current property' },
  'shell.role': { fr: 'Votre rôle', en: 'Your role' },
  'shell.lock': { fr: 'Verrouiller', en: 'Lock' },
  'shell.signout': { fr: 'Déconnexion', en: 'Sign out' },
  'shell.hello': { fr: 'Bonjour', en: 'Hello' },
  'shell.search': { fr: 'Filtrer les chambres (numéro, client, type)…', en: 'Filter rooms (number, guest, type)…' },
  'shell.offline': {
    fr: 'Hors ligne : affichage de la dernière copie enregistrée, en lecture seule.',
    en: 'Offline: showing the last saved copy, read-only.',
  },
  'shell.staging': { fr: 'Préproduction', en: 'Staging' },
  'login.signin': { fr: 'Connexion', en: 'Sign in' },
  'login.signup': { fr: 'Créer un compte', en: 'Create an account' },
  'login.reset': { fr: 'Mot de passe oublié', en: 'Forgot password' },
  'login.subtitle': { fr: 'Système de gestion hôtelière', en: 'Hotel management system' },
  'login.email': { fr: 'Adresse e-mail', en: 'Email address' },
  'login.password': { fr: 'Mot de passe', en: 'Password' },
  'login.fullname': { fr: 'Nom complet', en: 'Full name' },
  'login.submit.signin': { fr: 'Se connecter', en: 'Sign in' },
  'login.submit.signup': { fr: 'Créer le compte', en: 'Create account' },
  'login.submit.reset': { fr: 'Envoyer le lien', en: 'Send link' },
  'login.have_account': { fr: 'J’ai déjà un compte', en: 'I already have an account' },
  'login.forgot': { fr: 'Mot de passe oublié ?', en: 'Forgot password?' },
  'mfa.title': { fr: 'Double authentification', en: 'Two-factor authentication' },
  'mfa.prompt': { fr: 'Code à 6 chiffres de votre application', en: '6-digit code from your app' },
  'mfa.verify': { fr: 'Vérifier', en: 'Verify' },
} satisfies Record<string, Record<Lang, string>>;

export type MessageKey = keyof typeof dict;

interface I18n {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: MessageKey) => string;
  // Traduction en ligne : le français d'abord, l'anglais ensuite.
  tr: (fr: string, en: string) => string;
}

// Langue courante, lisible hors des composants (libellés, messages d'erreur).
let current: Lang = 'fr';
export const currentLang = (): Lang => current;
export const tr = (fr: string, en: string): string => (current === 'en' ? en : fr);

// Table de libellés bilingue dont la lecture suit la langue courante :
// STATUS_LABELS[status] renvoie le français ou l'anglais selon le choix.
export function bilingual<K extends string>(labels: Record<K, readonly [fr: string, en: string]>): Record<K, string> {
  const out = {} as Record<K, string>;
  for (const key of Object.keys(labels) as K[]) {
    Object.defineProperty(out, key, { enumerable: true, get: () => labels[key][current === 'en' ? 1 : 0] });
  }
  return out;
}

const I18nContext = createContext<I18n | null>(null);

function initialLang(): Lang {
  try {
    const stored = localStorage.getItem('pms.lang');
    if (stored === 'fr' || stored === 'en') return stored;
  } catch {
    /* stockage indisponible */
  }
  return navigator.language?.startsWith('en') ? 'en' : 'fr';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => (current = initialLang()));
  const setLang = useCallback((l: Lang) => {
    current = l;
    setLangState(l);
    document.documentElement.lang = l;
    try {
      localStorage.setItem('pms.lang', l);
    } catch {
      /* stockage indisponible */
    }
  }, []);
  current = lang;
  const t = useCallback((key: MessageKey) => dict[key][lang], [lang]);
  const trLang = useCallback((fr: string, en: string) => (lang === 'en' ? en : fr), [lang]);
  // App lit ce contexte : un changement de langue redessine tout l'arbre,
  // y compris les composants qui n'utilisent que les tables de libellés.
  return <I18nContext.Provider value={{ lang, setLang, t, tr: trLang }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n doit être utilisé sous <I18nProvider>');
  return ctx;
}
