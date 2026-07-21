/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LayoutDashboard, Building2, BedDouble, CalendarDays, Users, Wallet, MapPin, Compass, Megaphone, LogOut, ShieldCheck, ChevronRight, MessageSquare, TrendingUp, Contact, MessageCircle, Settings } from 'lucide-react';
import { RBACRole, ROLE_CONSOLES_MAPPING } from '../types';

interface SidebarProps {
  currentRole: RBACRole;
  onRoleChange: (role: RBACRole) => void;
  activeConsole: string;
  onConsoleSelect: (console: string) => void;
  onLockSession: () => void;
  currentHotel: string;
  onHotelChange: (hotel: string) => void;
}

export default function Sidebar({
  currentRole,
  onRoleChange,
  activeConsole,
  onConsoleSelect,
  onLockSession,
  currentHotel,
  onHotelChange
}: SidebarProps) {
  
  const consoles = [
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
    { id: 'global-settings', label: 'Paramètres', icon: Settings }
  ];

  const roles: RBACRole[] = [
    'Propriétaire d\'Hôtel',
    'Réceptionniste (Front Desk)',
    'Directeur Financier',
    'Responsable Ménage'
  ];

  return (
    <aside className="w-72 bg-white border-r border-slate-100 flex flex-col h-screen fixed top-0 left-0 z-20 shrink-0">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-50 flex flex-col gap-3.5">
        <div className="flex flex-col items-center justify-center py-2 w-full select-none">
          <img
            src="/logo.svg"
            alt="Sénégal Hôtels"
            className="w-full max-w-[200px] h-20 object-contain filter drop-shadow-md"
          />
        </div>

        {/* Dynamic establishment active select switcher */}
        <div className="relative mt-0.5">
          <label className="block text-[10px] font-extrabold text-[#09153D]/60 uppercase tracking-widest mb-1.5">
            Établissement Actif :
          </label>
          <div className="relative">
            <select
              value={currentHotel}
              onChange={(e) => onHotelChange(e.target.value)}
              className="w-full bg-slate-50/50 hover:bg-slate-100/60 border border-slate-200/50 text-[#09153D] font-bold text-[11px] py-2 pl-8.5 pr-7.5 rounded-xl appearance-none focus:outline-none focus:ring-1 focus:ring-orange-500/40 focus:border-orange-500 transition-all cursor-pointer"
            >
              <option value="Royal Saly">🏢 Royal Saly</option>
              <option value="Nema Kadior">🌴 Nema Kadior</option>
              <option value="Les Pélicans du Saloum">🦩 Les Pélicans</option>
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

      {/* RBAC Simulation Section */}
      <div className="p-4 mx-4 my-3 bg-slate-50 rounded-2xl border border-slate-100/80">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
          <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
            Niveau de Régulation Actif
          </p>
        </div>
        
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-100 rounded-lg text-slate-700 text-xs font-semibold shadow-sm mb-3">
          <ShieldCheck className="w-4.5 h-4.5 text-orange-600" />
          <span className="truncate">{currentRole}</span>
        </div>

        <label className="block text-[10px] font-bold text-slate-400 tracking-tight uppercase mb-1">
          Simuler les vues RBAC :
        </label>
        <select
          value={currentRole}
          onChange={(e) => onRoleChange(e.target.value as RBACRole)}
          className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium py-1.5 px-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors cursor-pointer"
        >
          {roles.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
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
            MD
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-slate-800 truncate">Mamadou Diallo</h4>
            <p className="text-[10px] text-slate-400 font-mono truncate">mamadou.d@senegalhotels.sn</p>
          </div>
        </div>

        <button
          onClick={onLockSession}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 rounded-xl text-xs font-semibold transition-colors border border-red-100/50"
        >
          <LogOut className="w-4 h-4" />
          <span>Fermer la session PMS</span>
        </button>
      </div>
    </aside>
  );
}
