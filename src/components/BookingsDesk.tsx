import React, { useState, useMemo } from 'react';
import {
  Calendar,
  CalendarDays,
  User,
  Phone,
  Mail,
  Clock,
  Search,
  Sparkles,
  Trash2,
  UserCheck,
  Signpost,
  Coffee,
  DollarSign,
  CalendarCheck2,
  UserPlus,
  AlertTriangle,
  Wallet,
  FileText,
  Loader2
} from 'lucide-react';
import { Room } from '../types';
import type { AppRole } from '../lib/roles';
import { canManageReservations } from '../lib/roles';
import {
  paidAmount,
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
  type PropertyData,
  type ReservationRow
} from '../lib/pmsData';
import { addDays, formatDate, nightsBetween } from '../lib/dates';

interface BookingsDeskProps {
  rooms: Room[];
  reservations: ReservationRow[];
  today: string;
  breakfastPrice: number;
  currentHotel: string;
  appRole: AppRole;
  actions: PropertyData['actions'];
  onAddNotification: (title: string, message: string, type: 'réservation' | 'paiement' | 'alerte' | 'info') => void;
}

type DisplayStatus = 'Confirmé' | 'Arrivé' | 'Terminé' | 'Annulé' | 'No-show';

interface ReservationItem {
  id: string;
  code: string;
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
  paid: number;
  invoiceNumber?: string;
  status: DisplayStatus;
  paymentStatus: 'Payé' | 'Acompte' | 'Non Payé';
  notes?: string;
}

const STATUS_LABEL: Record<ReservationRow['status'], DisplayStatus> = {
  option: 'Confirmé',
  confirmed: 'Confirmé',
  checked_in: 'Arrivé',
  checked_out: 'Terminé',
  cancelled: 'Annulé',
  no_show: 'No-show'
};

export default function BookingsDesk({
  rooms,
  reservations,
  today,
  breakfastPrice,
  currentHotel,
  appRole,
  actions,
  onAddNotification
}: BookingsDeskProps) {
  const canWrite = canManageReservations(appRole);
  const canRefund = ['owner', 'general_manager', 'accountant'].includes(appRole);

  // Vue de la base : la liste ne contient que ce que le serveur a enregistré.
  const hotelReservations: ReservationItem[] = useMemo(() => {
    const byId = new Map(rooms.map(r => [r.id, r]));
    return reservations.map(r => {
      const room = byId.get(r.room_id);
      const paid = paidAmount(r);
      return {
        id: r.id,
        code: r.code,
        guestName: r.guest?.full_name ?? 'Client',
        guestEmail: r.guest?.email ?? '',
        guestPhone: r.guest?.phone ?? '',
        roomNo: room?.number ?? '?',
        roomType: room?.category ?? '',
        checkIn: r.check_in,
        checkOut: r.check_out,
        durationNights: nightsBetween(r.check_in, r.check_out),
        breakfastIncluded: r.breakfast,
        totalAmount: r.total_amount,
        paid,
        invoiceNumber: r.invoices[0]?.display_number,
        status: STATUS_LABEL[r.status],
        paymentStatus: paid >= r.total_amount ? 'Payé' : paid > 0 ? 'Acompte' : 'Non Payé',
        notes: r.notes ?? undefined
      };
    });
  }, [reservations, rooms]);

  // UI state controllers
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tous');
  const [showAddFormModal, setShowAddFormModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // New Booking form dynamic states
  const [formGuestName, setFormGuestName] = useState('');
  const [formGuestEmail, setFormGuestEmail] = useState('');
  const [formGuestPhone, setFormGuestPhone] = useState('');
  const [formRoomNo, setFormRoomNo] = useState('');
  const [formCheckIn, setFormCheckIn] = useState(today);
  const [formCheckOut, setFormCheckOut] = useState(addDays(today, 1));
  const [formAdults, setFormAdults] = useState(2);
  const [formChildren, setFormChildren] = useState(0);
  const [formBreakfast, setFormBreakfast] = useState(false);
  const [formNotes, setFormNotes] = useState('');

  // Encaissement
  const [paymentFor, setPaymentFor] = useState<ReservationItem | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentRef, setPaymentRef] = useState('');

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  // Exécute une opération serveur et affiche son refus éventuel tel quel.
  const run = async (fn: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await fn();
      triggerToast(success);
      return true;
    } catch (e) {
      triggerToast((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const formNightsCount = useMemo(() => nightsBetween(formCheckIn, formCheckOut), [formCheckIn, formCheckOut]);

  const selectedRoomDetails = useMemo(() => {
    if (!formRoomNo) return null;
    return rooms.find(r => r.number === formRoomNo) || null;
  }, [formRoomNo, rooms]);

  // Estimation affichée ; le montant enregistré est recalculé par le serveur.
  const computedTotalAmount = useMemo(() => {
    if (!selectedRoomDetails) return 0;
    const roomCost = selectedRoomDetails.nightlyRate * formNightsCount;
    const breakfastCost = formBreakfast ? breakfastPrice * (formAdults + formChildren) * formNightsCount : 0;
    return roomCost + breakfastCost;
  }, [selectedRoomDetails, formNightsCount, formBreakfast, breakfastPrice, formAdults, formChildren]);

  const filteredBookings = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return hotelReservations.filter(res => {
      const matchesSearch = res.guestName.toLowerCase().includes(q) ||
                            res.roomNo.includes(searchQuery) ||
                            res.code.toLowerCase().includes(q) ||
                            res.roomType.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'Tous' || res.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [hotelReservations, searchQuery, statusFilter]);

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formGuestName.trim() || !selectedRoomDetails) {
      setFormError('Renseignez le nom du client et la chambre.');
      return;
    }
    if (formNightsCount <= 0) {
      setFormError("La date de départ doit être postérieure à la date d'arrivée.");
      return;
    }
    setBusy(true);
    try {
      await actions.createReservation({
        roomId: selectedRoomDetails.id,
        checkIn: formCheckIn,
        checkOut: formCheckOut,
        guestName: formGuestName,
        guestEmail: formGuestEmail,
        guestPhone: formGuestPhone,
        adults: formAdults,
        children: formChildren,
        breakfast: formBreakfast,
        notes: formNotes
      });
      onAddNotification('Nouvelle réservation', `${formGuestName}, chambre ${formRoomNo}, du ${formatDate(formCheckIn)} au ${formatDate(formCheckOut)}.`, 'réservation');
      setShowAddFormModal(false);
      setFormGuestName('');
      setFormGuestEmail('');
      setFormGuestPhone('');
      setFormNotes('');
      triggerToast(`Réservation enregistrée, chambre ${formRoomNo}.`);
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleCheckIn = (res: ReservationItem) => {
    const targetedRoom = rooms.find(r => r.number === res.roomNo);
    if (targetedRoom && targetedRoom.status === 'not-ready') {
      if (!confirm(`La chambre ${res.roomNo} est signalée sale. Enregistrer quand même l'arrivée ?`)) return;
    }
    run(() => actions.checkIn(res.id), `Arrivée enregistrée : ${res.guestName} (ch. ${res.roomNo}).`);
  };

  const handleCheckOut = (res: ReservationItem) => {
    run(() => actions.checkOut(res.id), `Départ enregistré. Chambre ${res.roomNo} transmise au ménage.`);
  };

  const handleCancelBooking = (res: ReservationItem) => {
    const reason = prompt(`Motif d'annulation de la réservation de ${res.guestName} :`);
    if (reason === null) return;
    run(() => actions.cancel(res.id, reason), `Réservation ${res.code} annulée.`);
  };

  const handleNoShow = (res: ReservationItem) => {
    if (!confirm(`Déclarer ${res.guestName} en no-show ? La chambre sera libérée.`)) return;
    run(() => actions.markNoShow(res.id), `No-show enregistré pour ${res.code}.`);
  };

  const handleInvoice = (res: ReservationItem) => {
    run(() => actions.issueInvoice(res.id), `Facture émise pour ${res.code}.`);
  };

  const openPayment = (res: ReservationItem) => {
    setPaymentFor(res);
    setPaymentAmount(Math.max(res.totalAmount - res.paid, 0));
    setPaymentMethod('cash');
    setPaymentRef('');
  };

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentFor) return;
    const ok = await run(
      () => actions.recordPayment(paymentFor.id, paymentAmount, paymentMethod, paymentRef),
      `${paymentAmount.toLocaleString('fr-FR')} FCFA ${paymentAmount < 0 ? 'remboursés' : 'encaissés'} (${PAYMENT_METHOD_LABELS[paymentMethod]}).`
    );
    if (ok) {
      onAddNotification('Paiement enregistré', `${paymentFor.code} : ${paymentAmount.toLocaleString('fr-FR')} FCFA.`, 'paiement');
      setPaymentFor(null);
    }
  };

  const bookingsAnalytics = useMemo(() => {
    const totalBookings = hotelReservations.length;
    const currentInStay = hotelReservations.filter(r => r.status === 'Arrivé').length;
    const pendingArrivals = hotelReservations.filter(r => r.status === 'Confirmé').length;
    const cumulativeValue = hotelReservations.reduce((acc, curr) => curr.status !== 'Annulé' && curr.status !== 'No-show' ? acc + curr.totalAmount : acc, 0);
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
          {canWrite ? (
            <button
              disabled={rooms.length === 0}
              title={rooms.length === 0 ? "Ajoutez d'abord des chambres dans l'inventaire" : undefined}
              onClick={() => {
                const freeRooms = rooms.filter(r => r.status === 'available');
                setFormRoomNo(freeRooms[0]?.number ?? rooms[0]?.number ?? '');
                setFormCheckIn(today);
                setFormCheckOut(addDays(today, 1));
                setFormError(null);
                setShowAddFormModal(true);
              }}
              className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs px-4 py-3 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-orange-600/10 shrink-0"
            >
              <UserPlus className="w-4 h-4 stroke-[3]" />
              <span>Nouvelle réservation</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200/50 rounded-xl text-[10px] font-bold text-slate-400">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>Réservations en lecture seule pour votre rôle</span>
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
            {['Tous', 'Confirmé', 'Arrivé', 'Terminé', 'Annulé', 'No-show'].map(tab => (
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
                <th className="p-4 text-left">RÉFÉRENCE</th>
                <th className="p-4 text-left">NOM VOYAGEUR</th>
                <th className="p-4 text-center">CHAMBRE N°</th>
                <th className="p-4 text-left">DURÉE / NUITÉES</th>
                <th className="p-4 text-left">DATES RETENUES</th>
                <th className="p-4 text-center">PETIT-DÉJEUNER</th>
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
                        {res.code}
                        {res.invoiceNumber && (
                          <span className="block text-[9px] text-emerald-600 font-bold mt-1">Facture {res.invoiceNumber}</span>
                        )}
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
                          <span>du {formatDate(res.checkIn)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>au {formatDate(res.checkOut)}</span>
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
                          {res.paid > 0 && res.paid < res.totalAmount && (
                            <span className="block text-[9px] text-slate-400 mt-0.5">Reste {(res.totalAmount - res.paid).toLocaleString('fr-FR')} F</span>
                          )}
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
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {canWrite && res.status === 'Confirmé' && res.checkIn <= today && (
                            <button
                              disabled={busy}
                              onClick={() => handleCheckIn(res)}
                              className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
                              title="Déclarer l'arrivée"
                            >
                              <UserCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>Check-In</span>
                            </button>
                          )}

                          {canWrite && res.status === 'Arrivé' && (
                            <button
                              disabled={busy}
                              onClick={() => handleCheckOut(res)}
                              className="bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
                              title={res.paid < res.totalAmount ? 'Solde à encaisser avant le départ' : 'Clôturer le séjour'}
                            >
                              <Signpost className="w-3.5 h-3.5" />
                              <span>Check-Out</span>
                            </button>
                          )}

                          {canWrite && (res.status === 'Confirmé' || res.status === 'Arrivé' || res.status === 'Terminé') && (res.paid < res.totalAmount || canRefund) && (
                            <button
                              disabled={busy}
                              onClick={() => openPayment(res)}
                              className="bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 p-2 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                              title="Encaisser"
                              aria-label="Encaisser"
                            >
                              <Wallet className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {canWrite && !res.invoiceNumber && (res.status === 'Arrivé' || res.status === 'Terminé') && (
                            <button
                              disabled={busy}
                              onClick={() => handleInvoice(res)}
                              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 p-2 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                              title="Émettre la facture"
                              aria-label="Émettre la facture"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {canWrite && res.status === 'Confirmé' && res.checkIn < today && (
                            <button
                              disabled={busy}
                              onClick={() => handleNoShow(res)}
                              className="bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 text-[10px] font-bold px-2 py-1.5 rounded-xl cursor-pointer disabled:opacity-50"
                              title="Client non présenté"
                            >
                              No-show
                            </button>
                          )}

                          {canWrite && res.status === 'Confirmé' && (
                            <button
                              disabled={busy}
                              onClick={() => handleCancelBooking(res)}
                              className="bg-slate-100 hover:bg-red-50 border border-slate-200 text-slate-500 hover:text-red-600 p-2 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                              title="Annuler la réservation"
                              aria-label="Annuler la réservation"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {(res.status === 'Annulé' || res.status === 'No-show' || (res.status === 'Terminé' && res.invoiceNumber && res.paid >= res.totalAmount)) && (
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
                        N° {r.number} ({r.status === 'available' ? 'Libre ce soir' : r.status === 'not-ready' ? 'À nettoyer' : r.status === 'maintenance' ? 'Hors service' : r.status === 'reserved' ? 'Arrivée prévue' : 'Occupée'}) - {r.category}
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
                      <span className="text-[9.5px] text-slate-400 block">+{breakfastPrice.toLocaleString('fr-FR')} FCFA / pers. / nuit</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formBreakfast}
                    onChange={(e) => setFormBreakfast(e.target.checked)}
                    className="accent-orange-600 scale-110 cursor-pointer"
                  />
                </div>

                {/* Occupants */}
                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-1 block">
                    <span className="block text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest text-left">Adultes</span>
                    <input type="number" min={1} max={20} value={formAdults} onChange={(e) => setFormAdults(Math.max(1, Number(e.target.value)))} className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 p-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500" />
                  </label>
                  <label className="space-y-1 block">
                    <span className="block text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest text-left">Enfants</span>
                    <input type="number" min={0} max={20} value={formChildren} onChange={(e) => setFormChildren(Math.max(0, Number(e.target.value)))} className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 p-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500" />
                  </label>
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
              {selectedRoomDetails && (
                <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex items-center justify-between text-left">
                  <div className="space-y-0.5">
                    <span className="block text-[9px] font-extrabold text-orange-850 uppercase tracking-wide">
                      Estimation ({formNightsCount} nuit{formNightsCount > 1 ? 's' : ''}) :
                    </span>
                    <span className="text-[10px] font-bold text-slate-600">
                      Tarif chambre: {formatValue(selectedRoomDetails.nightlyRate)} / nuit
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[9px] font-medium text-slate-450">Total séjour (calculé par le serveur)</span>
                    <span className="text-lg font-black text-orange-950 font-mono">
                      {computedTotalAmount.toLocaleString('fr-FR')} F
                    </span>
                  </div>
                </div>
              )}

              {formError && (
                <div role="alert" className="flex gap-2 p-3 bg-red-50 text-red-600 text-[11px] font-bold rounded-xl">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
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
                  disabled={busy}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs px-5 py-3 rounded-xl transition-colors cursor-pointer shadow-md shadow-orange-600/10 flex items-center gap-2 disabled:opacity-50"
                >
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                  Enregistrer la réservation
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {paymentFor && (
        <div className="fixed inset-0 z-50 bg-[#09153D]/30 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={submitPayment} className="bg-white rounded-[28px] border border-slate-150/80 shadow-2xl max-w-md w-full p-6 space-y-4 text-left">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-[#09153D]">Encaissement · {paymentFor.code}</h3>
                <p className="text-[11px] text-slate-500">
                  {paymentFor.guestName} · total {paymentFor.totalAmount.toLocaleString('fr-FR')} F · déjà réglé {paymentFor.paid.toLocaleString('fr-FR')} F
                </p>
              </div>
              <button type="button" onClick={() => setPaymentFor(null)} className="text-slate-400 font-bold cursor-pointer" aria-label="Fermer">✕</button>
            </div>
            <label className="block space-y-1">
              <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Montant (FCFA)</span>
              <input
                type="number"
                step={1}
                min={canRefund ? undefined : 1}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Math.trunc(Number(e.target.value)))}
                className="w-full bg-slate-50 border border-slate-200 text-sm font-bold p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500"
                required
              />
              {canRefund && <span className="block text-[10px] text-slate-400">Un montant négatif enregistre un remboursement.</span>}
            </label>
            <label className="block space-y-1">
              <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Moyen de paiement</span>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)} className="w-full bg-slate-50 border border-slate-200 text-xs font-bold p-3 rounded-xl cursor-pointer">
                {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map(m => (
                  <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Référence (n° de transaction, reçu…)</span>
              <input value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-xs p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500" />
            </label>
            <p className="text-[10px] text-slate-400">Un paiement enregistré ne peut plus être modifié ni supprimé ; une erreur se corrige par un remboursement.</p>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setPaymentFor(null)} className="px-4 py-3 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl cursor-pointer">Fermer</button>
              <button type="submit" disabled={busy || paymentAmount === 0} className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs px-5 py-3 rounded-xl cursor-pointer disabled:opacity-50">
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}

function formatValue(val: number) {
  return `${val.toLocaleString('fr-FR')} FCFA`;
}
