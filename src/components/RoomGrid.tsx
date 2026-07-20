/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Sparkles, Bed, Info, User, Check, X, Phone, Calendar, LogIn, LogOut, RefreshCw } from 'lucide-react';
import { Room, RoomStatus } from '../types';

interface RoomGridProps {
  rooms: Room[];
  onUpdateRoomStatus: (roomId: string, newStatus: RoomStatus) => void;
  searchQuery: string;
}

export default function RoomGrid({ rooms, onUpdateRoomStatus, searchQuery }: RoomGridProps) {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  // Derive floors from actual room data, descending order
  const floors = Array.from(new Set(rooms.map(r => r.floor))).sort((a, b) => b - a);

  const selectedRoom = rooms.find(r => r.id === selectedRoomId);

  // Check if room matches search query
  const matchesSearch = (room: Room) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      room.number.includes(query) ||
      room.category.toLowerCase().includes(query) ||
      room.status.toLowerCase().includes(query) ||
      (room.guestName && room.guestName.toLowerCase().includes(query))
    );
  };

  const getStatusColorClass = (status: RoomStatus) => {
    switch (status) {
      case 'occupied':
        return 'bg-orange-600 border-orange-700 hover:bg-orange-500';
      case 'available':
        return 'bg-emerald-500 border-emerald-600 hover:bg-emerald-400';
      case 'reserved':
        return 'bg-amber-400 border-amber-500 hover:bg-amber-300';
      case 'not-ready':
        return 'bg-slate-300 border-slate-400 hover:bg-slate-200';
      default:
        return 'bg-slate-200';
    }
  };

  const getStatusName = (status: RoomStatus) => {
    switch (status) {
      case 'occupied': return 'Occupée';
      case 'available': return 'Disponible';
      case 'reserved': return 'Réservée';
      case 'not-ready': return 'Non Prête (Ménage)';
    }
  };

  // Counting metrics for current displayed list
  const countOccupied = rooms.filter(r => r.status === 'occupied').length;
  const countAvailable = rooms.filter(r => r.status === 'available').length;
  const countReserved = rooms.filter(r => r.status === 'reserved').length;
  const countNotReady = rooms.filter(r => r.status === 'not-ready').length;

  return (
    <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-shadow mb-8 w-full flex flex-col justify-between">
      {/* Header Widget Info */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h4 className="text-sm font-bold text-slate-900 tracking-tight">Disponibilité des Chambres</h4>
          <p className="text-[11px] text-slate-400 font-medium">Total des chambres en circulation</p>
        </div>

        <div className="text-right flex items-baseline gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">TOTAL CHAMBRES</span>
          <span className="text-3xl font-extrabold text-[#09153D] tracking-tight font-mono">{rooms.length}</span>
        </div>
      </div>

      {/* Main Container - splits into Grid and Inspector when a room is active */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Interactive Grid Area */}
        <div className="flex-grow w-full space-y-3.5">
          {floors.map((floorNum) => {
            const floorRooms = rooms.filter(r => r.floor === floorNum);
            return (
              <div key={floorNum} className="flex flex-col">
                <div className="flex items-center justify-between mb-1.5 px-1">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Étage {floorNum}
                  </span>
                  <span className="text-[9px] font-mono text-slate-300">
                    Chambres {floorNum}01 à {floorNum}30
                  </span>
                </div>
                
                {/* 30 room Grid Row layout */}
                <div className="grid grid-cols-10 sm:grid-cols-15 md:grid-cols-30 gap-1.5">
                  {floorRooms.map((room) => {
                    const activeMatch = matchesSearch(room);
                    const isSelected = selectedRoomId === room.id;
                    return (
                      <button
                        key={room.id}
                        onClick={() => setSelectedRoomId(isSelected ? null : room.id)}
                        className={`aspect-square w-full rounded-md border text-[9.5px] font-bold font-mono text-white flex items-center justify-center transition-all duration-200 shadow-sm relative cursor-pointer ${
                          activeMatch ? getStatusColorClass(room.status) : 'bg-slate-100 text-slate-300 border-slate-100 scale-95 opacity-40'
                        } ${isSelected ? 'ring-4 ring-orange-500/30 scale-110 z-10' : ''}`}
                        title={`Chambre ${room.number} - ${getStatusName(room.status)} ${room.guestName ? '(' + room.guestName + ')' : ''}`}
                      >
                        {room.number.slice(-2)}
                        
                        {/* Selected accent ring indicator */}
                        {isSelected && (
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-600 rounded-full border border-white" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Room Inspector Drawer Panel */}
        {selectedRoom && (
          <div className="w-full lg:w-80 bg-slate-50 border border-slate-200/80 rounded-2xl p-5 shrink-0 animate-in slide-in-from-right-4 duration-200 relative">
            <button
              onClick={() => setSelectedRoomId(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4.5 h-4.5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className={`p-2 rounded-xl text-white ${getStatusColorClass(selectedRoom.status)}`}>
                <Bed className="w-4.5 h-4.5" />
              </div>
              <div>
                <h5 className="font-extrabold text-slate-950 font-sans">Chambre {selectedRoom.number}</h5>
                <p className="text-[10px] text-slate-500 font-medium">{selectedRoom.category}</p>
              </div>
            </div>

            <div className="space-y-3.5 border-t border-b border-slate-200/60 py-4 mb-4">
              {/* Status details */}
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Statut actuel :</span>
                <span className="font-bold text-slate-800">{getStatusName(selectedRoom.status)}</span>
              </div>

              {/* Price details */}
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Tarif journalier :</span>
                <span className="font-extrabold text-slate-900 font-mono">{selectedRoom.nightlyRate.toLocaleString('fr-FR')} FCFA/nuit</span>
              </div>

              {/* Guest metadata if Occupied / Reserved */}
              {selectedRoom.guestName ? (
                <div className="bg-white p-3 rounded-xl border border-slate-100 space-y-2">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700">
                    <User className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                    <span className="truncate">{selectedRoom.guestName}</span>
                  </div>
                  
                  {selectedRoom.phone && (
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                      <Phone className="w-3 h-3" />
                      <span>{selectedRoom.phone}</span>
                    </div>
                  )}

                  {selectedRoom.checkInDate && (
                    <div className="space-y-1 mt-1 pt-1 border-t border-slate-50">
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-emerald-500" />
                          Arrivée: {selectedRoom.checkInDate}
                        </span>
                        <span>Départ: {selectedRoom.checkOutDate ?? '—'}</span>
                      </div>
                      {selectedRoom.occupants !== undefined && (
                        <div className="text-[10px] text-slate-400">
                          {selectedRoom.occupants} occupant{selectedRoom.occupants > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 italic text-center py-2">
                  Aucun occupant assigné
                </p>
              )}
            </div>

            {/* Quick transition triggers: actions list */}
            <div className="space-y-2">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Actions Rapides PMS
              </span>

              {selectedRoom.status === 'available' && (
                <button
                  onClick={() => onUpdateRoomStatus(selectedRoom.id, 'occupied')}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Enregistrer l'Arrivée (Check-in)</span>
                </button>
              )}

              {selectedRoom.status === 'occupied' && (
                <button
                  onClick={() => onUpdateRoomStatus(selectedRoom.id, 'not-ready')}
                  className="w-full bg-red-50 hover:bg-red-100 text-red-600 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Libérer la Chambre (Check-out)</span>
                </button>
              )}

              {selectedRoom.status === 'not-ready' && (
                <button
                  onClick={() => onUpdateRoomStatus(selectedRoom.id, 'available')}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Marquer Prête & Nettoyée</span>
                </button>
              )}

              {selectedRoom.status === 'reserved' && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onUpdateRoomStatus(selectedRoom.id, 'occupied')}
                    className="bg-orange-600 hover:bg-orange-700 text-white py-1.5 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>Check-in</span>
                  </button>
                  <button
                    onClick={() => onUpdateRoomStatus(selectedRoom.id, 'available')}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <span>Annuler</span>
                  </button>
                </div>
              )}

              <div className="flex gap-2">
                {selectedRoom.status !== 'not-ready' && (
                  <button
                    onClick={() => onUpdateRoomStatus(selectedRoom.id, 'not-ready')}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-1.5 px-2 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Ménage requis</span>
                  </button>
                )}
                {selectedRoom.status !== 'reserved' && selectedRoom.status !== 'occupied' && (
                  <button
                    onClick={() => onUpdateRoomStatus(selectedRoom.id, 'reserved')}
                    className="flex-1 bg-amber-50 hover:bg-amber-100 border border-amber-200/50 text-amber-700 py-1.5 px-2 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>Réserver</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Metrics Legends Block */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-5 border-t border-slate-50 text-xs w-full">
        <div className="flex items-center gap-2.5">
          <span className="w-3.5 h-3.5 rounded bg-orange-500 shadow-sm" />
          <div>
            <span className="font-extrabold text-slate-900 font-mono">{countOccupied}</span>{' '}
            <span className="text-slate-500 font-medium">Occupées</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2.5">
          <span className="w-3.5 h-3.5 rounded bg-emerald-500 shadow-sm" />
          <div>
            <span className="font-extrabold text-slate-900 font-mono">{countAvailable}</span>{' '}
            <span className="text-slate-500 font-medium">Disponibles</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="w-3.5 h-3.5 rounded bg-amber-400 shadow-sm" />
          <div>
            <span className="font-extrabold text-slate-900 font-mono">{countReserved}</span>{' '}
            <span className="text-slate-500 font-medium">Réservées</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="w-3.5 h-3.5 rounded bg-slate-300 shadow-sm" />
          <div>
            <span className="font-extrabold text-slate-900 font-mono">{countNotReady}</span>{' '}
            <span className="text-slate-500 font-medium">Non Prêtes</span>
          </div>
        </div>
      </div>
    </div>
  );
}
