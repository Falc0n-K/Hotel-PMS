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
import { useI18n } from '../lib/i18n';

interface RoomInventoryProps {
  rooms: Room[];
  currentHotel: string;
  currentRole: RBACRole;
  onUpdateRoomStatus: (roomId: string, newStatus: RoomStatus) => void;
  onUpdateRoomDetails: (roomId: string, updatedFields: Partial<Room>) => void;
  onAddRoom: (newRoom: Room) => Promise<boolean>;
  onDeleteRoom: (roomId: string) => Promise<boolean>;
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
  const { tr, lang } = useI18n();
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
  const [newRoomRate, setNewRoomRate] = useState<number>(75000);
  
  // Edit states
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editedRate, setEditedRate] = useState<number>(0);
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
  const handleAddNewRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomNo.trim()) return;

    // Check pre-existence
    const exists = rooms.some(r => r.number === newRoomNo);
    if (exists) {
      triggerToast(tr(`Erreur : La chambre ${newRoomNo} existe déjà dans la base !`, `Error: room ${newRoomNo} already exists!`));
      return;
    }

    const createdRoom: Room = {
      id: `room-${newRoomNo}-${Date.now()}`,
      number: newRoomNo,
      floor: newRoomFloor,
      category: newRoomCategory,
      status: 'available',
      nightlyRate: newRoomRate,
      occupants: 2
    };

    if (!(await onAddRoom(createdRoom))) return;
    setShowAddModal(false);
    setNewRoomNo('');
    triggerToast(tr(`Chambre ${newRoomNo} créée à ${currentHotel}.`, `Room ${newRoomNo} created at ${currentHotel}.`));
  };

  // Trigger inline editing save
  const handleSaveInlineEdit = (roomId: string) => {
    // Le tarif est porté par le type de chambre ; le statut suit les règles
    // du serveur (occupé et réservé ne s'obtiennent que par une réservation).
    onUpdateRoomDetails(roomId, { nightlyRate: editedRate, status: editedStatus });
    setEditingRoomId(null);
  };

  const formatValue = (val: number) => `${val.toLocaleString(lang === 'en' ? 'en-GB' : 'fr-FR')} FCFA`;

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
          <h2 className="text-2xl font-black text-[#09153D] tracking-tight font-sans">{tr('Inventaire Général des Chambres', 'Room inventory')}</h2>
          <p className="text-xs text-slate-400 font-medium">{tr('Revue des unités physiques, administration des disponibilités et des grilles tarifaires', 'Review physical rooms, manage availability and rates')}</p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Add Unit Button */}
          {currentRole === "Propriétaire d'Hôtel" ? (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-md shadow-orange-600/10"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>{tr('Ajouter une Unité', 'Add a room')}</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-100/75 border border-slate-200/50 rounded-xl text-[10.5px] font-bold text-slate-500">
              <Lock className="w-3.5 h-3.5" />
              <span>{tr('Inventaire en lecture seule pour votre rôle', 'Inventory is read-only for your role')}</span>
            </div>
          )}
        </div>
      </div>

      {/* INVENTORY QUICK STATS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-4 w-full">
        {/* Total stats */}
        <div className="bg-white p-4.5 rounded-[20px] border border-slate-100 shadow-sm text-left">
          <span className="text-[9px] font-extrabold text-[#09153D]/50 uppercase tracking-widest block">{tr('Capacité Totalisée', 'Total capacity')}</span>
          <span className="text-2xl font-black text-[#09153D] font-mono block mt-1">{inventoryStats.total}</span>
          <span className="text-[9.5px] text-slate-400 font-medium">{tr('unités filtrées', 'filtered rooms')}</span>
        </div>

        {/* Available stats */}
        <div className="bg-white p-4.5 rounded-[20px] border border-slate-100 shadow-sm text-left">
          <span className="text-[9px] font-extrabold text-emerald-650/80 uppercase tracking-widest block">{tr('Disponibles', 'Available')}</span>
          <span className="text-2xl font-black text-emerald-500 font-mono block mt-1">{inventoryStats.available}</span>
          <span className="text-[9.5px] text-slate-404 font-semibold text-emerald-600 block">{tr('Libres & Nettoyées', 'Vacant & clean')}</span>
        </div>

        {/* Occupied stats */}
        <div className="bg-white p-4.5 rounded-[20px] border border-slate-100 shadow-sm text-left">
          <span className="text-[9px] font-extrabold text-blue-650/80 uppercase tracking-widest block">{tr('Occupées', 'Occupied')}</span>
          <span className="text-2xl font-black text-blue-500 font-mono block mt-1">{inventoryStats.occupied}</span>
          <span className="text-[9.5px] text-slate-400 font-medium">{tr('Arrivées validées', 'Checked-in arrivals')}</span>
        </div>

        {/* Reserved stats */}
        <div className="bg-white p-4.5 rounded-[20px] border border-slate-100 shadow-sm text-left">
          <span className="text-[9px] font-extrabold text-sky-650/80 uppercase tracking-widest block">{tr('Réservées', 'Reserved')}</span>
          <span className="text-2xl font-black text-sky-500 font-mono block mt-1">{inventoryStats.reserved}</span>
          <span className="text-[9.5px] text-slate-400 font-medium">{tr('Garanties en attente', 'Guaranteed, pending')}</span>
        </div>

        {/* Dirty stats */}
        <div className="bg-white p-4.5 rounded-[20px] border border-slate-100 shadow-sm text-left">
          <span className="text-[9px] font-extrabold text-orange-655/80 uppercase tracking-widest block">{tr('En Ménage', 'Housekeeping')}</span>
          <span className="text-2xl font-black text-orange-500 font-mono block mt-1">{inventoryStats.dirty}</span>
          <span className="text-[9.5px] text-slate-404 font-bold text-orange-650">{tr("À inspecter d'urgence", 'To inspect urgently')}</span>
        </div>

        {/* Maintenance stat */}
        <div className="bg-white p-4.5 rounded-[20px] border border-red-100 shadow-sm text-left">
          <span className="text-[9px] font-extrabold text-red-600/80 uppercase tracking-widest block">Maintenance</span>
          <span className="text-2xl font-black text-red-600 font-mono block mt-1">{inventoryStats.maintenance}</span>
          <span className="text-[9.5px] text-red-500 font-bold block">{tr('Stop Service actif', 'Out of order')}</span>
        </div>

        {/* Average cost stat */}
        <div className="bg-white p-4.5 rounded-[20px] border border-slate-100 shadow-sm text-left">
          <span className="text-[9px] font-extrabold text-[#09153D]/50 uppercase tracking-widest block">{tr('Tarif Moyen (ADR)', 'Average rate (ADR)')}</span>
          <span className="text-1.5xl font-black text-[#09153D] font-mono block mt-1.5 truncate">
            {formatValue(inventoryStats.avgRate)}
          </span>
          <span className="text-[9.5px] text-slate-400 font-medium">{tr('par nuitée', 'per night')}</span>
        </div>
      </div>

      {/* FILTERS & SEARCH BAR ROW */}
      <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm text-left">
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-12 gap-4">
          
          {/* Search bar Input */}
          <div className="md:col-span-2 lg:col-span-4 space-y-1.5">
            <label className="block text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest">{tr('Recherche libre :', 'Search:')}</label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={tr('Ex : 204, Standard, Jean...', 'E.g. 204, Standard, John...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50/55 hover:bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Floor selector */}
          <div className="lg:col-span-2 space-y-1.5">
            <label className="block text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest">{tr('Étage :', 'Floor:')}</label>
            <select
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(e.target.value)}
              className="w-full bg-slate-50/55 hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
            >
              {distinctFloors.map(floor => (
                <option key={floor} value={floor}>
                  {floor === 'Tous' ? tr('Tous les étages', 'All floors') : tr(`Étage ${floor}`, `Floor ${floor}`)}
                </option>
              ))}
            </select>
          </div>

          {/* Category Selector */}
          <div className="md:col-span-2 lg:col-span-3 space-y-1.5">
            <label className="block text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest">{tr('Catégorie :', 'Category:')}</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-50/55 hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
            >
              {distinctCategories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'Tous' ? tr('Toutes catégories', 'All categories') : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Status selector */}
          <div className="md:col-span-1 lg:col-span-3 space-y-1.5">
            <label className="block text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest">{tr('Statut PMS :', 'PMS status:')}</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-50/55 hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-705 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
            >
              <option value="Tous">{tr('Tous les statuts', 'All statuses')}</option>
              <option value="available">{tr('Disponible (Libre)', 'Available (vacant)')}</option>
              <option value="occupied">{tr('Occupé (En séjour)', 'Occupied (in house)')}</option>
              <option value="reserved">{tr('Réservé (Confirmé)', 'Reserved (confirmed)')}</option>
              <option value="not-ready">{tr('En Nettoyage (Sale)', 'Being cleaned (dirty)')}</option>
              <option value="maintenance">{tr('Maintenance (Stop Service)', 'Maintenance (out of order)')}</option>
            </select>
          </div>

        </div>
      </div>

      {/* CORE INVENTORY LIST BLOCK */}
      <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm text-left">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-bold text-slate-900 tracking-tight">{tr("Registre d'Inventaire en direct", 'Live inventory register')}</h4>
            <p className="text-[11px] text-slate-450 font-medium">{tr(`Bases physiques et contrôle des tarifs pour ${currentHotel}`, `Physical rooms and rate control for ${currentHotel}`)}</p>
          </div>
          
          <span className="text-[10px] font-bold font-mono text-slate-400 bg-slate-50 border border-slate-100 px-3 py-1 rounded-full">
            {filteredRooms.length} {tr('Unités affichées', 'rooms shown')}
          </span>
        </div>

        {/* Responsive inventory table */}
        <div className="overflow-x-auto border border-slate-100 rounded-2xl">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                <th className="p-4 w-28 text-left">{tr('CHAMBRE N°', 'ROOM NO.')}</th>
                <th className="p-4 w-24 text-center">{tr('ÉTAGE', 'FLOOR')}</th>
                <th className="p-4 text-left">{tr('CATÉGORIE / TYPE', 'CATEGORY / TYPE')}</th>
                <th className="p-4 text-left">{tr('STATUT PMS', 'PMS STATUS')}</th>
                <th className="p-4 text-left">{tr('CLIENT INITIAL CONSIGNÉ', 'REGISTERED GUEST')}</th>
                <th className="p-4 w-44 text-right">{tr('TARIF UNITAIRE', 'UNIT RATE')}</th>
                <th className="p-4 w-32 text-center">{tr('ACTIONS', 'ACTIONS')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredRooms.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400 font-medium italic">
                    {tr('Aucune chambre ne correspond à vos critères de recherche.', 'No room matches your search criteria.')}
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
                            <option value="available">{tr('Propre / disponible', 'Clean / available')}</option>
                            {(room.status === 'occupied' || room.status === 'reserved') && (
                              <option value={room.status} disabled>{room.status === 'occupied' ? tr('Occupé (via réservation)', 'Occupied (via reservation)') : tr('Réservé (via réservation)', 'Reserved (via reservation)')}</option>
                            )}
                            <option value="not-ready">{tr('Sale / En Ménage', 'Dirty / housekeeping')}</option>
                            <option value="maintenance">{tr('Maintenance (Stop Service)', 'Maintenance (out of order)')}</option>
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
                            {room.status === 'available' ? tr('DISPONIBLE', 'AVAILABLE') :
                             room.status === 'occupied' ? tr('OCCUPÉ', 'OCCUPIED') :
                             room.status === 'reserved' ? tr('RÉSERVÉ', 'RESERVED') :
                             room.status === 'maintenance' ? tr('🔧 MAINTENANCE', '🔧 MAINTENANCE') :
                             tr('EN NETTOYAGE', 'BEING CLEANED')}
                          </span>
                        )}
                      </td>

                      {/* Current Guest registered details */}
                      <td className="p-4 text-left">
                        {room.guestName ? (
                          <span className="font-extrabold text-slate-800 flex items-center gap-1">
                            <span className="text-slate-400 font-mono text-[9px] font-normal">👤</span>
                            {room.guestName}
                          </span>
                        ) : (
                          <span className="text-slate-404 italic text-[11px]">{tr('Aucun client actuellement', 'No guest currently')}</span>
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
                                title={tr('Sauvegarder', 'Save')}
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingRoomId(null)}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-605 p-1.5 rounded-lg transition-colors cursor-pointer"
                                title={tr('Annuler', 'Cancel')}
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
                                  setEditedStatus(room.status);
                                }}
                                className="bg-slate-50 hover:bg-orange-50 border border-slate-200/60 text-slate-600 hover:text-orange-600 p-1.5 rounded-lg transition-all cursor-pointer"
                                title={tr('Modifier', 'Edit')}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Toggle laundry quick action (Responsable Ménage friendly) */}
                              {room.status === 'not-ready' && (
                                <button
                                  onClick={() => {
                                    onUpdateRoomStatus(room.id, 'available');
                                  }}
                                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 hover:text-emerald-700 p-1.5 rounded-lg border border-emerald-100/50 transition-colors cursor-pointer"
                                  title={tr('Approuver le ménage', 'Approve housekeeping')}
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
                                    }}
                                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 p-1.5 rounded-lg border border-emerald-100 transition-colors cursor-pointer"
                                    title={tr('Lever la maintenance', 'End maintenance')}
                                  >
                                    <span className="text-[11px]">✓</span>
                                  </button>
                                ) : room.status !== 'occupied' && (
                                  <button
                                    onClick={() => {
                                      onUpdateRoomStatus(room.id, 'maintenance');
                                    }}
                                    className="bg-red-50 hover:bg-red-100 text-red-500 p-1.5 rounded-lg border border-red-100 transition-colors cursor-pointer"
                                    title={tr('Stop Service / Maintenance', 'Out of order / maintenance')}
                                  >
                                    <span className="text-[11px]">🔧</span>
                                  </button>
                                )
                              )}

                              {/* Delete unit (Propriétaire Only) */}
                              {currentRole === "Propriétaire d'Hôtel" && (
                                <button
                                  onClick={() => {
                                    if (confirm(tr(`Êtes-vous certain de vouloir supprimer la chambre ${room.number} de l'inventaire ?`, `Are you sure you want to remove room ${room.number} from the inventory?`))) {
                                      onDeleteRoom(room.id).then(ok => ok && triggerToast(tr(`Chambre ${room.number} retirée de l'inventaire.`, `Room ${room.number} removed from the inventory.`)));
                                    }
                                  }}
                                  className="bg-red-50 hover:bg-red-105 border border-red-100 text-red-500 hover:text-red-650 p-1.5 rounded-lg transition-all cursor-pointer"
                                  title={tr('Retirer', 'Remove')}
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
                  <h3 className="font-extrabold text-white text-md tracking-tight">{tr('Nouvelle Chambre / Unité', 'New room')}</h3>
                  <p className="text-[10px] text-orange-100 font-medium">{currentHotel} - {tr('Enregistrement PMS', 'PMS registration')}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                aria-label={tr('Fermer', 'Close')}
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
                    {tr('Numéro de Chambre :', 'Room number:')}
                  </label>
                  <input
                    type="text"
                    placeholder={tr('Ex: 115, 304...', 'E.g. 115, 304...')}
                    value={newRoomNo}
                    onChange={(e) => setNewRoomNo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-705 p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500"
                    required
                  />
                </div>

                {/* Floor */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    {tr('Numéro d’Étage :', 'Floor number:')}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={200}
                    value={newRoomFloor}
                    onChange={(e) => setNewRoomFloor(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-705 p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500"
                    required
                  />
                </div>
              </div>

              {/* Category selector */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  {tr('Type de Chambre / Catégorie :', 'Room type / category:')}
                </label>
                <input
                  list="room-categories"
                  value={newRoomCategory}
                  onChange={(e) => {
                    setNewRoomCategory(e.target.value);
                    const existing = rooms.find(r => r.category === e.target.value);
                    if (existing) setNewRoomRate(existing.nightlyRate);
                  }}
                  placeholder={tr('Ex : Chambre Standard', 'E.g. Standard Room')}
                  className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-705 p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500"
                  required
                  minLength={2}
                />
                <datalist id="room-categories">
                  {distinctCategories.filter(c => c !== 'Tous').map(c => <option key={c} value={c} />)}
                </datalist>
                <p className="text-[10px] text-slate-400">{tr('Un nouveau nom crée un type de chambre ; le tarif s’applique à toutes les chambres du type.', 'A new name creates a room type; the rate applies to every room of that type.')}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Nightly price FCFA */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    {tr('Tarif par nuitée (FCFA) :', 'Nightly rate (FCFA):')}
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={newRoomRate}
                    onChange={(e) => setNewRoomRate(parseInt(e.target.value) || 75000)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-[#09153D] p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500"
                    required
                  />
                </div>

              </div>

              {/* Action submit button footer */}
              <div className="pt-4 border-t border-slate-50 flex items-center justify-end gap-3.5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4.5 py-3 hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl transition-colors cursor-pointer"
                >
                  {tr('Annuler la saisie', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs px-5 py-3 rounded-xl transition-colors cursor-pointer shadow-md shadow-orange-600/10"
                >
                  {tr("Valider l'Ajout", 'Add room')}
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
