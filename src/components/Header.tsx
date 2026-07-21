/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Search, Bell, MessageSquare, Check, Trash2, Hotel } from 'lucide-react';
import { PMSNotification } from '../types';

function relativeTime(ts: number): string {
  const diff = Math.max(0, Date.now() - ts);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'À l\'instant';
  const min = Math.floor(sec / 60);
  if (min < 60) return `Il y a ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `Il y a ${hr}h`;
  const d = Math.floor(hr / 24);
  return `Il y a ${d}j`;
}

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  notifications: PMSNotification[];
  onMarkNotificationRead: (id: string) => void;
  onClearNotification: (id: string) => void;
  activeConsole: string;
  onConsoleSelect: (console: string) => void;
}

const CONSOLE_TITLES: Record<string, string> = {
  'dashboard': 'Tableau de Bord',
  'hotels-hub': 'Hub Multi-Hôtels',
  'rooms-inventory': 'Inventaire des Chambres',
  'bookings-desk': 'Guichet Réservations',
  'guests-crm': 'CRM Clients',
  'payments-finance': 'Paiements & Finance',
  'event-venues': 'Lieux d\'Événements',
  'experiences-market': 'Marché Expériences',
  'marketing-packages': 'Forfaits Marketing',
  'guest-feedbacks': 'Retours Clients',
  'deep-analytics': 'Deep Analytics',
  'staff-directory': 'Annuaire Staff',
  'messages-inbox': 'Messagerie',
  'global-settings': 'Paramètres Globaux'
};

export default function Header({
  searchQuery,
  onSearchChange,
  notifications,
  onMarkNotificationRead,
  onClearNotification,
  activeConsole,
  onConsoleSelect
}: HeaderProps) {
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [, setTick] = useState(0);
  const unreadCount = notifications.filter(n => !n.read).length;

  // Refresh relative timestamps every 60 s while panel is open
  useEffect(() => {
    if (!showNotifPanel) return;
    const id = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(id);
  }, [showNotifPanel]);
  const pageTitle = CONSOLE_TITLES[activeConsole] || 'Console PMS';

  return (
    <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-10 w-full">
      {/* Title block */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Hotel className="w-5 h-5 text-orange-600 sm:hidden" />
          <span>{pageTitle}</span>
        </h2>
        <p className="text-xs text-slate-500 font-medium">
          Ravi de vous revoir, <span className="text-slate-700 font-semibold">Mamadou Diallo !</span>
        </p>
      </div>

      {/* Utilities */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative w-72 max-sm:hidden">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher une chambre, un client, un statut..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] bg-slate-200 text-slate-600 rounded-full px-1.5 hover:bg-slate-300 transition-colors"
            >
              Effacer
            </button>
          )}
        </div>

        {/* Messagerie shortcut */}
        <button
          onClick={() => onConsoleSelect('messages-inbox')}
          className="relative w-10 h-10 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 flex items-center justify-center text-slate-600 transition-colors cursor-pointer group"
          title="Messagerie Interne"
          aria-label="Ouvrir la messagerie"
        >
          <MessageSquare className="w-4.5 h-4.5 group-hover:scale-105 transition-transform" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifPanel(!showNotifPanel)}
            aria-label={`Notifications (${unreadCount} non lues)`}
            className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-colors cursor-pointer group ${
              showNotifPanel
                ? 'bg-orange-50 border-orange-200 text-orange-600'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-100 text-slate-600'
            }`}
          >
            <Bell className="w-4.5 h-4.5 group-hover:scale-105 transition-transform" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold px-1 animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Quick Notification Box Dropdown */}
          {showNotifPanel && (
            <div className="absolute right-0 mt-3 w-96 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-3 duration-200">
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-50">
                <span className="text-xs font-bold text-slate-800">Notifications PMS ({unreadCount} non lues)</span>
                <button
                  onClick={() => setShowNotifPanel(false)}
                  className="text-[10px] text-slate-400 hover:text-slate-600"
                >
                  Fermer
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    Aucune alerte récente
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3.5 flex items-start gap-3 transition-colors ${
                        n.read ? 'bg-white' : 'bg-orange-50/30'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        n.type === 'alerte' ? 'bg-red-500' :
                        n.type === 'paiement' ? 'bg-emerald-500' :
                        n.type === 'réservation' ? 'bg-orange-500' : 'bg-blue-400'
                      }`} />

                      <div className="flex-grow min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-xs ${n.read ? 'font-medium text-slate-700' : 'font-bold text-slate-900'}`}>{n.title}</p>
                          <span className="text-[9px] text-slate-400 font-mono shrink-0">{relativeTime(n.createdAt)}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 font-medium">{n.message}</p>

                        <div className="flex items-center gap-3 mt-2">
                          {!n.read && (
                            <button
                              onClick={() => onMarkNotificationRead(n.id)}
                              className="text-[10px] text-orange-600 hover:text-orange-700 font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                              <span>Marquer lu</span>
                            </button>
                          )}
                          <button
                            onClick={() => onClearNotification(n.id)}
                            className="text-[10px] text-slate-400 hover:text-red-500 font-medium flex items-center gap-1 ml-auto cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Effacer</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
