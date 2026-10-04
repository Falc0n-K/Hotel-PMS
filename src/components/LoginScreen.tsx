import React, { useState } from 'react';
import { KeyRound, Mail, User, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase, supabaseConfigured, errorMessage } from '../lib/supabase';

type Mode = 'signin' | 'signup' | 'reset';

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === 'signup') {
        if (password.length < 10) throw new Error('Le mot de passe doit contenir au moins 10 caractères.');
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName.trim() }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) setInfo('Compte créé. Confirmez votre adresse via le lien reçu par e-mail, puis connectez-vous.');
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
        if (error) throw error;
        setInfo('Si un compte existe pour cette adresse, un lien de réinitialisation vient d’être envoyé.');
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const titles: Record<Mode, string> = {
    signin: 'Connexion',
    signup: 'Créer un compte',
    reset: 'Mot de passe oublié',
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-xl border border-slate-100 p-8">
        <div className="text-center mb-6">
          <div className="inline-flex bg-orange-600 font-extrabold text-white text-sm px-4 py-2 rounded-xl shadow-md shadow-orange-500/10">
            SÉNÉGAL HÔTELS
          </div>
          <h1 className="text-lg font-extrabold text-slate-950 mt-4">{titles[mode]}</h1>
          <p className="text-xs text-slate-500 mt-1">Système de gestion hôtelière</p>
        </div>

        {!supabaseConfigured && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-[11px] font-semibold rounded-xl flex gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              Configuration manquante : VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY ne sont pas définies pour ce
              déploiement.
            </span>
          </div>
        )}

        <form onSubmit={submit} className="space-y-3">
          {mode === 'signup' && (
            <Field icon={User} type="text" placeholder="Nom complet" value={fullName} onChange={setFullName} required autoComplete="name" />
          )}
          <Field icon={Mail} type="email" placeholder="Adresse e-mail" value={email} onChange={setEmail} required autoComplete="email" />
          {mode !== 'reset' && (
            <Field
              icon={KeyRound}
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={setPassword}
              required
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
          )}

          {error && (
            <div role="alert" className="flex gap-2 p-2.5 bg-red-50 text-red-600 text-[11px] font-bold rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {info && (
            <div role="status" className="flex gap-2 p-2.5 bg-emerald-50 text-emerald-700 text-[11px] font-bold rounded-lg">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{info}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={busy || !supabaseConfigured}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === 'signin' ? 'Se connecter' : mode === 'signup' ? 'Créer le compte' : 'Envoyer le lien'}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col gap-2 text-[11px] text-center">
          {mode !== 'signin' && (
            <button className="text-orange-600 font-semibold cursor-pointer" onClick={() => setMode('signin')}>
              J’ai déjà un compte
            </button>
          )}
          {mode === 'signin' && (
            <>
              <button className="text-orange-600 font-semibold cursor-pointer" onClick={() => setMode('reset')}>
                Mot de passe oublié ?
              </button>
              <button className="text-slate-500 cursor-pointer" onClick={() => setMode('signup')}>
                Créer un compte
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  icon: Icon,
  onChange,
  ...props
}: {
  icon: React.ComponentType<{ className?: string }>;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'>) {
  return (
    <div className="relative">
      <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <input
        {...props}
        aria-label={props.placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800"
      />
    </div>
  );
}

// Affiché après le clic sur le lien de réinitialisation reçu par e-mail.
export function NewPasswordScreen({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 10) {
      setError('Le mot de passe doit contenir au moins 10 caractères.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setError(errorMessage(error));
    else onDone();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <form onSubmit={submit} className="bg-white w-full max-w-sm rounded-3xl shadow-xl border border-slate-100 p-8 space-y-3">
        <h1 className="text-lg font-extrabold text-slate-950">Nouveau mot de passe</h1>
        <Field icon={KeyRound} type="password" placeholder="Nouveau mot de passe" value={password} onChange={setPassword} required autoComplete="new-password" />
        {error && (
          <div role="alert" className="flex gap-2 p-2.5 bg-red-50 text-red-600 text-[11px] font-bold rounded-lg">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <button type="submit" disabled={busy} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl text-xs disabled:opacity-50 cursor-pointer">
          Enregistrer
        </button>
      </form>
    </div>
  );
}

// Deuxième étape de connexion quand le compte a une double authentification.
export function MfaChallengeScreen() {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { data } = await supabase.auth.mfa.listFactors();
    const factor = data?.totp.find((f) => f.status === 'verified');
    if (!factor) {
      setBusy(false);
      setError('Aucune application d’authentification trouvée sur ce compte.');
      return;
    }
    const { error: err } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: code.trim() });
    setBusy(false);
    if (err) setError('Code incorrect ou expiré.');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <form onSubmit={submit} className="bg-white w-full max-w-sm rounded-3xl shadow-xl border border-slate-100 p-8 space-y-3">
        <h1 className="text-lg font-extrabold text-slate-950">Double authentification</h1>
        <p className="text-xs text-slate-500">Saisissez le code à 6 chiffres affiché par votre application.</p>
        <Field icon={KeyRound} type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" value={code} onChange={(v) => setCode(v.replace(/\D/g, ''))} required autoFocus />
        {error && (
          <div role="alert" className="flex gap-2 p-2.5 bg-red-50 text-red-600 text-[11px] font-bold rounded-lg">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <button type="submit" disabled={busy || code.length !== 6} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl text-xs disabled:opacity-50 cursor-pointer">
          Vérifier
        </button>
        <button type="button" onClick={() => supabase.auth.signOut()} className="w-full text-[11px] text-slate-500 cursor-pointer">
          Se déconnecter
        </button>
      </form>
    </div>
  );
}
