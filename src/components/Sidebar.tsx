import { useEffect, useRef, useState } from 'react';
import { Building2, ChevronRight, Lock, LogOut, Monitor, ShieldCheck, X } from 'lucide-react';
import type { NavItem } from '../lib/nav';
import { useI18n } from '../lib/i18n';

interface SidebarProps {
  items: NavItem[];
  roleLabel: string;
  activeConsole: string;
  onConsoleSelect: (console: string) => void;
  onLockSession: () => void;
  onSignOut: () => void;
  properties: { id: string; name: string }[];
  currentPropertyId: string;
  onPropertyChange: (propertyId: string) => void;
  userName: string;
  userEmail: string;
  // Petit écran : le menu est un tiroir ouvert depuis l'en-tête.
  open: boolean;
  onClose: () => void;
}

const LOGO_URL = 'https://lh3.googleusercontent.com/d/1P7FzKFgoqw2lC_WL9iiFy35LH3DCgzlj';

export default function Sidebar({
  items, roleLabel, activeConsole, onConsoleSelect, onLockSession, onSignOut,
  properties, currentPropertyId, onPropertyChange, userName, userEmail, open, onClose,
}: SidebarProps) {
  const { t, tr } = useI18n();
  const [logoFailed, setLogoFailed] = useState(false);
  const initials = userName.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  const closeRef = useRef<HTMLButtonElement>(null);

  // Tiroir ouvert : Échap le ferme, le focus va sur le bouton de fermeture.
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
    {open && <div className="fixed inset-0 bg-slate-900/40 z-30 lg:hidden" onClick={onClose} aria-hidden="true" />}
    <aside
      id="main-menu"
      className={`w-72 max-w-[85vw] bg-white border-r border-slate-100 flex flex-col h-[100dvh] fixed top-0 left-0 z-40 shrink-0 transition-transform duration-200 lg:z-20 lg:translate-x-0 ${
        open ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
      }`}
    >
      <div className="p-6 max-lg:p-4 border-b border-slate-50 flex flex-col gap-3.5 relative">
        <button
          ref={closeRef}
          onClick={onClose}
          className="lg:hidden absolute top-3 right-3 w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 cursor-pointer"
          aria-label={tr('Fermer le menu', 'Close menu')}
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center justify-center py-1 w-full select-none">
          {logoFailed ? (
            <div className="bg-orange-600 font-extrabold text-white text-md px-5 py-2.5 rounded-xl shadow-md shadow-orange-500/10">SÉNÉGAL HÔTELS</div>
          ) : (
            <img src={LOGO_URL} alt="Sénégal Hôtels" className="w-full max-w-[200px] h-16 object-contain" referrerPolicy="no-referrer" onError={() => setLogoFailed(true)} />
          )}
        </div>

        <div>
          <label htmlFor="property-select" className="block text-[9px] font-extrabold text-[#09153D]/60 uppercase tracking-widest mb-1.5">
            {t('shell.property')}
          </label>
          <div className="relative">
            <select
              id="property-select"
              value={currentPropertyId}
              onChange={(e) => onPropertyChange(e.target.value)}
              disabled={properties.length < 2}
              className="w-full bg-slate-50/50 hover:bg-slate-100/60 border border-slate-200/50 text-[#09153D] font-bold text-[11px] py-2 pl-8 pr-7 rounded-xl appearance-none focus:outline-none focus:ring-1 focus:ring-orange-500/40 cursor-pointer disabled:cursor-default"
            >
              {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-orange-600 pointer-events-none" />
            <ChevronRight className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 rotate-90 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-slate-700 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4 text-orange-600 shrink-0" />
          <span className="text-[10px] text-slate-400 uppercase font-bold">{t('shell.role')}</span>
          <span className="truncate ml-auto">{roleLabel}</span>
        </div>
      </div>

      <nav className="px-4 py-3 flex-grow overflow-y-auto space-y-0.5" aria-label={tr('Navigation principale', 'Main navigation')}>
        {items.map((item) => {
          const Icon = item.icon;
          const active = activeConsole === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onConsoleSelect(item.id);
                onClose();
              }}
              aria-current={active ? 'page' : undefined}
              className={`w-full flex items-center justify-between px-3 py-2.5 max-lg:py-3 max-lg:text-sm rounded-xl text-xs font-semibold transition-colors cursor-pointer group ${
                active ? 'bg-orange-600 text-white shadow-md shadow-orange-600/10' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-3">
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
                {t(item.label)}
              </span>
              {active ? (
                <ChevronRight className="w-3.5 h-3.5 text-orange-200" />
              ) : (
                !item.mobile && (
                  <span className="lg:hidden" title={tr('Prévu pour un écran large', 'Designed for a large screen')}>
                    <Monitor className="w-3.5 h-3.5 text-slate-300" aria-hidden="true" />
                  </span>
                )
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-50 bg-slate-50/60 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center font-bold text-xs text-orange-700 shrink-0">{initials}</div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-800 truncate">{userName}</p>
            <p className="text-[10px] text-slate-400 truncate">{userEmail}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={onLockSession} className="flex items-center justify-center gap-1.5 py-2 bg-white hover:bg-slate-100 text-slate-600 rounded-xl text-[11px] font-semibold border border-slate-200 cursor-pointer">
            <Lock className="w-3.5 h-3.5" /> {t('shell.lock')}
          </button>
          <button onClick={onSignOut} className="flex items-center justify-center gap-1.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-[11px] font-semibold border border-red-100/50 cursor-pointer">
            <LogOut className="w-3.5 h-3.5" /> {t('shell.signout')}
          </button>
        </div>
        <p className="text-[9px] text-slate-400 text-center font-mono" title="Version">v{__APP_VERSION__}</p>
      </div>
    </aside>
    </>
  );
}
