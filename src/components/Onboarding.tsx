import React, { useState } from 'react';
import { Building2, AlertCircle, Loader2, LogOut } from 'lucide-react';
import { supabase, errorMessage } from '../lib/supabase';
import { useAuth } from '../lib/auth';

// Premier établissement d'un compte sans rattachement. Un collaborateur invité
// n'a rien à faire ici : il attend que la direction l'ajoute à l'équipe.
export default function Onboarding() {
  const { profile, refreshMemberships, signOut } = useAuth();
  const [orgName, setOrgName] = useState('');
  const [propertyName, setPropertyName] = useState('');
  const [code, setCode] = useState('');
  const [city, setCity] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.rpc('create_organization_with_property', {
      p_org_name: orgName,
      p_property_name: propertyName,
      p_property_code: code,
      p_city: city || null,
    });
    if (error) {
      setError(errorMessage(error));
      setBusy(false);
      return;
    }
    await refreshMemberships();
  };

  const input =
    'w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-xl border border-slate-100 p-8">
        <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mb-4">
          <Building2 className="w-6 h-6" />
        </div>
        <h1 className="text-lg font-extrabold text-slate-950">Bienvenue{profile?.full_name ? `, ${profile.full_name}` : ''}</h1>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          Votre compte n’est rattaché à aucun établissement. Si vous êtes collaborateur, demandez à votre direction de
          vous ajouter à l’équipe avec l’adresse <strong>{profile?.email}</strong>. Si vous êtes propriétaire, créez
          votre premier établissement.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <input className={input} placeholder="Nom de l’organisation (ex. Groupe Senegal Hotels)" value={orgName} onChange={(e) => setOrgName(e.target.value)} required minLength={2} />
          <input className={input} placeholder="Nom de l’établissement (ex. Royal Saly)" value={propertyName} onChange={(e) => setPropertyName(e.target.value)} required minLength={2} />
          <div className="grid grid-cols-2 gap-3">
            <input
              className={input}
              placeholder="Code (ex. RS)"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
              required
              minLength={2}
              title="2 à 6 lettres ou chiffres, utilisé dans la numérotation des factures"
            />
            <input className={input} placeholder="Ville" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>

          {error && (
            <div role="alert" className="flex gap-2 p-2.5 bg-red-50 text-red-600 text-[11px] font-bold rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Créer l’établissement
          </button>
        </form>

        <button onClick={signOut} className="mt-5 w-full flex items-center justify-center gap-2 text-[11px] text-slate-500 cursor-pointer">
          <LogOut className="w-3.5 h-3.5" /> Se déconnecter
        </button>
      </div>
    </div>
  );
}
