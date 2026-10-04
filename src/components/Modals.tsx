import React, { useState } from 'react';
import { ShieldAlert, KeyRound, Unlock, AlertCircle, LogOut } from 'lucide-react';
import { supabase, errorMessage } from '../lib/supabase';

interface LockScreenProps {
  isOpen: boolean;
  onUnlock: () => void;
  onSignOut: () => void;
  userName: string;
  email: string;
}

// Verrouillage de poste : le déverrouillage revérifie le mot de passe du
// compte auprès de Supabase (plus de code PIN écrit dans le code source).
export function LockScreen({ isOpen, onUnlock, onSignOut, userName, email }: LockScreenProps) {
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [busy, setBusy] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setErrorMsg(errorMessage(error));
      return;
    }
    setErrorMsg('');
    setPassword('');
    onUnlock();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-100 p-8 text-center">
        <div className="w-14 h-14 bg-orange-100 border border-orange-200 text-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <h3 className="text-lg font-extrabold text-slate-950 font-sans">Session verrouillée</h3>
        <p className="text-xs text-slate-500 font-medium mt-1.5 px-3">
          Opérateur : <span className="font-bold text-slate-800">{userName}</span>
        </p>
        <p className="text-[11px] text-slate-400 mt-1">Saisissez votre mot de passe pour reprendre la session.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <div className="relative">
            <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="password"
              aria-label="Mot de passe"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-800"
              autoFocus
            />
          </div>

          {errorMsg && (
            <div role="alert" className="flex items-start gap-1 p-2 bg-red-50 text-red-600 text-[10px] font-bold rounded-lg text-left leading-normal">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={busy || !password}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Unlock className="w-4 h-4" />
            <span>Déverrouiller</span>
          </button>
        </form>

        <button
          onClick={onSignOut}
          className="mt-4 w-full flex items-center justify-center gap-2 text-[11px] text-slate-500 border-t border-slate-100 pt-3 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" /> Changer d’utilisateur
        </button>
      </div>
    </div>
  );
}
