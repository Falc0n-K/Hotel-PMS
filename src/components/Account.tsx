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
  const { lang, setLang } = useI18n();
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
      if (err) throw new Error('Code incorrect ou expiré.');
      setEnrolling(null);
      setCode('');
      await refreshAal();
      await factors.reload();
      setMessage('Double authentification activée.');
    });
  };

  const remove = (id: string) =>
    confirm('Désactiver la double authentification sur ce compte ?') &&
    act(async () => {
      const { error: err } = await supabase.auth.mfa.unenroll({ factorId: id });
      if (err) throw new Error(errorMessage(err));
      await refreshAal();
      await factors.reload();
    });

  const changePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 10) return setError('Au moins 10 caractères.');
    act(async () => {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw new Error(errorMessage(err));
      setPassword('');
      setMessage('Mot de passe modifié.');
    });
  };

  return (
    <div className="fade-in-up space-y-4">
      <PageHeader title="Mon compte" subtitle={session?.user.email} />
      {message && <p role="status" className="text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-xl p-3">{message}</p>}
      <ErrorNote message={error ?? factors.error} />

      <Card title="Double authentification">
        <p className="text-xs text-slate-500 mb-3">
          Un code à 6 chiffres d’une application (Google Authenticator, Microsoft Authenticator, Authy…) est demandé à chaque
          connexion. Indispensable pour les rôles propriétaire, direction et comptabilité.
        </p>
        <p className="text-xs mb-3">
          Session actuelle : {aal === 'aal2' ? <Badge tone="green">vérifiée par code</Badge> : <Badge tone="amber">mot de passe seul</Badge>}
        </p>
        {verified.map((f) => (
          <div key={f.id} className="flex items-center justify-between bg-slate-50 rounded-xl p-3 mb-2">
            <span className="flex items-center gap-2 text-xs font-semibold"><ShieldCheck className="w-4 h-4 text-emerald-600" /> {f.friendly_name ?? 'Application d’authentification'}</span>
            <Button variant="ghost" icon={Trash2} busy={busy} onClick={() => remove(f.id)}>Retirer</Button>
          </div>
        ))}
        {enrolling ? (
          <form onSubmit={confirmEnroll} className="flex flex-col md:flex-row gap-4 items-start">
            <img src={enrolling.qr} alt="QR code à scanner" className="w-44 h-44 border border-slate-100 rounded-xl" />
            <div className="space-y-3">
              <p className="text-xs text-slate-600">Scannez le code avec votre application, ou saisissez la clé :</p>
              <code className="block text-[11px] bg-slate-50 p-2 rounded-lg break-all">{enrolling.secret}</code>
              <Field label="Code affiché"><Input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} /></Field>
              <Button type="submit" busy={busy} disabled={code.length !== 6}>Activer</Button>
            </div>
          </form>
        ) : (
          verified.length === 0 && <Button icon={ShieldCheck} busy={busy} onClick={startEnroll}>Activer la double authentification</Button>
        )}
      </Card>

      <Card title="Mot de passe">
        <form onSubmit={changePassword} className="flex flex-wrap gap-3 items-end">
          <Field label="Nouveau mot de passe"><Input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          <Button type="submit" icon={KeyRound} busy={busy}>Modifier</Button>
        </form>
      </Card>

      <Card title="Langue de l’interface">
        <div className="flex items-center gap-3">
          <Languages className="w-4 h-4 text-slate-400" />
          <Select value={lang} onChange={(e) => setLang(e.target.value as 'fr' | 'en')} className="w-40" aria-label="Langue">
            <option value="fr">Français</option>
            <option value="en">English</option>
          </Select>
          <span className="text-[11px] text-slate-400">Menu, connexion et compte. Les écrans métier sont en français.</span>
        </div>
      </Card>
    </div>
  );
}
