import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App.tsx';
import { AuthProvider } from './lib/auth';
import { I18nProvider } from './lib/i18n';
import './index.css';

// Suivi des erreurs, actif seulement si un DSN est configuré (Vercel).
// Aucune donnée saisie n'est envoyée : pas de replay, pas d'en-têtes.
const dsn = import.meta.env.VITE_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_APP_ENV ?? 'production',
    sendDefaultPii: false,
    tracesSampleRate: 0,
  });
}

function Crash() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center font-sans">
      <div>
        <p className="font-bold text-slate-800">Une erreur inattendue s’est produite.</p>
        <button onClick={() => window.location.reload()} className="mt-3 text-sm font-bold text-orange-600 cursor-pointer">Recharger</button>
      </div>
    </div>
  );
}

// Page publique de réservation : servie sans authentification ni données internes.
const PublicBooking = lazy(() => import('./components/PublicBooking'));
const publicSlug = window.location.pathname.match(/^\/reserver\/([a-z0-9-]{3,40})\/?$/)?.[1];

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<Crash />}>
      <I18nProvider>
        {publicSlug ? (
          <Suspense fallback={null}>
            <PublicBooking slug={publicSlug} />
          </Suspense>
        ) : (
          <AuthProvider>
            <App />
          </AuthProvider>
        )}
      </I18nProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>,
);
