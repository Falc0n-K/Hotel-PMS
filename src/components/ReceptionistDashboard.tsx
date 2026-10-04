import React, { useMemo, useState } from 'react';
import {
  UserCheck,
  LogOut,
  BedDouble,
  Phone,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Calendar,
  ArrowRight,
  Wrench,
  RefreshCw,
  MessageSquare,
  Star,
  User,
  Coffee,
  CalendarDays
} from 'lucide-react';
import { Room, RoomStatus, RBACRole } from '../types';
import { formatDate } from '../lib/dates';

interface ReceptionistDashboardProps {
  rooms: Room[];
  today: string;
  currentHotel: string;
  currentRole: RBACRole;
  onUpdateRoomStatus: (roomId: string, newStatus: RoomStatus) => void;
  onAddNotification: (title: string, message: string, type: 'réservation' | 'paiement' | 'alerte' | 'info') => void;
  onNavigate: (console: string) => void;
}


export default function ReceptionistDashboard({
  rooms,
  today,
  currentHotel,
  currentRole,
  onUpdateRoomStatus,
  onAddNotification,
  onNavigate
}: ReceptionistDashboardProps) {
  const [toast, setToast] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Compute today's arrivals: reserved rooms with checkInDate = today
  const todayArrivals = useMemo(() =>
    rooms.filter(r => r.status === 'reserved' && (r.checkInDate ?? '') <= today),
    [rooms, today]
  );

  // Compute today's departures: occupied rooms with checkOutDate = today
  const todayDepartures = useMemo(() =>
    rooms.filter(r => r.status === 'occupied' && (r.checkOutDate ?? '9999') <= today),
    [rooms, today]
  );

  // Rooms needing attention
  const dirtyRooms = useMemo(() =>
    rooms.filter(r => r.status === 'not-ready'),
    [rooms]
  );

  const maintenanceRooms = useMemo(() =>
    rooms.filter(r => r.status === 'maintenance'),
    [rooms]
  );

  const availableRooms = useMemo(() =>
    rooms.filter(r => r.status === 'available'),
    [rooms]
  );

  const occupiedRooms = useMemo(() =>
    rooms.filter(r => r.status === 'occupied'),
    [rooms]
  );

  // Le check-in passe par le serveur (App) qui affiche le résultat ou le refus.
  const handleQuickCheckIn = (room: Room) => onUpdateRoomStatus(room.id, 'occupied');

  // Le check-out exige un solde nul ; un refus du serveur s'affiche en bandeau.
  const handleQuickCheckOut = (room: Room) => onUpdateRoomStatus(room.id, 'not-ready');

  const occupancyRate = rooms.length > 0
    ? Math.round((occupiedRooms.length / rooms.length) * 100)
    : 0;

  return (
    <div className="space-y-6 fade-in-up">

      {/* Toast */}
      {toast && (
        <div className="bg-[#09153D] text-white px-4 py-3.5 rounded-[18px] text-xs font-bold shadow-lg flex items-center gap-2.5 animate-in fade-in slide-in-from-top-3 duration-250 fixed top-6 right-6 z-50 max-w-sm border border-slate-700/60">
          <Sparkles className="w-4 h-4 text-orange-400 shrink-0" />
          <span className="leading-snug text-left">{toast}</span>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-[#09153D] tracking-tight font-sans">Console Réception — Front Desk</h2>
          <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
            <CalendarDays className="w-3.5 h-3.5 text-orange-500" />
            {currentHotel} · {new Date(`${today}T12:00:00Z`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onNavigate('bookings-desk')}
            className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-md shadow-orange-600/10"
          >
            <CalendarDays className="w-4 h-4" />
            Guichet Réservations
          </button>
          <button
            onClick={() => onNavigate('guests-crm')}
            className="border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs px-4 py-2.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <User className="w-4 h-4" />
            CRM Clients
          </button>
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">

        <div className="bg-white p-4 rounded-[20px] border border-slate-100 shadow-sm text-left col-span-1">
          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Taux Occupation</span>
          <span className="text-2xl font-black text-[#09153D] font-mono block mt-1">{occupancyRate}%</span>
          <span className="text-[9.5px] text-slate-400">{occupiedRooms.length} / {rooms.length} chambres</span>
        </div>

        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-[20px] shadow-sm text-left col-span-1">
          <span className="text-[9px] font-extrabold text-emerald-700 uppercase tracking-widest block">Arrivées Aujourd'hui</span>
          <span className="text-2xl font-black text-emerald-700 font-mono block mt-1">{todayArrivals.length}</span>
          <span className="text-[9.5px] text-emerald-600 font-semibold">à accueillir</span>
        </div>

        <div className="bg-slate-800 border border-slate-700 p-4 rounded-[20px] shadow-sm text-left col-span-1">
          <span className="text-[9px] font-extrabold text-slate-300 uppercase tracking-widest block">Départs Aujourd'hui</span>
          <span className="text-2xl font-black text-white font-mono block mt-1">{todayDepartures.length}</span>
          <span className="text-[9.5px] text-slate-400 font-semibold">à libérer</span>
        </div>

        <div className="bg-white p-4 rounded-[20px] border border-slate-100 shadow-sm text-left col-span-1">
          <span className="text-[9px] font-extrabold text-sky-600 uppercase tracking-widest block">Chambres Libres</span>
          <span className="text-2xl font-black text-sky-600 font-mono block mt-1">{availableRooms.length}</span>
          <span className="text-[9.5px] text-slate-400">walk-in possible</span>
        </div>

        <div className="bg-orange-50 border border-orange-100 p-4 rounded-[20px] shadow-sm text-left col-span-1">
          <span className="text-[9px] font-extrabold text-orange-700 uppercase tracking-widest block">En Ménage</span>
          <span className="text-2xl font-black text-orange-600 font-mono block mt-1">{dirtyRooms.length}</span>
          <span className="text-[9.5px] text-orange-700 font-semibold">à inspecter</span>
        </div>

        <div className="bg-red-50 border border-red-100 p-4 rounded-[20px] shadow-sm text-left col-span-1">
          <span className="text-[9px] font-extrabold text-red-700 uppercase tracking-widest block">Maintenance</span>
          <span className="text-2xl font-black text-red-600 font-mono block mt-1">{maintenanceRooms.length}</span>
          <span className="text-[9.5px] text-red-600 font-semibold">hors service</span>
        </div>

      </div>

      {/* MAIN SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ARRIVALS today */}
        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm text-left">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-50 rounded-xl">
                <UserCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Arrivées du Jour</h4>
                <p className="text-[10px] text-slate-400">Clients attendus — {formatDate(today)}</p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-full">
              {todayArrivals.length} dossier(s)
            </span>
          </div>

          {todayArrivals.length === 0 ? (
            <div className="py-10 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-300 mx-auto mb-2" />
              <p className="text-xs text-slate-400 italic">Aucune arrivée prévue aujourd'hui.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {todayArrivals.map(room => (
                <div key={room.id} className="flex items-center justify-between p-3 bg-slate-50/70 rounded-xl border border-slate-100 hover:border-emerald-200 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center font-bold text-xs font-mono shrink-0">
                      {room.number}
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-800 text-xs block">{room.guestName ?? '—'}</span>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                        <span>{room.category}</span>
                        {room.occupants && <span>· {room.occupants} pers.</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {room.checkOutDate && (
                      <span className="text-[9px] text-slate-400 font-mono hidden sm:block">
                        → {formatDate(room.checkOutDate)}
                      </span>
                    )}
                    <button
                      onClick={() => handleQuickCheckIn(room)}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      <UserCheck className="w-3 h-3" />
                      Check-In
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* DEPARTURES today */}
        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm text-left">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-slate-100 rounded-xl">
                <LogOut className="w-4 h-4 text-slate-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Départs du Jour</h4>
                <p className="text-[10px] text-slate-400">Libérations prévues ce soir</p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-full">
              {todayDepartures.length} dossier(s)
            </span>
          </div>

          {todayDepartures.length === 0 ? (
            <div className="py-10 text-center">
              <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-400 italic">Aucun départ enregistré aujourd'hui.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {todayDepartures.map(room => (
                <div key={room.id} className="flex items-center justify-between p-3 bg-slate-50/70 rounded-xl border border-slate-100 hover:border-slate-300 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-slate-200 text-slate-700 rounded-xl flex items-center justify-center font-bold text-xs font-mono shrink-0">
                      {room.number}
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-800 text-xs block">{room.guestName ?? '—'}</span>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                        <span>{room.category}</span>
                        {room.phone && (
                          <span className="flex items-center gap-0.5">
                            <Phone className="w-2.5 h-2.5" /> {room.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleQuickCheckOut(room)}
                    className="bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <LogOut className="w-3 h-3" />
                    Check-Out
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ROOMS NEEDING ATTENTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* DIRTY ROOMS */}
        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm text-left">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-orange-50 rounded-xl">
              <RefreshCw className="w-4 h-4 text-orange-500" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Chambres en Ménage</h4>
              <p className="text-[10px] text-slate-400">En attente d'inspection housekeeping</p>
            </div>
          </div>

          {dirtyRooms.length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="w-7 h-7 text-emerald-300 mx-auto mb-2" />
              <p className="text-xs text-slate-400 italic">Toutes les chambres sont propres.</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {dirtyRooms.map(room => (
                <div key={room.id} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-orange-50 border border-orange-100 rounded-xl text-[10px] font-bold text-orange-700">
                  <BedDouble className="w-3 h-3" />
                  Ch. {room.number}
                  <span className="text-orange-400 font-normal truncate max-w-[80px]">· {room.category.split(' ').slice(-1)[0]}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MAINTENANCE ROOMS */}
        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm text-left">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-red-50 rounded-xl">
                <Wrench className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Hors Service — Maintenance</h4>
                <p className="text-[10px] text-slate-400">Chambres indisponibles (stop service)</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('rooms-inventory')}
              className="text-[10px] text-orange-600 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              Gérer <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {maintenanceRooms.length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="w-7 h-7 text-emerald-300 mx-auto mb-2" />
              <p className="text-xs text-slate-400 italic">Aucune chambre hors service.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {maintenanceRooms.map(room => (
                <div key={room.id} className="flex items-center justify-between p-2.5 bg-red-50 border border-red-100 rounded-xl text-[10px]">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 bg-red-100 text-red-700 rounded-lg flex items-center justify-center font-bold font-mono text-[10px]">
                      {room.number}
                    </span>
                    <div>
                      <span className="font-bold text-red-800 block">{room.category}</span>
                      {room.maintenanceNote && (
                        <span className="text-red-500 font-medium text-[9px]">{room.maintenanceNote}</span>
                      )}
                    </div>
                  </div>
                  <span className="font-extrabold text-red-600 uppercase text-[8.5px] px-2 py-0.5 rounded border border-red-200 bg-white">
                    STOP
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* CURRENTLY OCCUPIED — QUICK VIEW */}
      <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm text-left">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 rounded-xl">
              <BedDouble className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Clients en Séjour</h4>
              <p className="text-[10px] text-slate-400">Aperçu rapide des chambres occupées — {currentHotel}</p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('rooms-inventory')}
            className="text-[10px] text-orange-600 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            Voir tout <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
                <th className="p-3 text-left">Ch. N°</th>
                <th className="p-3 text-left">Client</th>
                <th className="p-3 text-left hidden md:table-cell">Catégorie</th>
                <th className="p-3 text-left hidden sm:table-cell">Check-In</th>
                <th className="p-3 text-left">Check-Out</th>
                <th className="p-3 text-center">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {occupiedRooms.slice(0, 10).map(room => {
                const leavingToday = room.checkOutDate === today;
                return (
                  <tr key={room.id} className={`hover:bg-slate-50/40 transition-colors ${leavingToday ? 'bg-amber-50/30' : ''}`}>
                    <td className="p-3 font-bold font-mono text-[#09153D]">{room.number}</td>
                    <td className="p-3">
                      <span className="font-semibold text-slate-800 flex items-center gap-1">
                        {room.guestName ?? '—'}
                        {room.occupants && room.occupants > 1 && (
                          <span className="text-[9px] text-slate-400 font-mono">·{room.occupants}pers</span>
                        )}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500 hidden md:table-cell">{room.category}</td>
                    <td className="p-3 text-slate-400 font-mono hidden sm:table-cell">{room.checkInDate ? formatDate(room.checkInDate) : '—'}</td>
                    <td className="p-3 font-mono">
                      <span className={leavingToday ? 'text-amber-600 font-bold' : 'text-slate-400'}>
                        {room.checkOutDate ? formatDate(room.checkOutDate) : '—'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {leavingToday ? (
                        <span className="text-[9px] font-extrabold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          DÉPART
                        </span>
                      ) : (
                        <span className="text-[9px] font-extrabold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                          EN SÉJOUR
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {occupiedRooms.length > 10 && (
                <tr>
                  <td colSpan={6} className="p-3 text-center text-[10px] text-slate-400 italic">
                    + {occupiedRooms.length - 10} autres chambres occupées. Voir l'inventaire complet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
