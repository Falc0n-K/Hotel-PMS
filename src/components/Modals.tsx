/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShieldAlert, KeyRound, Unlock, AlertCircle } from 'lucide-react';

interface LockScreenProps {
  isOpen: boolean;
  onUnlock: () => void;
  userName: string;
}

const VALID_PASSCODE = '1234';

export function LockScreen({ isOpen, onUnlock, userName }: LockScreenProps) {
  const [passcode, setPasscode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setErrorMsg('Veuillez saisir votre code PIN pour déverrouiller.');
      return;
    }
    if (passcode === VALID_PASSCODE) {
      setErrorMsg('');
      setPasscode('');
      onUnlock();
    } else {
      setErrorMsg('Code PIN incorrect. Veuillez réessayer.');
      setPasscode('');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-100 p-8 text-center animate-in zoom-in-95 duration-200">

        {/* Lock header */}
        <div className="w-14 h-14 bg-orange-100 border border-orange-200 text-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner">
          <ShieldAlert className="w-7 h-7 animate-pulse" />
        </div>

        <h3 className="text-lg font-extrabold text-slate-950 font-sans">Session PMS Verrouillée</h3>
        <p className="text-xs text-slate-500 font-medium mt-1.5 px-3">
          Opérateur : <span className="font-bold text-slate-800">{userName}</span>
        </p>
        <p className="text-[11px] text-slate-400 mt-1">
          Votre session de gestion a été suspendue pour des raisons de sécurité.
        </p>

        {/* Unlock Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <div className="relative">
            <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="password"
              placeholder="Code PIN opérateur"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors text-center font-mono text-slate-800 placeholder:text-slate-400 placeholder:font-sans"
              autoFocus
              autoComplete="current-password"
            />
          </div>

          {errorMsg && (
            <div className="flex items-start gap-1 p-2 bg-red-50 text-red-600 text-[10px] font-bold rounded-lg text-left leading-normal">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md shadow-orange-600/10"
          >
            <Unlock className="w-4 h-4" />
            <span>Déverrouiller la Console</span>
          </button>
        </form>

        <p className="text-[10px] text-slate-400 mt-4">
          Contactez votre administrateur si vous avez oublié votre PIN.
        </p>
      </div>
    </div>
  );
}
