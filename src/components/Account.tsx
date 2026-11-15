import React, { useState } from 'react';
import { ShieldCheck, Trash2, KeyRound, Languages } from 'lucide-react';
import { supabase, errorMessage } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';
import { useQuery } from '../lib/query';
import { Badge, Button, Card, ErrorNote, Field, Input, PageHeader, Select, useAction } from './ui';

// Compte de l'utilisateur : double authentification (TOTP), mot de passe, langue.
export default function Account() {
  const { session, aal, refreshAal } = useAuth();
  const { lang, setLang, t, tr } = useI18n();
  const { busy, error, setError, run: act } = useAction();
  const [enrolling, setEnrolling] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const factors = useQuery(async () => {
    const { data, error: err } = await supabase.auth.mfa.listFactors();
    if (err) throw new Error(errorMessage(err));
    return data.totp;
  }, [session?.user.id]);

  const verified = (factors.data ?? []).filter((f) => f.status === 'verified');

  const startEnroll = () =>
    act(async () => {
      // Un facteur non vérifié laissé par une tentative précédente bloque l'inscription.
      for (const f of (factors.data ?? []).filter((x) => x.status !== 'verified')) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error: err } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `PMS ${new Date().toISOString().slice(0, 10)}` });
      if (err) throw new Error(errorMessage(err));
      setEnrolling({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    });

  const confirmEnroll = (e: React.FormEvent) => {
    e.preventDefault();
    act(async () => {
      const { error: err } = await supabase.auth.mfa.challengeAndVerify({ factorId: enrolling!.id, code: code.trim() });
      if (err) throw new Error(tr('Code incorrect ou expiré.', 'Incorrect or expired code.'));
      setEnrolling(null);
      setCode('');
      await refreshAal();
      await factors.reload();
      setMessage(tr('Double authentification activée.', 'Two-factor authentication enabled.'));
    });
  };

  const remove = (id: string) =>
    confirm(tr('Désactiver la double authentification sur ce compte ?', 'Disable two-factor authentication on this account?')) &&
    act(async () => {
      const { error: err } = await supabase.auth.mfa.unenroll({ factorId: id });
      if (err) throw new Error(errorMessage(err));
      await refreshAal();
      await factors.reload();
    });

  const changePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 10) return setError(tr('Au moins 10 caractères.', 'At least 10 characters.'));
    act(async () => {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw new Error(errorMessage(err));
      setPassword('');
      setMessage(tr('Mot de passe modifié.', 'Password changed.'));
    });
  };

  return (
    <div className="fade-in-up space-y-4">
      <PageHeader title={t('nav.account')} subtitle={session?.user.email} />
      {message && <p role="status" className="text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-xl p-3">{message}</p>}
      <ErrorNote message={error ?? factors.error} />

      <Card title={t('mfa.title')}>
        <p className="text-xs text-slate-500 mb-3">
          {tr(
            'Un code à 6 chiffres d’une application (Google Authenticator, Microsoft Authenticator, Authy…) est demandé à chaque connexion. Indispensable pour les rôles propriétaire, direction et comptabilité.',
            'A 6-digit code from an app (Google Authenticator, Microsoft Authenticator, Authy…) is required at each sign-in. Essential for the owner, management and accounting roles.',
          )}
        </p>
        <p className="text-xs mb-3">
          {tr('Session actuelle :', 'Current session:')} {aal === 'aal2' ? <Badge tone="green">{tr('vérifiée par code', 'verified by code')}</Badge> : <Badge tone="amber">{tr('mot de passe seul', 'password only')}</Badge>}
        </p>
        {verified.map((f) => (
          <div key={f.id} className="flex items-center justify-between bg-slate-50 rounded-xl p-3 mb-2">
            <span className="flex items-center gap-2 text-xs font-semibold"><ShieldCheck className="w-4 h-4 text-emerald-600" /> {f.friendly_name ?? tr('Application d’authentification', 'Authenticator app')}</span>
            <Button variant="ghost" icon={Trash2} busy={busy} onClick={() => remove(f.id)}>{tr('Retirer', 'Remove')}</Button>
          </div>
        ))}
        {enrolling ? (
          <form onSubmit={confirmEnroll} className="flex flex-col md:flex-row gap-4 items-start">
            <img src={enrolling.qr} alt={tr('QR code à scanner', 'QR code to scan')} className="w-44 h-44 border border-slate-100 rounded-xl" />
            <div className="space-y-3">
              <p className="text-xs text-slate-600">{tr('Scannez le code avec votre application, ou saisissez la clé :', 'Scan the code with your app, or enter the key:')}</p>
              <code className="block text-[11px] bg-slate-50 p-2 rounded-lg break-all">{enrolling.secret}</code>
              <Field label={tr('Code affiché', 'Displayed code')}><Input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} /></Field>
              <Button type="submit" busy={busy} disabled={code.length !== 6}>{tr('Activer', 'Enable')}</Button>
            </div>
          </form>
        ) : (
          verified.length === 0 && <Button icon={ShieldCheck} busy={busy} onClick={startEnroll}>{tr('Activer la double authentification', 'Enable two-factor authentication')}</Button>
        )}
      </Card>

      <Card title={t('login.password')}>
        <form onSubmit={changePassword} className="flex flex-wrap gap-3 items-end">
          <Field label={tr('Nouveau mot de passe', 'New password')}><Input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          <Button type="submit" icon={KeyRound} busy={busy}>{tr('Modifier', 'Change')}</Button>
        </form>
      </Card>

      <Card title={tr('Langue de l’interface', 'Interface language')}>
        <div className="flex items-center gap-3">
          <Languages className="w-4 h-4 text-slate-400" />
          <Select value={lang} onChange={(e) => setLang(e.target.value as 'fr' | 'en')} className="w-40" aria-label={tr('Langue', 'Language')}>
            <option value="fr">Français</option>
            <option value="en">English</option>
          </Select>
          <span className="text-[11px] text-slate-400">{tr('S’applique à toute l’interface.', 'Applies to the whole interface.')}</span>
        </div>
      </Card>
    </div>
  );
}
