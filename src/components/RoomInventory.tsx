/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  BedDouble, 
  Search, 
  Check, 
  Plus, 
  TrendingUp, 
  DollarSign, 
  SlidersHorizontal,
  BadgeAlert, 
  Sparkles,
  BookOpen,
  Trash2,
  Trash,
  User,
  Activity,
  CalendarCheck,
  Edit2,
  CheckCircle2,
  Lock,
  Brush,
  Utensils
} from 'lucide-react';
import { Room, RoomStatus, RBACRole } from '../types';

interface RoomInventoryProps {
  rooms: Room[];
  currentHotel: string;
  currentRole: RBACRole;
  onUpdateRoomStatus: (roomId: string, newStatus: RoomStatus) => void;
  onUpdateRoomDetails: (roomId: string, updatedFields: Partial<Room>) => void;
  onAddRoom: (newRoom: Room) => void;
  onDeleteRoom: (roomId: string) => void;
}

export default function RoomInventory({
  rooms,
  currentHotel,
  currentRole,
  onUpdateRoomStatus,
  onUpdateRoomDetails,
  onAddRoom,
  onDeleteRoom
}: RoomInventoryProps) {
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFloor, setSelectedFloor] = useState<string>('Tous');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tous');
  const [selectedStatus, setSelectedStatus] = useState<string>('Tous');

  // Form states
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRoomNo, setNewRoomNo] = useState('');
  const [newRoomFloor, setNewRoomFloor] = useState<number>(1);
  const [newRoomCategory, setNewRoomCategory] = useState('Chambre Standard');
  const [newRoomStatus, setNewRoomStatus] = useState<RoomStatus>('available');
  const [newRoomRate, setNewRoomRate] = useState<number>(75000);
  
  // Edit states
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editedRate, setEditedRate] = useState<number>(0);
  const [editedGuest, setEditedGuest] = useState('');
  const [editedStatus, setEditedStatus] = useState<RoomStatus>('available');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3050);
  };

  // Get distinct floors & categories from the active hotel rooms for the dropdowns
  const distinctFloors = useMemo(() => {
    const floorsSet = new Set(rooms.map(r => r.floor.toString()));
    return ['Tous', ...Array.from(floorsSet).sort()];
  }, [rooms]);

  const distinctCategories = useMemo(() => {
    const catsSet = new Set(rooms.map(r => r.category));
    return ['Tous', ...Array.from(catsSet).sort()];
  }, [rooms]);

  // Handle adding room
  const handleAddNewRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomNo.trim()) return;

    // Check pre-existence
    const exists = rooms.some(r => r.number === newRoomNo);
    if (exists) {
      triggerToast(`Erreur : La chambre ${newRoomNo} existe déjà dans la base !`);
      return;
    }

    const createdRoom: Room = {
      id: `room-${newRoomNo}-${Date.now()}`,
      number: newRoomNo,
      floor: newRoomFloor,
      category: newRoomCategory,
      status: newRoomStatus,
      nightlyRate: newRoomRate,
      occupants: 2
    };

    onAddRoom(createdRoom);
    setShowAddModal(false);
    setNewRoomNo('');
    triggerToast(`Chambre ${newRoomNo} créée à l'établissement ${currentHotel} !`);
  };

  // Trigger inline editing save
  const handleSaveInlineEdit = (roomId: string) => {
    if (currentRole === 'Responsable Ménage' && editedStatus !== 'available' && editedStatus !== 'not-ready') {
      triggerToast("Accès restreint : Le Responsable Ménage peut uniquement changer le statut Ménage ('Disponible' ou 'En Nettoyage').");
      return;
    }

    const updates: Partial<Room> = {
      nightlyRate: editedRate,
      status: editedStatus,
      guestName: editedGuest ? editedGuest : undefined
    };

    onUpdateRoomDetails(roomId, updates);
    setEditingRoomId(null);
    triggerToast("Chambre mise à jour avec succès.");
  };

  const formatValue = (val: number) => `${val.toLocaleString('fr-FR')} FCFA`;

  // Filter actual rooms logic
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      const matchesSearch = r.number.includes(searchQuery) || 
                            (r.guestName && r.guestName.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            r.category.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesFloor = selectedFloor === 'Tous' || r.floor.toString() === selectedFloor;
      const matchesCategory = selectedCategory === 'Tous' || r.category === selectedCategory;
      const matchesStatus = selectedStatus === 'Tous' || r.status === selectedStatus;

      return matchesSearch && matchesFloor && matchesCategory && matchesStatus;
    });
  }, [rooms, searchQuery, selectedFloor, selectedCategory, selectedStatus]);

  // Static computed statistics for active room filters
  const inventoryStats = useMemo(() => {
    const total = filteredRooms.length;
    const occupied = filteredRooms.filter(r => r.status === 'occupied').length;
    const available = filteredRooms.filter(r => r.status === 'available').length;
    const reserved = filteredRooms.filter(r => r.status === 'reserved').length;
    const dirty = filteredRooms.filter(r => r.status === 'not-ready').length;
    const maintenance = filteredRooms.filter(r => r.status === 'maintenance').length;

    const totalRate = filteredRooms.reduce((acc, curr) => acc + curr.nightlyRate, 0);
    const avgRate = total > 0 ? Math.round(totalRate / total) : 0;

    return { total, occupied, available, reserved, dirty, maintenance, avgRate };
  }, [filteredRooms]);

  return (
    <div className="space-y-6 fade-in-up">
      
      {/* Dynamic Floating Toast notification */}
      {toastMessage && (
        <div className="bg-[#09153D] text-white px-4 py-3 rounded-[18px] text-xs font-bold shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-3 duration-250 fixed top-6 right-6 z-50 max-w-sm border border-slate-700/80">
          <Sparkles className="w-4 h-4 text-orange-400 shrink-0" />
          <span className="leading-snug text-left">{toastMessage}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#09153D] tracking-tight font-sans">Inventaire Général des Chambres</h2>
          <p className="text-xs text-slate-400 font-medium">Revue des unités physiques, administration des disponibilités et des grilles tarifaires</p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Add Unit Button */}
          {currentRole !== 'Directeur Financier' ? (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-md shadow-orange-600/10"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Ajouter une Unité</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-100/75 border border-slate-200/50 rounded-xl text-[10.5px] font-bold text-slate-500">
              <Lock className="w-3.5 h-3.5" />
              <span>Inventaire bloqué (Dir. Financier)</span>
            </div>
          )}
        </div>
      </div>

      {/* INVENTORY QUICK STATS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-4 w-full">
        {/* Total stats */}
        <div className="bg-white p-4.5 rounded-[20px] border border-slate-100 shadow-sm text-left">
          <span className="text-[9px] font-extrabold text-[#09153D]/50 uppercase tracking-widest block">Capacité Totalisée</span>
          <span className="text-2xl font-black text-[#09153D] font-mono block mt-1">{inventoryStats.total}</span>
          <span className="text-[9.5px] text-slate-400 font-medium">unités filtrées</span>
        </div>

        {/* Available stats */}
        <div className="bg-white p-4.5 rounded-[20px] border border-slate-100 shadow-sm text-left">
          <span className="text-[9px] font-extrabold text-emerald-650/80 uppercase tracking-widest block">Disponibles</span>
          <span className="text-2xl font-black text-emerald-500 font-mono block mt-1">{inventoryStats.available}</span>
          <span className="text-[9.5px] text-slate-404 font-semibold text-emerald-600 block">Libres & Nettoyées</span>
        </div>

        {/* Occupied stats */}
        <div className="bg-white p-4.5 rounded-[20px] border border-slate-100 shadow-sm text-left">
          <span className="text-[9px] font-extrabold text-blue-650/80 uppercase tracking-widest block">Occupées</span>
          <span className="text-2xl font-black text-blue-500 font-mono block mt-1">{inventoryStats.occupied}</span>
          <span className="text-[9.5px] text-slate-400 font-medium">Arrivées validées</span>
        </div>

        {/* Reserved stats */}
        <div className="bg-white p-4.5 rounded-[20px] border border-slate-100 shadow-sm text-left">
          <span className="text-[9px] font-extrabold text-sky-650/80 uppercase tracking-widest block">Réservées</span>
          <span className="text-2xl font-black text-sky-500 font-mono block mt-1">{inventoryStats.reserved}</span>
          <span className="text-[9.5px] text-slate-400 font-medium">Garanties en attente</span>
        </div>

        {/* Dirty stats */}
        <div className="bg-white p-4.5 rounded-[20px] border border-slate-100 shadow-sm text-left">
          <span className="text-[9px] font-extrabold text-orange-655/80 uppercase tracking-widest block">En Ménage</span>
          <span className="text-2xl font-black text-orange-500 font-mono block mt-1">{inventoryStats.dirty}</span>
          <span className="text-[9.5px] text-slate-404 font-bold text-orange-650">À inspecter d'urgence</span>
        </div>

        {/* Maintenance stat */}
        <div className="bg-white p-4.5 rounded-[20px] border border-red-100 shadow-sm text-left">
          <span className="text-[9px] font-extrabold text-red-600/80 uppercase tracking-widest block">Maintenance</span>
          <span className="text-2xl font-black text-red-600 font-mono block mt-1">{inventoryStats.maintenance}</span>
          <span className="text-[9.5px] text-red-500 font-bold block">Stop Service actif</span>
        </div>

        {/* Average cost stat */}
        <div className="bg-white p-4.5 rounded-[20px] border border-slate-100 shadow-sm text-left">
          <span className="text-[9px] font-extrabold text-[#09153D]/50 uppercase tracking-widest block">Tarif Moyen (ADR)</span>
          <span className="text-1.5xl font-black text-[#09153D] font-mono block mt-1.5 truncate">
            {formatValue(inventoryStats.avgRate)}
          </span>
          <span className="text-[9.5px] text-slate-400 font-medium">par nuitée</span>
        </div>
      </div>

      {/* FILTERS & SEARCH BAR ROW */}
      <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm text-left">
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-12 gap-4">
          
          {/* Search bar Input */}
          <div className="md:col-span-2 lg:col-span-4 space-y-1.5">
            <label className="block text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest">Recherche libre :</label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Ex : 204, Standard, Jean..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50/55 hover:bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Floor selector */}
          <div className="lg:col-span-2 space-y-1.5">
            <label className="block text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest">Étage :</label>
            <select
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(e.target.value)}
              className="w-full bg-slate-50/55 hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
            >
              {distinctFloors.map(floor => (
                <option key={floor} value={floor}>
                  {floor === 'Tous' ? 'Tous les étages' : `Étage ${floor}`}
                </option>
              ))}
            </select>
          </div>

          {/* Category Selector */}
          <div className="md:col-span-2 lg:col-span-3 space-y-1.5">
            <label className="block text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest">Catégorie :</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-50/55 hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
            >
              {distinctCategories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'Tous' ? 'Toutes catégories' : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Status selector */}
          <div className="md:col-span-1 lg:col-span-3 space-y-1.5">
            <label className="block text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest">Statut PMS :</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-50/55 hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-705 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
            >
              <option value="Tous">Tous les statuts</option>
              <option value="available">Disponible (Libre)</option>
              <option value="occupied">Occupé (En séjour)</option>
              <option value="reserved">Réservé (Confirmé)</option>
              <option value="not-ready">En Nettoyage (Sale)</option>
              <option value="maintenance">Maintenance (Stop Service)</option>
            </select>
          </div>

        </div>
      </div>

      {/* CORE INVENTORY LIST BLOCK */}
      <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm text-left">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-bold text-slate-900 tracking-tight">Registre d'Inventaire en direct</h4>
            <p className="text-[11px] text-slate-450 font-medium">Bases physiques et contrôle des tarifs pour {currentHotel}</p>
          </div>
          
          <span className="text-[10px] font-bold font-mono text-slate-400 bg-slate-50 border border-slate-100 px-3 py-1 rounded-full">
            {filteredRooms.length} Unités affichées
          </span>
        </div>

        {/* Responsive inventory table */}
        <div className="overflow-x-auto border border-slate-100 rounded-2xl">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                <th className="p-4 w-28 text-left">CHAMBRE N°</th>
                <th className="p-4 w-24 text-center">ÉTAGE</th>
                <th className="p-4 text-left">CATÉGORIE / TYPE</th>
                <th className="p-4 text-left">STATUT PMS</th>
                <th className="p-4 text-left">CLIENT INITIAL CONSIGNÉ</th>
                <th className="p-4 w-44 text-right">TARIF UNITAIRE</th>
                <th className="p-4 w-32 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredRooms.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400 font-medium italic">
                    Aucune chambre ne correspond à vos critères de recherche.
                  </td>
                </tr>
              ) : (
                filteredRooms.map((room) => {
                  const isEditing = editingRoomId === room.id;
                  return (
                    <tr 
                      key={room.id} 
                      className={`hover:bg-slate-50/30 transition-colors ${
                        isEditing ? 'bg-orange-50/20' : ''
                      }`}
                    >
                      {/* Room number indicator block */}
                      <td className="p-4 text-left">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center font-bold text-[#09153D] font-mono">
                            {room.number}
                          </div>
                        </div>
                      </td>

                      {/* Floor Indicator */}
                      <td className="p-4 text-center font-bold font-mono text-slate-500">
                        {room.floor}
                      </td>

                      {/* Room class */}
                      <td className="p-4 text-left font-semibold text-slate-700">
                        {room.category}
                      </td>

                      {/* Room status */}
                      <td className="p-4 text-left">
                        {isEditing ? (
                          <select
                            value={editedStatus}
                            onChange={(e) => setEditedStatus(e.target.value as RoomStatus)}
                            className="bg-white border border-slate-200 rounded px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
                          >
                            <option value="available">Disponible</option>
                            <option value="occupied">Occupé</option>
                            <option value="reserved">Réservé</option>
                            <option value="not-ready">Sale / En Ménage</option>
                            <option value="maintenance">Maintenance (Stop Service)</option>
                          </select>
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 text-[10px] font-extrabold px-3 py-1 rounded-full ${
                            room.status === 'available' ? 'bg-emerald-50 text-emerald-600' :
                            room.status === 'occupied' ? 'bg-blue-50 text-blue-600' :
                            room.status === 'reserved' ? 'bg-sky-50 text-sky-600' :
                            room.status === 'maintenance' ? 'bg-red-50 text-red-600' :
                            'bg-orange-50 text-orange-600'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              room.status === 'available' ? 'bg-emerald-500' :
                              room.status === 'occupied' ? 'bg-blue-500' :
                              room.status === 'reserved' ? 'bg-sky-500' :
                              room.status === 'maintenance' ? 'bg-red-500' :
                              'bg-orange-500'
                            }`} />
                            {room.status === 'available' ? 'DISPONIBLE' :
                             room.status === 'occupied' ? 'OCCUPÉ' :
                             room.status === 'reserved' ? 'RÉSERVÉ' :
                             room.status === 'maintenance' ? '🔧 MAINTENANCE' :
                             'EN NETTOYAGE'}
                          </span>
                        )}
                      </td>

                      {/* Current Guest registered details */}
                      <td className="p-4 text-left">
                        {isEditing ? (
                          <div className="relative w-40">
                            <User className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                              type="text"
                              value={editedGuest}
                              onChange={(e) => setEditedGuest(e.target.value)}
                              placeholder="Aucun client..."
                              className="w-full bg-white border border-slate-200 text-xs text-slate-700 rounded pl-7 pr-2 py-1 focus:outline-none focus:ring-1 focus:ring-orange-500"
                            />
                          </div>
                        ) : room.guestName ? (
                          <span className="font-extrabold text-slate-800 flex items-center gap-1">
                            <span className="text-slate-400 font-mono text-[9px] font-normal">👤</span>
                            {room.guestName}
                          </span>
                        ) : (
                          <span className="text-slate-404 italic text-[11px]">Aucun client actuellement</span>
                        )}
                      </td>

                      {/* Nightly price rates edit inline */}
                      <td className="p-4 text-right font-black font-mono text-[#09153D]">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-[10px] text-slate-400">FCFA</span>
                            <input
                              type="number"
                              value={editedRate}
                              onChange={(e) => setEditedRate(parseInt(e.target.value) || 0)}
                              className="w-24 bg-white border border-slate-200 text-xs text-right font-bold text-[#09153D] rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-orange-500"
                            />
                          </div>
                        ) : (
                          formatValue(room.nightlyRate)
                        )}
                      </td>

                      {/* Actions toolbar */}
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => handleSaveInlineEdit(room.id)}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white p-1.5 rounded-lg transition-colors cursor-pointer"
                                title="Sauvegarder"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingRoomId(null)}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-605 p-1.5 rounded-lg transition-colors cursor-pointer"
                                title="Annuler"
                              >
                                ✕
                              </button>
                            </>
                          ) : (
                            <>
                              {/* Edit triggers inline */}
                              <button
                                onClick={() => {
                                  setEditingRoomId(room.id);
                                  setEditedRate(room.nightlyRate);
                                  setEditedGuest(room.guestName || '');
                                  setEditedStatus(room.status);
                                }}
                                className="bg-slate-50 hover:bg-orange-50 border border-slate-200/60 text-slate-600 hover:text-orange-600 p-1.5 rounded-lg transition-all cursor-pointer"
                                title="Modifier"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Toggle laundry quick action (Responsable Ménage friendly) */}
                              {room.status === 'not-ready' && (
                                <button
                                  onClick={() => {
                                    onUpdateRoomStatus(room.id, 'available');
                                    triggerToast(`Chambre ${room.number} marquée comme propre.`);
                                  }}
                                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 hover:text-emerald-700 p-1.5 rounded-lg border border-emerald-100/50 transition-colors cursor-pointer"
                                  title="Approuver le ménage"
                                >
                                  <CheckSquare className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Stop Service / Maintenance toggle */}
                              {currentRole !== 'Responsable Ménage' && currentRole !== 'Directeur Financier' && (
                                room.status === 'maintenance' ? (
                                  <button
                                    onClick={() => {
                                      onUpdateRoomStatus(room.id, 'available');
                                      triggerToast(`Chambre ${room.number} : maintenance levée, chambre disponible.`);
                                    }}
                                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 p-1.5 rounded-lg border border-emerald-100 transition-colors cursor-pointer"
                                    title="Lever la maintenance"
                                  >
                                    <span className="text-[11px]">✓</span>
                                  </button>
                                ) : room.status !== 'occupied' && (
                                  <button
                                    onClick={() => {
                                      onUpdateRoomStatus(room.id, 'maintenance');
                                      triggerToast(`Chambre ${room.number} mise en maintenance (Stop Service).`);
                                    }}
                                    className="bg-red-50 hover:bg-red-100 text-red-500 p-1.5 rounded-lg border border-red-100 transition-colors cursor-pointer"
                                    title="Stop Service / Maintenance"
                                  >
                                    <span className="text-[11px]">🔧</span>
                                  </button>
                                )
                              )}

                              {/* Delete unit (Propriétaire Only) */}
                              {currentRole === "Propriétaire d'Hôtel" && (
                                <button
                                  onClick={() => {
                                    if (confirm(`Êtes-vous certain de vouloir supprimer la chambre ${room.number} de l'inventaire ?`)) {
                                      onDeleteRoom(room.id);
                                      triggerToast(`Chambre ${room.number} supprimée.`);
                                    }
                                  }}
                                  className="bg-red-50 hover:bg-red-105 border border-red-100 text-red-500 hover:text-red-650 p-1.5 rounded-lg transition-all cursor-pointer"
                                  title="Retirer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* 5. ADD UNIT DRAWER MODAL OVERLAY */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-[#09153D]/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] border border-slate-150/80 shadow-2xl max-w-md w-full overflow-hidden text-left animate-in zoom-in-95 duration-200">
            {/* Modal header decoration */}
            <div className="p-6 bg-gradient-to-r from-orange-600 to-amber-500 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BedDouble className="w-5.5 h-5.5" />
                <div>
                  <h3 className="font-extrabold text-white text-md tracking-tight">Nouvelle Chambre / Unité</h3>
                  <p className="text-[10px] text-orange-100 font-medium">{currentHotel} - Enregistrement PMS</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-white hover:text-orange-200 cursor-pointer text-sm font-bold bg-white/10 w-7 h-7 rounded-full flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Modal body form */}
            <form onSubmit={handleAddNewRoomSubmit} className="p-6 space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                {/* Room number */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Numéro de Chambre :
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 115, 304..."
                    value={newRoomNo}
                    onChange={(e) => setNewRoomNo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-705 p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500"
                    required
                  />
                </div>

                {/* Floor */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Numéro d’Étage :
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={newRoomFloor}
                    onChange={(e) => setNewRoomFloor(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-705 p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500"
                    required
                  />
                </div>
              </div>

              {/* Category selector */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  Type de Chambre / Catégorie :
                </label>
                <select
                  value={newRoomCategory}
                  onChange={(e) => setNewRoomCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-705 p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
                >
                  <option value="Chambre Standard">Chambre Standard</option>
                  <option value="Chambre Supérieure">Chambre Supérieure</option>
                  <option value="Chambre Deluxe Océan">Chambre Deluxe Océan</option>
                  <option value="Suite Royale Swim-up">Suite Royale Swim-up</option>
                  <option value="Bungalow Jardin">Bungalow Jardin</option>
                  <option value="Bungalow Vue Saloum">Bungalow Vue Saloum</option>
                  <option value="Bungalow Piloti Premium">Bungalow Piloti Premium</option>
                  <option value="Suite Fleuve Casamance">Suite Fleuve Casamance</option>
                  <option value="Chambre Confort Balcon">Chambre Confort Balcon</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Nightly price FCFA */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Tarif par nuitée (FCFA) :
                  </label>
                  <input
                    type="number"
                    min={1000}
                    step={1000}
                    value={newRoomRate}
                    onChange={(e) => setNewRoomRate(parseInt(e.target.value) || 75000)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-[#09153D] p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500"
                    required
                  />
                </div>

                {/* Status initial */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Statut de Départ :
                  </label>
                  <select
                    value={newRoomStatus}
                    onChange={(e) => setNewRoomStatus(e.target.value as RoomStatus)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-705 p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
                  >
                    <option value="available">Disponible (Propre)</option>
                    <option value="not-ready">Sale (En Nettoyage)</option>
                    <option value="reserved">Réservée</option>
                  </select>
                </div>
              </div>

              {/* Action submit button footer */}
              <div className="pt-4 border-t border-slate-50 flex items-center justify-end gap-3.5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4.5 py-3 hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl transition-colors cursor-pointer"
                >
                  Annuler la saisie
                </button>
                <button
                  type="submit"
                  className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs px-5 py-3 rounded-xl transition-colors cursor-pointer shadow-md shadow-orange-600/10"
                >
                  Valider l'Ajout
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// Minimal auxiliary component for check inline task
function CheckSquare({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}
