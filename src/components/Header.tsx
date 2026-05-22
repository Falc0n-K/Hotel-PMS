/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Search, Bell, MessageSquare, Check, Trash2, Hotel } from 'lucide-react';
import { PMSNotification } from '../types';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  notifications: PMSNotification[];
  onMarkNotificationRead: (id: string) => void;
  onClearNotification: (id: string) => void;
}

export default function Header({
  searchQuery,
  onSearchChange,
  notifications,
  onMarkNotificationRead,
  onClearNotification
}: HeaderProps) {
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-10 w-full">
      {/* Title block */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Hotel className="w-5 h-5 text-orange-600 sm:hidden" />
          <span>Tableau de Bord</span>
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

        {/* Discussion / Chat bubble with simulated feedback */}
        <button
          onClick={() => alert('Simulateur PMS: Le centre d\'assistance et de discussion unifiée est opérationnel.')}
          className="relative w-10 h-10 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 flex items-center justify-center text-slate-600 transition-colors cursor-pointer group"
          title="Messagerie Interne"
        >
          <MessageSquare className="w-4.5 h-4.5 group-hover:scale-105 transition-transform" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifPanel(!showNotifPanel)}
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
                          <span className="text-[9px] text-slate-400 font-mono shrink-0">{n.time}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 font-medium">{n.message}</p>
                        
                        <div className="flex items-center gap-3 mt-2">
                          {!n.read && (
                            <button
                              onClick={() => {
                                onMarkNotificationRead(n.id);
                              }}
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
