import { LayoutDashboard, Building2, BedDouble, CalendarDays, Users, Wallet, MapPin, Compass, Megaphone, LogOut, Lock, ShieldCheck, ChevronRight, MessageSquare, TrendingUp, Contact, MessageCircle, Settings, MonitorCheck, KeyRound } from 'lucide-react';
import { RBACRole, ROLE_CONSOLES_MAPPING } from '../types';

interface SidebarProps {
  currentRole: RBACRole;
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
}

export const CONSOLES = [
    { id: 'reception-desk', label: 'Console Réception', icon: MonitorCheck },
    { id: 'dashboard', label: 'Tableau de Bord', icon: LayoutDashboard },
    { id: 'hotels-hub', label: 'Hub Hôtels', icon: Building2 },
    { id: 'rooms-inventory', label: 'Inventaire-Chambres', icon: BedDouble },
    { id: 'bookings-desk', label: 'Guichet Réservations', icon: CalendarDays },
    { id: 'guests-crm', label: 'CRM Clients', icon: Users },
    { id: 'payments-finance', label: 'Paiements & Finance', icon: Wallet },
    { id: 'event-venues', label: 'Lieux d\'Événements', icon: MapPin },
    { id: 'experiences-market', label: 'Marché Expériences', icon: Compass },
    { id: 'marketing-packages', label: 'Forfaits Marketing', icon: Megaphone },
    { id: 'guest-feedbacks', label: 'Retours Clients', icon: MessageSquare },
    { id: 'deep-analytics', label: 'Deep Analytics', icon: TrendingUp },
    { id: 'staff-directory', label: 'Annuaire Staff', icon: Contact },
    { id: 'messages-inbox', label: 'Messagerie', icon: MessageCircle },
    { id: 'team-access', label: 'Équipe & Accès', icon: KeyRound },
    { id: 'global-settings', label: 'Paramètres', icon: Settings }
];

// Modules encore alimentés par des données de démonstration (non enregistrées).
export const DEMO_CONSOLES = new Set([
  'hotels-hub',
  'guests-crm',
  'payments-finance',
  'event-venues',
  'experiences-market',
  'marketing-packages',
  'guest-feedbacks',
  'deep-analytics',
  'staff-directory',
  'messages-inbox',
  'global-settings',
]);

export default function Sidebar({
  currentRole,
  roleLabel,
  activeConsole,
  onConsoleSelect,
  onLockSession,
  onSignOut,
  properties,
  currentPropertyId,
  onPropertyChange,
  userName,
  userEmail
}: SidebarProps) {
  const consoles = CONSOLES;
  const initials = userName.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <aside className="w-72 bg-white border-r border-slate-100 flex flex-col h-screen fixed top-0 left-0 z-20 shrink-0">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-50 flex flex-col gap-3.5">
        <div className="flex flex-col items-center justify-center py-2 w-full select-none">
          <img 
            src="https://lh3.googleusercontent.com/d/1P7FzKFgoqw2lC_WL9iiFy35LH3DCgzlj" 
            alt="Sénégal Hôtels" 
            className="w-full max-w-[200px] h-20 object-contain filter drop-shadow-md"
            referrerPolicy="no-referrer"
            onError={(e) => {
              const target = e.currentTarget;
              target.style.display = 'none';
              const fallback = target.nextElementSibling;
              if (fallback) {
                fallback.classList.remove('hidden');
                fallback.classList.add('flex');
              }
            }}
          />
          <div className="hidden bg-orange-600 font-extrabold text-white text-md px-5 py-2.5 rounded-xl shadow-md shadow-orange-500/10 shrink-0">
            SÉNÉGAL HÔTELS
          </div>
        </div>

        {/* Dynamic establishment active select switcher */}
        <div className="relative mt-0.5">
          <label className="block text-[8.5px] font-extrabold text-[#09153D]/60 uppercase tracking-widest mb-1.5">
            Établissement Actif :
          </label>
          <div className="relative">
            <select
              aria-label="Établissement actif"
              value={currentPropertyId}
              onChange={(e) => onPropertyChange(e.target.value)}
              disabled={properties.length < 2}
              className="w-full bg-slate-50/50 hover:bg-slate-100/60 border border-slate-200/50 text-[#09153D] font-bold text-[11px] py-2 pl-8.5 pr-7.5 rounded-xl appearance-none focus:outline-none focus:ring-1 focus:ring-orange-500/40 focus:border-orange-500 transition-all cursor-pointer disabled:cursor-default"
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-orange-600 pointer-events-none">
              <Building2 className="w-3.5 h-3.5" />
            </div>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <ChevronRight className="w-3 h-3 rotate-90" />
            </div>
          </div>
        </div>
      </div>

      {/* Rôle serveur de l'utilisateur pour cet établissement */}
      <div className="p-4 mx-4 my-3 bg-slate-50 rounded-2xl border border-slate-100/80">
        <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-2">Votre rôle</p>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-100 rounded-lg text-slate-700 text-xs font-semibold shadow-sm">
          <ShieldCheck className="w-4.5 h-4.5 text-orange-600" />
          <span className="truncate">{roleLabel}</span>
        </div>
      </div>

      {/* System Consoles Section */}
      <div className="px-4 py-2 flex-grow overflow-y-auto">
        <div className="flex items-center gap-2 px-2 pb-2">
          <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
            Consoles Système
          </p>
        </div>
        
        <nav className="space-y-1">
          {consoles
            .filter((item) => {
              const allowed = ROLE_CONSOLES_MAPPING[currentRole] || [];
              return allowed.includes(item.id);
            })
            .map((item) => {
              const IconComponent = item.icon;
              const IsActive = activeConsole === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onConsoleSelect(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group ${
                    IsActive
                      ? 'bg-orange-600 text-white shadow-md shadow-orange-600/10'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <IconComponent className={`w-4.5 h-4.5 shrink-0 ${IsActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
                    <span>{item.label}</span>
                    {DEMO_CONSOLES.has(item.id) && (
                      <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded ${IsActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>Démo</span>
                    )}
                  </div>
                  {IsActive && <ChevronRight className="w-3.5 h-3.5 text-orange-200" />}
                </button>
              );
            })}
        </nav>
      </div>

      {/* Profile & Footer */}
      <div className="p-4 border-t border-slate-50 mt-auto bg-slate-50/60 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center font-bold text-xs text-orange-700 font-mono shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-slate-800 truncate">{userName}</h4>
            <p className="text-[10px] text-slate-400 font-mono truncate">{userEmail}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onLockSession}
            className="flex items-center justify-center gap-1.5 py-2 px-2 bg-white hover:bg-slate-100 text-slate-600 rounded-xl text-[11px] font-semibold transition-colors border border-slate-200 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Verrouiller</span>
          </button>
          <button
            onClick={onSignOut}
            className="flex items-center justify-center gap-1.5 py-2 px-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-[11px] font-semibold transition-colors border border-red-100/50 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Déconnexion</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
