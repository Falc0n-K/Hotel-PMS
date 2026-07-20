/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  CalendarDays, 
  User, 
  Phone, 
  Mail, 
  BedDouble, 
  Clock, 
  Plus, 
  Search, 
  Check, 
  Sparkles, 
  Trash2, 
  UserCheck, 
  Signpost, 
  ArrowRightLeft, 
  Coffee, 
  DollarSign, 
  CalendarCheck2, 
  UserPlus,
  AlertTriangle 
} from 'lucide-react';
import { Room, RoomStatus, RBACRole } from '../types';

interface BookingsDeskProps {
  rooms: Room[];
  currentHotel: string;
  currentRole: RBACRole;
  onUpdateRoomStatusAndGuest: (roomNumber: string, status: RoomStatus, guestName?: string, checkIn?: string, checkOut?: string) => void;
  onAddNotification: (title: string, message: string, type: 'réservation' | 'paiement' | 'alerte' | 'info') => void;
}

interface ReservationItem {
  id: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  roomNo: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  durationNights: number;
  breakfastIncluded: boolean;
  totalAmount: number;
  status: 'Confirmé' | 'Arrivé' | 'Terminé' | 'Annulé';
  paymentStatus: 'Payé' | 'Acompte' | 'Non Payé';
  hotelName: string;
  notes?: string;
}

export default function BookingsDesk({
  rooms,
  currentHotel,
  currentRole,
  onUpdateRoomStatusAndGuest,
  onAddNotification
}: BookingsDeskProps) {
  // Local state holding the list of reservations across the group
  const [reservations, setReservations] = useState<ReservationItem[]>([
    {
      id: 'RES-RS-206',
      guestName: 'Alastair Cook',
      guestEmail: 'a.cook@cricket.uk',
      guestPhone: '+44 7911 123456',
      roomNo: '104',
      roomType: 'Suite Royale Swim-up',
      checkIn: '2026-05-18',
      checkOut: '2026-05-24',
      durationNights: 6,
      breakfastIncluded: true,
      totalAmount: 510000,
      status: 'Arrivé',
      paymentStatus: 'Payé',
      hotelName: 'Royal Saly',
      notes: 'Navette aéroport requise.'
    },
    {
      id: 'RES-NK-102',
      guestName: 'Sokhna Diagne',
      guestEmail: 'sokhna.diagne@gmail.com',
      guestPhone: '+221 77 654 32 10',
      roomNo: '102',
      roomType: 'Chambre Confort Balcon',
      checkIn: '2026-05-19',
      checkOut: '2026-05-23',
      durationNights: 4,
      breakfastIncluded: false,
      totalAmount: 220000,
      status: 'Arrivé',
      paymentStatus: 'Payé',
      hotelName: 'Nema Kadior',
      notes: 'Demande chambre proche ascenseur.'
    },
    {
      id: 'RES-PS-305',
      guestName: 'Elena Rostova',
      guestEmail: 'elena.rostova@yandex.ru',
      guestPhone: '+7 901 234 5678',
      roomNo: '201',
      roomType: 'Bungalow Piloti Premium',
      checkIn: '2026-05-20',
      checkOut: '2026-05-26',
      durationNights: 6,
      breakfastIncluded: true,
      totalAmount: 591000,
      status: 'Confirmé',
      paymentStatus: 'Acompte',
      hotelName: 'Les Pélicans du Saloum'
    },
    {
      id: 'RES-RS-112',
      guestName: 'Marcus Aurel',
      guestEmail: 'm.aurel@rome.it',
      guestPhone: '+39 06 1234567',
      roomNo: '112',
      roomType: 'Chambre Standard',
      checkIn: '2026-05-22',
      checkOut: '2026-05-25',
      durationNights: 3,
      breakfastIncluded: true,
      totalAmount: 250500,
      status: 'Confirmé',
      paymentStatus: 'Non Payé',
      hotelName: 'Royal Saly',
      notes: 'Check-in tardif.'
    },
    {
      id: 'RES-NK-115',
      guestName: 'Jean-Pierre Durand',
      guestEmail: 'jp.durand@wanadoo.fr',
      guestPhone: '+33 6 1234 5678',
      roomNo: '204',
      roomType: 'Chambre Confort Balcon',
      checkIn: '2026-05-10',
      checkOut: '2026-05-15',
      durationNights: 5,
      breakfastIncluded: true,
      totalAmount: 317500,
      status: 'Terminé',
      paymentStatus: 'Payé',
      hotelName: 'Nema Kadior'
    }
  ]);

  // UI state controllers
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tous');
  const [showAddFormModal, setShowAddFormModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);

  // New Booking form dynamic states
  const [formGuestName, setFormGuestName] = useState('');
  const [formGuestEmail, setFormGuestEmail] = useState('');
  const [formGuestPhone, setFormGuestPhone] = useState('');
  const [formRoomNo, setFormRoomNo] = useState('');
  const [formGuestCount, setFormGuestCount] = useState<number>(2);
  const [formCheckIn, setFormCheckIn] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [formCheckOut, setFormCheckOut] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [formBreakfast, setFormBreakfast] = useState(true);
  const [formPaymentStatus, setFormPaymentStatus] = useState<'Payé' | 'Acompte' | 'Non Payé'>('Non Payé');
  const [formNotes, setFormNotes] = useState('');

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Compute stay length — negative if checkout ≤ checkin (invalid)
  const formNightsCount = useMemo(() => {
    try {
      const start = new Date(formCheckIn);
      const end = new Date(formCheckOut);
      const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return isNaN(diffDays) ? 0 : diffDays;
    } catch {
      return 0;
    }
  }, [formCheckIn, formCheckOut]);

  // Selected room rate details
  const selectedRoomDetails = useMemo(() => {
    if (!formRoomNo) return null;
    return rooms.find(r => r.number === formRoomNo) || null;
  }, [formRoomNo, rooms]);

  // Compute price inline
  const computedTotalAmount = useMemo(() => {
    if (!selectedRoomDetails || formNightsCount <= 0) return 0;
    const roomCost = selectedRoomDetails.nightlyRate * formNightsCount;
    const breakfastCost = formBreakfast ? (8500 * formNightsCount * formGuestCount) : 0;
    return roomCost + breakfastCost;
  }, [selectedRoomDetails, formNightsCount, formBreakfast, formGuestCount]);

  // List of active reservations belonging strictly to the selected hotel property
  const hotelReservations = useMemo(() => {
    return reservations.filter(res => res.hotelName === currentHotel);
  }, [reservations, currentHotel]);

  // Search and filter operations
  const filteredBookings = useMemo(() => {
    return hotelReservations.filter(res => {
      const matchesSearch = res.guestName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            res.roomNo.includes(searchQuery) || 
                            res.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            res.roomType.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'Tous' || res.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [hotelReservations, searchQuery, statusFilter]);

  // Save New reservation record
  const handleCreateReservation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formGuestName.trim() || !formRoomNo) {
      triggerToast("Veuillez renseigner le nom du client principal et le numéro de chambre.");
      return;
    }
    if (formNightsCount <= 0) {
      triggerToast("La date de départ doit être postérieure à la date d'arrivée.");
      return;
    }

    const matchedRoom = rooms.find(r => r.number === formRoomNo);
    if (!matchedRoom) return;

    const reservationPrefix = currentHotel === 'Royal Saly' ? 'RS' : currentHotel === 'Nema Kadior' ? 'NK' : 'PS';
    const uniqueResId = `RES-${reservationPrefix}-${Date.now().toString(36).toUpperCase().slice(-6)}`;

    const newResItem: ReservationItem = {
      id: uniqueResId,
      guestName: formGuestName,
      guestEmail: formGuestEmail || '',
      guestPhone: formGuestPhone || '',
      roomNo: formRoomNo,
      roomType: matchedRoom.category,
      checkIn: formCheckIn,
      checkOut: formCheckOut,
      durationNights: formNightsCount,
      breakfastIncluded: formBreakfast,
      totalAmount: computedTotalAmount,
      status: 'Confirmé',
      paymentStatus: formPaymentStatus,
      hotelName: currentHotel,
      notes: formNotes
    };

    // Add reservation item
    setReservations(prev => [newResItem, ...prev]);
    
    // Update the room state in our master data to 'reserved' (synchronized behavior)
    onUpdateRoomStatusAndGuest(formRoomNo, 'reserved', formGuestName, formCheckIn, formCheckOut);

    // Notify the user
    onAddNotification(
      "Nouvelle réservation",
      `Réservation enregistrée pour ${formGuestName} en chambre ${formRoomNo}. Total: ${computedTotalAmount.toLocaleString('fr-FR')} FCFA.`,
      'réservation'
    );

    setShowAddFormModal(false);
    setFormGuestName('');
    setFormGuestEmail('');
    setFormGuestPhone('');
    setFormNotes('');
    setFormGuestCount(2);
    triggerToast(`Réservation ${uniqueResId} enregistrée en Chambre ${formRoomNo} !`);
  };

  // CheckIn Operation (Arrival transition)
  const handleCheckIn = (resId: string, roomNo: string, guestName: string, checkIn: string, checkOut: string) => {
    if (currentRole === 'Responsable Ménage') {
      triggerToast("Permissions insuffisantes : Le Responsable Ménage ne peut pas modifier l'état des séjours.");
      return;
    }

    // Check if the chamber is clean and ready — warn via toast instead of blocking confirm()
    const targetedRoom = rooms.find(r => r.number === roomNo);
    if (targetedRoom && targetedRoom.status === 'not-ready') {
      triggerToast(`Attention : La chambre ${roomNo} est en cours de ménage. Check-in forcé enregistré — prévenez le ménage.`);
    }

    setReservations(prev => prev.map(res => {
      if (res.id === resId) {
        return { ...res, status: 'Arrivé' };
      }
      return res;
    }));

    // Cascade update to room state -> occupied
    onUpdateRoomStatusAndGuest(roomNo, 'occupied', guestName, checkIn, checkOut);

    onAddNotification(
      "Arrivée Client",
      `${guestName} est arrivé et occupe désormais la chambre ${roomNo}.`,
      'info'
    );
    triggerToast(`Check-In enregistré pour ${guestName} (Ch. ${roomNo}).`);
  };

  // CheckOut Operation (Departure transition)
  const handleCheckOut = (resId: string, roomNo: string, guestName: string) => {
    if (currentRole === 'Responsable Ménage') {
      triggerToast("Permissions insuffisantes.");
      return;
    }

    setReservations(prev => prev.map(res => {
      if (res.id === resId) {
        return { ...res, status: 'Terminé' };
      }
      return res;
    }));

    // Cascade update to room state -> 'not-ready' for laundry workflow, removing guest assignment
    onUpdateRoomStatusAndGuest(roomNo, 'not-ready', undefined);

    onAddNotification(
      "Départ Client",
      `${guestName} a quitté la chambre ${roomNo}. Chambre libérée et transmise au ménage.`,
      'info'
    );
    triggerToast(`Départ enregistré. Chambre ${roomNo} libérée pour ménage.`);
  };

  // Cancel reservation — uses inline confirmation state instead of browser confirm()
  const handleCancelBooking = (resId: string, roomNo: string, guestName: string, originalStatus: string) => {
    if (currentRole === 'Responsable Ménage' || currentRole === 'Directeur Financier') {
      triggerToast("Niveau d'administration insuffisant pour annuler.");
      return;
    }
    setCancelConfirmId(resId);
  };

  const handleCancelConfirmed = (resId: string, roomNo: string, guestName: string, originalStatus: string) => {
    setCancelConfirmId(null);
    setReservations(prev => prev.map(res => {
      if (res.id === resId) {
        return { ...res, status: 'Annulé' };
      }
      return res;
    }));

    if (originalStatus === 'Confirmé' || originalStatus === 'Arrivé') {
      onUpdateRoomStatusAndGuest(roomNo, 'available', undefined);
    }

    onAddNotification(
      "Annulation Réservation",
      `La réservation de ${guestName} (Ch. ${roomNo}) a été annulée.`,
      'alerte'
    );
    triggerToast(`Réservation ${resId} annulée.`);
  };

  // Analytics for the selected active hotel bookings
  const bookingsAnalytics = useMemo(() => {
    const totalBookings = hotelReservations.length;
    const currentInStay = hotelReservations.filter(r => r.status === 'Arrivé').length;
    const pendingArrivals = hotelReservations.filter(r => r.status === 'Confirmé').length;
    const cumulativeValue = hotelReservations.reduce((acc, curr) => curr.status !== 'Annulé' ? acc + curr.totalAmount : acc, 0);

    return { totalBookings, currentInStay, pendingArrivals, cumulativeValue };
  }, [hotelReservations]);

  return (
    <div className="space-y-6 fade-in-up">
      
      {/* Toast alert system */}
      {toast && (
        <div className="bg-[#09153D] text-white px-4 py-3.5 rounded-[18px] text-xs font-bold shadow-lg flex items-center gap-2.5 animate-in fade-in slide-in-from-top-3 duration-250 fixed top-6 right-6 z-50 max-w-sm border border-slate-700/60">
          <Sparkles className="w-4 h-4 text-orange-400 shrink-0" />
          <span className="leading-snug text-left">{toast}</span>
        </div>
      )}

      {/* HEADER PAGE SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#09153D] tracking-tight font-sans">Guichet & Réception de Réservations</h2>
          <p className="text-xs text-slate-400 font-medium">Gestion du planning d'arrivées, départs en direct, options complémentaires et facturations</p>
        </div>

        <div>
          {currentRole !== 'Responsable Ménage' ? (
            <button
              onClick={() => {
                // Pre-populate with a free room
                const freeRooms = rooms.filter(r => r.status === 'available');
                if (freeRooms.length > 0) {
                  setFormRoomNo(freeRooms[0].number);
                } else if (rooms.length > 0) {
                  setFormRoomNo(rooms[0].number);
                }
                setShowAddFormModal(true);
              }}
              className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs px-4 py-3 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-orange-600/10 shrink-0"
            >
              <UserPlus className="w-4 h-4 stroke-[3]" />
              <span>Réceptionner un Voyageur (Nouveau)</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200/50 rounded-xl text-[10px] font-bold text-slate-400">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>Réservations en lecture seule (Ménage)</span>
            </div>
          )}
        </div>
      </div>

      {/* BOOKING DESK METRIC PANEL */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 w-full">
        
        {/* Metric Card 1: Portefeuille global */}
        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm text-left">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold text-[#09153D]/50 uppercase tracking-widest">Valeur Portefeuille</span>
            <span className="p-2 bg-orange-50 text-orange-600 rounded-xl">
              <DollarSign className="w-3.5 h-3.5" />
            </span>
          </div>
          <h4 className="text-2xl font-black text-[#09153D] font-mono mt-1.5">
            {bookingsAnalytics.cumulativeValue.toLocaleString('fr-FR')} <span className="text-xs font-bold text-slate-400">FCFA</span>
          </h4>
          <p className="text-[9.5px] text-slate-400 font-medium mt-1">Hors réservations annulées de l'établissement</p>
        </div>

        {/* Metric Card 2: Arrivals Pending */}
        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm text-left">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold text-sky-650/85 uppercase tracking-widest">Bientôt Arrivés</span>
            <span className="p-2 bg-sky-50 text-sky-600 rounded-xl animate-pulse">
              <CalendarCheck2 className="w-3.5 h-3.5" />
            </span>
          </div>
          <h4 className="text-2xl font-black text-[#09153D] font-mono mt-1.5">{bookingsAnalytics.pendingArrivals} Réservations</h4>
          <p className="text-[10px] text-sky-600 font-bold mt-1">Garanties, prêtes à l’accueil</p>
        </div>

        {/* Metric Card 3: Currently Occupied */}
        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm text-left">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold text-blue-650/85 uppercase tracking-widest">Occupants en Séjour</span>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <UserCheck className="w-3.5 h-3.5" />
            </span>
          </div>
          <h4 className="text-2xl font-black text-[#09153D] font-mono mt-1.5">{bookingsAnalytics.currentInStay} Voyageurs</h4>
          <p className="text-[9.5px] text-slate-400 font-medium mt-1">Séjours actifs encours de services</p>
        </div>

        {/* Metric Card 4: Global volume */}
        <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm text-left">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold text-[#09153D]/50 uppercase tracking-widest">Volume Historique</span>
            <span className="p-2 bg-slate-50 text-slate-500 rounded-xl">
              <CalendarDays className="w-3.5 h-3.5" />
            </span>
          </div>
          <h4 className="text-2xl font-black text-[#09153D] font-mono mt-1.5">{bookingsAnalytics.totalBookings} Enregistrées</h4>
          <p className="text-[9.5px] text-slate-400 font-medium mt-1">Au total pour {currentHotel}</p>
        </div>

      </div>

      {/* FILTER CONTROLS */}
      <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm text-left">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Search keyword input */}
          <div className="relative w-full md:w-96 flex-shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher voyageur, chambre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50/60 hover:bg-slate-50 border border-slate-200 text-xs px-10 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>

          {/* Status selector tabs */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl w-full md:w-auto overflow-x-auto select-none border border-slate-200/50">
            {['Tous', 'Confirmé', 'Arrivé', 'Terminé', 'Annulé'].map(tab => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`text-[10.5px] font-extrabold px-3.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === tab 
                    ? 'bg-white text-[#09153D] shadow-sm font-black' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {tab.toUpperCase()}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* TABLE DATA LISTING */}
      <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm text-left">
        
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h4 className="text-sm font-bold text-slate-900 tracking-tight">Registre d'Arrivées & Départs Actifs</h4>
            <p className="text-[11px] text-slate-400 font-medium">Bordereau opérationnel synchronisé en direct de l'hôtel {currentHotel}</p>
          </div>
          
          <span className="text-[10.5px] font-bold font-mono text-slate-500 bg-slate-50 border border-slate-100 px-3 py-1 rounded-full">
            {filteredBookings.length} Dossiers assignés
          </span>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto border border-slate-100 rounded-2xl">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/60 border-b border-slate-100 text-[9.5px] font-extrabold text-slate-400 uppercase tracking-wider">
                <th className="p-4 text-left">RESERVATION REF</th>
                <th className="p-4 text-left">NOM VOYAGEUR</th>
                <th className="p-4 text-center">CHAMBRE N°</th>
                <th className="p-4 text-left">DURÉE / NUITÉES</th>
                <th className="p-4 text-left">DATES RETENUES</th>
                <th className="p-4 text-center">KATERING PB</th>
                <th className="p-4 text-right">MONTANT TOTAL</th>
                <th className="p-4 text-center">STATUT</th>
                <th className="p-4 text-center">ACTIONS DESK</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-405 font-medium italic">
                    Aucune réservation ne correspond à vos filtres à {currentHotel}.
                  </td>
                </tr>
              ) : (
                filteredBookings.map((res) => {
                  return (
                    <tr 
                      key={res.id} 
                      className={`hover:bg-slate-50/25 transition-colors ${
                        res.status === 'Arrivé' ? 'bg-blue-50/10' : 
                        res.status === 'Annulé' ? 'opacity-65 line-through bg-slate-50/50' : ''
                      }`}
                    >
                      {/* Ref ID */}
                      <td className="p-4 text-left font-bold font-mono text-[#09153D]">
                        {res.id}
                      </td>

                      {/* Guest info card */}
                      <td className="p-4 text-left">
                        <div>
                          <span className="font-extrabold text-slate-800 block text-sm">{res.guestName}</span>
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{res.guestEmail}</span>
                          <span className="text-[9.5px] text-slate-404 block">{res.guestPhone}</span>
                        </div>
                      </td>

                      {/* Room number */}
                      <td className="p-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="w-9 h-9 bg-slate-50 rounded-xl border border-slate-150/80 flex items-center justify-center font-bold font-mono text-slate-700">
                            {res.roomNo}
                          </span>
                          <span className="text-[9px] text-slate-400 font-semibold mt-1 truncate max-w-28">
                            {res.roomType}
                          </span>
                        </div>
                      </td>

                      {/* Nights length */}
                      <td className="p-4 text-left font-extrabold text-slate-500 font-mono">
                        {res.durationNights} Nuits
                      </td>

                      {/* Dates */}
                      <td className="p-4 text-left font-medium">
                        <div className="flex items-center gap-1 text-[11px] text-slate-650">
                          <Calendar className="w-3 h-3 text-orange-500 shrink-0" />
                          <span>du {res.checkIn}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>au {res.checkOut}</span>
                        </div>
                      </td>

                      {/* Breakfast included status */}
                      <td className="p-4 text-center">
                        {res.breakfastIncluded ? (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 font-extrabold text-[9px] px-2 py-0.5 rounded-md border border-amber-100 select-none">
                            <Coffee className="w-2.5 h-2.5" /> INCLUS
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">Non inclus</span>
                        )}
                      </td>

                      {/* Total cost and invoice status */}
                      <td className="p-4 text-right">
                        <div>
                          <span className="font-black font-mono text-sm block text-[#09153D]">
                            {res.totalAmount.toLocaleString('fr-FR')} FCFA
                          </span>
                          <span className={`text-[8.5px] font-extrabold border px-1.5 py-0.5 rounded mt-1 inline-block ${
                            res.paymentStatus === 'Payé' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            res.paymentStatus === 'Acompte' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                            'bg-red-50 text-red-600 border-red-100'
                          }`}>
                            {res.paymentStatus.toUpperCase()}
                          </span>
                        </div>
                      </td>

                      {/* Reservation system status badge */}
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 text-[9.5px] font-extrabold px-3 py-1 rounded-full ${
                          res.status === 'Arrivé' ? 'bg-blue-50 text-blue-600' :
                          res.status === 'Confirmé' ? 'bg-sky-50 text-sky-600' :
                          res.status === 'Terminé' ? 'bg-slate-100 text-slate-500' :
                          'bg-red-50 text-red-500'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            res.status === 'Arrivé' ? 'bg-blue-500' :
                            res.status === 'Confirmé' ? 'bg-sky-500' :
                            res.status === 'Terminé' ? 'bg-slate-400' :
                            'bg-red-500'
                          }`} />
                          {res.status.toUpperCase()}
                        </span>
                      </td>

                      {/* ACTIONS TOOLBAR */}
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {res.status === 'Confirmé' && (
                            <button
                              onClick={() => handleCheckIn(res.id, res.roomNo, res.guestName, res.checkIn, res.checkOut)}
                              className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-xl transition-all hover:scale-102 cursor-pointer flex items-center gap-1"
                              title="Déclarer l'arrivée physique"
                            >
                              <UserCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>Check-In</span>
                            </button>
                          )}

                          {res.status === 'Arrivé' && (
                            <button
                              onClick={() => handleCheckOut(res.id, res.roomNo, res.guestName)}
                              className="bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-xl transition-all hover:scale-102 cursor-pointer flex items-center gap-1"
                              title="Clôturer le séjour"
                            >
                              <Signpost className="w-3.5 h-3.5" />
                              <span>Check-Out</span>
                            </button>
                          )}

                          {res.status !== 'Annulé' && res.status !== 'Terminé' && (
                            cancelConfirmId === res.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleCancelConfirmed(res.id, res.roomNo, res.guestName, res.status)}
                                  className="bg-red-500 hover:bg-red-600 text-white font-extrabold text-[9px] px-2 py-1.5 rounded-lg cursor-pointer"
                                >
                                  Confirmer
                                </button>
                                <button
                                  onClick={() => setCancelConfirmId(null)}
                                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[9px] px-2 py-1.5 rounded-lg cursor-pointer"
                                >
                                  Non
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleCancelBooking(res.id, res.roomNo, res.guestName, res.status)}
                                className="bg-slate-100 hover:bg-red-50 border border-slate-200 text-slate-500 hover:text-red-600 p-2 rounded-xl transition-all cursor-pointer"
                                title="Annuler le dossier"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )
                          )}

                          {(res.status === 'Annulé' || res.status === 'Terminé') && (
                            <span className="text-[10px] text-slate-400 italic font-mono">Archivé</span>
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

      {/* NEW RESERVATION OVERLAY MODAL */}
      {showAddFormModal && (
        <div className="fixed inset-0 z-50 bg-[#09153D]/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] border border-slate-150/80 shadow-2xl max-w-lg w-full overflow-hidden text-left animate-in zoom-in-95 duration-205">
            
            {/* Modal Head */}
            <div className="p-6 bg-gradient-to-r from-orange-600 to-amber-500 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CalendarDays className="w-5.5 h-5.5 text-white" />
                <div>
                  <h3 className="font-extrabold text-white text-md tracking-tight">Vérification & Guichet Réservation</h3>
                  <p className="text-[10px] text-orange-100 font-medium">{currentHotel} - Processus front-office</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddFormModal(false)}
                className="text-white hover:text-orange-200 cursor-pointer text-sm font-bold bg-white/10 w-7 h-7 rounded-full flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Modal Body form */}
            <form onSubmit={handleCreateReservation} className="p-6 space-y-4">
              
              {/* Main Traveler */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  Nom Complet du Client Principal :
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Ex: Fatou Diome, etc."
                    value={formGuestName}
                    onChange={(e) => setFormGuestName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold p-3 pl-9 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500"
                    required
                  />
                </div>
              </div>

              {/* Coordinates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Adresse Email :
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      placeholder="fatou@gmail.sn"
                      value={formGuestEmail}
                      onChange={(e) => setFormGuestEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-xs p-3 pl-9 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Numéro de Téléphone :
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="+221 77..."
                      value={formGuestPhone}
                      onChange={(e) => setFormGuestPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-xs p-3 pl-9 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* Room select & Dates */}
              <div className="grid grid-cols-3 gap-3">
                
                {/* Room list from current hotel */}
                <div className="space-y-1.5">
                  <label className="block text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Bungalow / Ch. :
                  </label>
                  <select
                    value={formRoomNo}
                    onChange={(e) => setFormRoomNo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
                    required
                  >
                    <option value="">Sélectionner</option>
                    {rooms.map(r => (
                      <option key={r.id} value={r.number}>
                        N° {r.number} ({r.status === 'available' ? 'Libre' : r.status === 'not-ready' ? 'Sale' : 'Occupé'}) - {r.category}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Check In */}
                <div className="space-y-1.5">
                  <label className="block text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Check-In (Arrivée) :
                  </label>
                  <input
                    type="date"
                    value={formCheckIn}
                    onChange={(e) => setFormCheckIn(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-750 p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
                    required
                  />
                </div>

                {/* Check out */}
                <div className="space-y-1.5">
                  <label className="block text-[9.5px] font-extrabold text-[#09153D]/65 uppercase tracking-widest">
                    Check-Out (Départ) :
                  </label>
                  <input
                    type="date"
                    value={formCheckOut}
                    onChange={(e) => setFormCheckOut(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-755 p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
                    required
                  />
                </div>

              </div>

              {/* Number of guests */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  Nombre de Voyageurs :
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFormGuestCount(Math.max(1, formGuestCount - 1))}
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center cursor-pointer"
                  >−</button>
                  <span className="flex-1 text-center font-black text-[#09153D] text-lg font-mono">{formGuestCount}</span>
                  <button
                    type="button"
                    onClick={() => setFormGuestCount(Math.min(10, formGuestCount + 1))}
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center cursor-pointer"
                  >+</button>
                  <span className="text-[10px] text-slate-400 font-medium">pers.</span>
                </div>
              </div>

              {/* Date validation warning */}
              {formNightsCount <= 0 && formCheckIn && formCheckOut && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-[10px] font-bold text-red-600">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>La date de départ doit être postérieure à la date d'arrivée ({Math.abs(formNightsCount)} jour(s) d'écart négatif).</span>
                </div>
              )}

              {/* Breakfast & Payment Status & Notes */}
              <div className="grid grid-cols-2 gap-4">

                {/* Breakfast checkbox package */}
                <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100/80 flex items-center justify-between select-none">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-amber-50 rounded-lg text-amber-500">
                      <Coffee className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-left">
                      <span className="text-[10.5px] font-extrabold text-slate-700 block">Petit déjeuner</span>
                      <span className="text-[9.5px] text-slate-400 block">+8.500 F CFA / pers. / nuit</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formBreakfast}
                    onChange={(e) => setFormBreakfast(e.target.checked)}
                    className="accent-orange-600 scale-110 cursor-pointer"
                  />
                </div>

                {/* Initial Payment */}
                <div className="space-y-1">
                  <label className="block text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest text-left">
                    Règlement initial :
                  </label>
                  <select
                    value={formPaymentStatus}
                    onChange={(e) => setFormPaymentStatus(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 p-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
                  >
                    <option value="Non Payé">Non Payé / Garantie carte</option>
                    <option value="Acompte">Acompte versé (50%)</option>
                    <option value="Payé">Totalement prépayé</option>
                  </select>
                </div>

              </div>

              {/* Notes */}
              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  Consigne particulière / Notes desk :
                </label>
                <textarea
                  placeholder="Ex: Navette rapide, allergie alimentaire, lit bébé..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-700 p-3 rounded-xl h-20 resize-none focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              {/* Calculated Invoice Summary Info */}
              {selectedRoomDetails && formNightsCount > 0 && (
                <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 text-left space-y-1">
                  <span className="block text-[9px] font-extrabold text-orange-800 uppercase tracking-wide">
                    Simulation Facturation ({formNightsCount} nuit{formNightsCount > 1 ? 's' : ''} · {formGuestCount} pers.) :
                  </span>
                  <div className="flex justify-between text-[10px] text-slate-600">
                    <span>Chambre ({selectedRoomDetails.nightlyRate.toLocaleString('fr-FR')} FCFA × {formNightsCount})</span>
                    <span className="font-bold">{(selectedRoomDetails.nightlyRate * formNightsCount).toLocaleString('fr-FR')} FCFA</span>
                  </div>
                  {formBreakfast && (
                    <div className="flex justify-between text-[10px] text-slate-600">
                      <span>Petit-déjeuner (8 500 × {formGuestCount} pers. × {formNightsCount})</span>
                      <span className="font-bold">{(8500 * formGuestCount * formNightsCount).toLocaleString('fr-FR')} FCFA</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1 border-t border-orange-200">
                    <span className="text-[10px] font-extrabold text-orange-900">TOTAL SÉJOUR</span>
                    <span className="text-sm font-black text-orange-950 font-mono">
                      {computedTotalAmount.toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                </div>
              )}

              {/* Form Submission buttons */}
              <div className="pt-4 border-t border-slate-50 flex items-center justify-end gap-3.5">
                <button
                  type="button"
                  onClick={() => setShowAddFormModal(false)}
                  className="px-4.5 py-3 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl transition-colors cursor-pointer"
                >
                  Fermer
                </button>
                <button
                  type="submit"
                  className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs px-5 py-3 rounded-xl transition-colors cursor-pointer shadow-md shadow-orange-600/10"
                >
                  Confirmer et Enregistrer la Réservation
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}

function formatValue(val: number) {
  return `${val.toLocaleString('fr-FR')} FCFA`;
}
