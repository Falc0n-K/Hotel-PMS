/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Compass, 
  Search, 
  MapPin, 
  Calendar, 
  Users, 
  Clock, 
  DollarSign, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Sparkles, 
  Trash2, 
  TrendingUp, 
  Activity, 
  Camera, 
  Award, 
  HeartHandshake, 
  Map, 
  Navigation,
  QrCode,
  Tag,
  Star
} from 'lucide-react';
import { RBACRole } from '../types';

interface ExperiencesMarketProps {
  currentHotel: string;
  currentRole: RBACRole;
  onAddNotification: (title: string, message: string, type: 'réservation' | 'paiement' | 'alerte' | 'info') => void;
}

export interface LocalExperience {
  id: string;
  title: string;
  category: 'Safari & Nature' | 'Aventure & Sport' | 'Culture & Gastronomie' | 'Bien-être';
  hotelCompatibility: string[]; // List of hotels that can easily offer this
  pricePerPerson: number;
  duration: string;
  rating: number;
  provider: string;
  description: string;
  spotsMax: number;
  featured: boolean;
}

export interface ExperienceBooking {
  id: string;
  experienceId: string;
  experienceTitle: string;
  guestName: string;
  roomNumber: string;
  dateStr: string;
  paxCount: number;
  optionsSelected: string[];
  totalPrice: number;
  commissionEarned: number; // 15% standard commission for the hotel
  status: 'Confirmé' | 'En attente' | 'Annulé';
  agentName: string;
}

export default function ExperiencesMarket({
  currentHotel,
  currentRole,
  onAddNotification
}: ExperiencesMarketProps) {

  // Core custom experience catalogue in Senegal
  const [experiences, setExperiences] = useState<LocalExperience[]>([
    {
      id: "EXP-SAF-01",
      title: "Safari & Pirogues Privatives au Delta du Saloum",
      category: "Safari & Nature",
      hotelCompatibility: ["Les Pélicans du Saloum", "Royal Saly", "Nema Kadior"],
      pricePerPerson: 45000,
      duration: "Demi-journée (6h)",
      rating: 4.9,
      provider: "Saloum Delta Eco-Tours",
      description: "Exploration des mangroves vierges en pirogue à rames et motorisée. Safari photographique à l'île aux oiseaux suivi d'un déjeuner grillades sur une plage de coquillages secrète.",
      spotsMax: 12,
      featured: true
    },
    {
      id: "EXP-QAD-02",
      title: "Expédition Quad dans la Forêt de Baobabs & Lagune de Somone",
      category: "Aventure & Sport",
      hotelCompatibility: ["Royal Saly", "Les Pélicans du Saloum"],
      pricePerPerson: 55000,
      duration: "3h30",
      rating: 4.8,
      provider: "Saly Extreme Sports rando",
      description: "Parcours guidé hors des sentiers battus au travers de pistes de brousse sablonneuses et d'arbres millénaires, puis détour revigorant au lagon de la Somone.",
      spotsMax: 10,
      featured: true
    },
    {
      id: "EXP-GAS-03",
      title: "Atelier Culinaire Cordon-Bleu : L'art du Thiéboudienne Impérial",
      category: "Culture & Gastronomie",
      hotelCompatibility: ["Royal Saly", "Nema Kadior", "Les Pélicans du Saloum"],
      pricePerPerson: 25000,
      duration: "4h00",
      rating: 4.95,
      provider: "Association de Coopération Féminine de Mbour",
      description: "Achat d'ingrédients locaux au marché traditionnel avec la cheffe Fatou, initiation rigoureuse au mijotage du riz au poisson traditionnel et dégustation conviviale autour du grand bol.",
      spotsMax: 8,
      featured: false
    },
    {
      id: "EXP-CAS-04",
      title: "Randonnée Fluviale en Casamance & Île de Carabane",
      category: "Safari & Nature",
      hotelCompatibility: ["Nema Kadior"],
      pricePerPerson: 60000,
      duration: "Journée complète",
      rating: 4.7,
      provider: "Casamance Découvertes",
      description: "Excursion historique au départ de Ziguinchor vers l'île coloniale de Carabane. Observation privilégiée des dauphins du fleuve Casamance et halte culturelle au village fétichiste.",
      spotsMax: 15,
      featured: true
    },
    {
      id: "EXP-PER-05",
      title: "Cérémonie Djembé, Danses Noires & Harmonies Sabar",
      category: "Culture & Gastronomie",
      hotelCompatibility: ["Royal Saly", "Nema Kadior", "Les Pélicans du Saloum"],
      pricePerPerson: 18000,
      duration: "2h (Coucher de soleil)",
      rating: 4.6,
      provider: "Troupe Rythmes de la Téranga",
      description: "Initiez-vous au tempo royal du Sabar et du Djembé avec des musiciens sénégalais de renom. Thé sénégalais Ataya et beignets locaux servis au cours de la session.",
      spotsMax: 20,
      featured: false
    },
    {
      id: "EXP-SPA-06",
      title: "Soin Impérial Karité-Baobab & Bain de Brume aux herbes de Somone",
      category: "Bien-être",
      hotelCompatibility: ["Royal Saly", "Nema Kadior"],
      pricePerPerson: 35000,
      duration: "1h45",
      rating: 4.85,
      provider: "Ebene & Beurre Spa Premium",
      description: "Massage holistique décontractant prodigué aux huiles de graines de baobab bio pressées à froid et enveloppement purifiant au beurre de karité de Casamance.",
      spotsMax: 4,
      featured: false
    }
  ]);

  // Active bookings list
  const [bookings, setBookings] = useState<ExperienceBooking[]>([
    {
      id: "VCH-EXP-9001",
      experienceId: "EXP-SAF-01",
      experienceTitle: "Safari & Pirogues Privatives au Delta du Saloum",
      guestName: "Jean-Louis Dupont",
      roomNumber: "Chambre 104",
      dateStr: "2026-05-22",
      paxCount: 3,
      optionsSelected: ["Guide francophone privé", "Complément Déjeuner Homard"],
      totalPrice: 165000, // 3 * 45000 + 30000 option cost
      commissionEarned: 24750, // 15%
      status: "Confirmé",
      agentName: "Mamadou Desk"
    },
    {
      id: "VCH-EXP-9002",
      experienceId: "EXP-QAD-02",
      experienceTitle: "Expédition Quad dans la Forêt de Baobabs & Lagune de Somone",
      guestName: "Sarah Connor",
      roomNumber: "Chambre 212",
      dateStr: "2026-05-23",
      paxCount: 2,
      optionsSelected: ["Assurance Premium Tout Terrain"],
      totalPrice: 120000,
      commissionEarned: 18000,
      status: "En attente",
      agentName: "Mamadou Desk"
    },
    {
      id: "VCH-EXP-9003",
      experienceId: "EXP-GAS-03",
      experienceTitle: "Atelier Culinaire Cordon-Bleu : L'art du Thiéboudienne Impérial",
      guestName: "Professeur Niang",
      roomNumber: "Suite Royale Saly",
      dateStr: "2026-05-25",
      paxCount: 1,
      optionsSelected: [],
      totalPrice: 25000,
      commissionEarned: 3750,
      status: "Confirmé",
      agentName: "Astou Saly"
    }
  ]);

  // Filtering states
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<'Tous' | 'Safari & Nature' | 'Aventure & Sport' | 'Culture & Gastronomie' | 'Bien-être'>('Tous');
  const [selectedExpId, setSelectedExpId] = useState<string | null>("EXP-SAF-01");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Experience creation modal state
  const [showAddExpModal, setShowAddExpModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCat, setNewCat] = useState<LocalExperience['category']>("Safari & Nature");
  const [newPrice, setNewPrice] = useState<number>(30000);
  const [newDuration, setNewDuration] = useState('2h30');
  const [newProvider, setNewProvider] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newMaxSpots, setNewMaxSpots] = useState<number>(8);

  // Fast purchasing state
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [buyGuest, setBuyGuest] = useState('');
  const [buyRoom, setBuyRoom] = useState('Chambre 101');
  const [buyDate, setBuyDate] = useState('2026-05-22');
  const [buyPax, setBuyPax] = useState<number>(2);
  const [optLunch, setOptLunch] = useState(false);
  const [optDroneVideo, setOptDroneVideo] = useState(false);

  // Print voucher popup state
  const [viewTicketVoucher, setViewTicketVoucher] = useState<ExperienceBooking | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Switch/Toggle reservation status
  const handleUpdateBookingStatus = (id: string, nextStatus: ExperienceBooking['status']) => {
    if (currentRole === 'Responsable Ménage') {
      triggerToast("Permissions refusées : La gouvernance des activités et conciergerie est réservée au Front Desk.");
      return;
    }

    setBookings(prev => prev.map(b => {
      if (b.id === id) {
        onAddNotification(
          nextStatus === 'Confirmé' ? "Excursion Approuvée" : "Excursion Altérée",
          `La réservation d'excursion de ${b.guestName} (${b.experienceTitle}) est désormais ${nextStatus.toLowerCase()}.`,
          nextStatus === 'Confirmé' ? 'info' : 'alerte'
        );
        return { ...b, status: nextStatus };
      }
      return b;
    }));
    triggerToast(`Statut du ticket mis à jour : ${nextStatus}.`);
  };

  // Delete/Cancel booking
  const handleDeleteBooking = (id: string, name: string) => {
    if (currentRole !== "Propriétaire d'Hôtel" && currentRole !== 'Directeur Financier') {
      triggerToast("Seule la direction financière ou le propriétaire peut désarchiver un contrat d'expérience.");
      return;
    }

    if (!confirm(`Souhaitez-vous vraiment annuler et archiver définitivement le ticket d'excursion ${id} de ${name} ?`)) {
      return;
    }

    setBookings(prev => prev.filter(b => b.id !== id));
    triggerToast("Réservation d'activité radiée.");
  };

  // Submit dynamic creation of a custom experience provider
  const handleCreateExperienceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newProvider.trim() || !newDesc.trim()) {
      triggerToast("Veuillez remplir tous les champs requis.");
      return;
    }

    const created: LocalExperience = {
      id: `EXP-CUST-${Date.now().toString().slice(-4)}`,
      title: newTitle.trim(),
      category: newCat,
      hotelCompatibility: [currentHotel], // default compatible with currently chosen hotel
      pricePerPerson: newPrice,
      duration: newDuration || "3h",
      rating: 5.0,
      provider: newProvider.trim(),
      description: newDesc.trim(),
      spotsMax: newMaxSpots,
      featured: false
    };

    setExperiences([created, ...experiences]);
    setShowAddExpModal(false);
    triggerToast(`Expérience "${created.title}" ajoutée au catalogue.`);

    // clear inputs
    setNewTitle('');
    setNewProvider('');
    setNewDesc('');
    setNewPrice(30000);

    onAddNotification(
      "Activité ajoutée au Catalogue",
      `Le guide de conciergerie intègre désormais la nouvelle expérience "${created.title}" par ${created.provider}.`,
      'info'
    );
  };

  // Booking of activity execution
  const handleBuyBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpId) return;
    if (!buyGuest.trim()) {
      triggerToast("Le nom du client logé est obligatoire.");
      return;
    }

    const selectedExp = experiences.find(ex => ex.id === selectedExpId);
    if (!selectedExp) return;

    let basePrice = selectedExp.pricePerPerson * buyPax;
    const addedOpts: string[] = [];
    if (optLunch) {
      basePrice += 15000 * buyPax;
      addedOpts.push("Déjeuner Gourmet local préparé (+15k F/pers)");
    }
    if (optDroneVideo) {
      basePrice += 25000;
      addedOpts.push("Reportage souvenir Drone & Go Pro (+25k F)");
    }

    const uniqueVoucherId = `VCH-EXP-${Math.floor(1000 + Math.random() * 9000)}`;
    const comm = Math.round(basePrice * 0.15); // 15% standard commission

    const booked: ExperienceBooking = {
      id: uniqueVoucherId,
      experienceId: selectedExp.id,
      experienceTitle: selectedExp.title,
      guestName: buyGuest.trim(),
      roomNumber: buyRoom.trim(),
      dateStr: buyDate,
      paxCount: buyPax,
      optionsSelected: addedOpts,
      totalPrice: basePrice,
      commissionEarned: comm,
      status: "Confirmé",
      agentName: "Système Conciergerie Senegal"
    };

    setBookings([booked, ...bookings]);
    setShowBuyModal(false);

    // clear form
    setBuyGuest('');
    setOptLunch(false);
    setOptDroneVideo(false);

    onAddNotification(
      "Ticket d'Excursion Émis !",
      `${buyGuest} (${buyRoom}) réservé pour "${selectedExp.title}". Montant : ${basePrice.toLocaleString('fr-FR')} FCFA.`,
      'réservation'
    );
    triggerToast("Réservation enregistrée et commissionnée à 15% !");
  };

  // Filter experiences
  const filteredExperiences = useMemo(() => {
    return experiences.filter(ex => {
      const matchSearch = ex.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          ex.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          ex.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const isCompat = ex.hotelCompatibility.includes(currentHotel);
      const isCatMatched = activeCategory === 'Tous' || ex.category === activeCategory;

      return matchSearch && isCompat && isCatMatched;
    });
  }, [experiences, searchTerm, activeCategory, currentHotel]);

  // Selected experience details helper
  const selectedExperience = useMemo(() => {
    if (!selectedExpId) return null;
    return experiences.find(ex => ex.id === selectedExpId) || null;
  }, [selectedExpId, experiences]);

  // Excursions statistics info for the financial/owner overview
  const experiencesStats = useMemo(() => {
    // bookings that belong to currently active hotel setup
    const relatedBookings = bookings.filter(b => {
      const exp = experiences.find(e => e.id === b.experienceId);
      return exp && exp.hotelCompatibility.includes(currentHotel);
    });

    const accumulativeCFA = relatedBookings.reduce((sum, curr) => sum + curr.totalPrice, 0);
    const accumulativeCommissions = relatedBookings.reduce((sum, curr) => sum + curr.commissionEarned, 0);
    const confirmedCount = relatedBookings.filter(b => b.status === 'Confirmé').length;
    const pendingCount = relatedBookings.filter(b => b.status === 'En attente').length;

    return {
      totalBookedSales: accumulativeCFA,
      hotelNetCommissions: accumulativeCommissions,
      confirmedCount,
      pendingCount
    };
  }, [bookings, experiences, currentHotel]);

  return (
    <div className="space-y-6 fade-in-up">

      {/* Dynamic Toast popup */}
      {toastMessage && (
        <div className="bg-[#09153D] text-white px-4 py-3.5 rounded-[18px] text-xs font-bold shadow-lg flex items-center gap-2.5 fixed top-6 right-6 z-50 max-w-sm border border-slate-700/60 animate-in fade-in slide-in-from-top-3">
          <Sparkles className="w-4 h-4 text-orange-400 shrink-0" />
          <span className="leading-snug text-left">{toastMessage}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#09153D] tracking-tight font-sans">Marché d'Expériences Local</h2>
          <p className="text-xs text-slate-400 font-medium">Conciergerie, activités touristiques de la Téranga et excursions recommandées à {currentHotel}</p>
        </div>

        <div className="flex items-center gap-2">
          {currentRole !== 'Responsable Ménage' && currentRole !== 'Directeur Financier' && (
            <button
              onClick={() => setShowAddExpModal(true)}
              className="bg-[#09153D] hover:bg-[#152e6d] text-white font-black text-xs px-4 py-3 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Référencer Excursion</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 border border-amber-200/50 rounded-xl text-[10px] font-bold text-amber-700 shrink-0 select-none">
            <Compass className="w-3.5 h-3.5 text-orange-600 animate-spin" style={{ animationDuration: '6s' }} />
            <span>Excursions de la Téranga</span>
          </div>
        </div>
      </div>

      {/* STATS STRIP BANNER */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total booked turn-over */}
        <div className="bg-white p-4.5 rounded-[20px] border border-slate-100 shadow-sm text-left">
          <span className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest block">Ventes Excursions</span>
          <span className="text-2xl font-black text-[#09153D] font-mono block mt-1">
            {experiencesStats.totalBookedSales.toLocaleString('fr-FR')} F
          </span>
          <span className="text-[10px] text-slate-450 font-medium">reversés aux partenaires locaux</span>
        </div>

        {/* 15% Net Hotel revenues */}
        <div className="bg-white p-4.5 rounded-[20px] border border-slate-100 shadow-sm text-left relative overflow-hidden">
          <div className="absolute right-3.5 top-3.5 p-1 bg-emerald-50 text-emerald-600 rounded-lg">
            <TrendingUp className="w-4 h-4" />
          </div>
          <span className="text-[9.5px] font-extrabold text-emerald-600 uppercase tracking-widest block">Commissions (15%)</span>
          <span className="text-2xl font-black text-emerald-600 font-mono block mt-1">
            +{experiencesStats.hotelNetCommissions.toLocaleString('fr-FR')} F
          </span>
          <span className="text-[10px] text-slate-450 font-bold">Revenu net de conciergerie</span>
        </div>

        {/* Confirmed bookings counter */}
        <div className="bg-white p-4.5 rounded-[20px] border border-slate-100 shadow-sm text-left">
          <span className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest block">Départs Validés</span>
          <span className="text-2xl font-black text-[#09153D] font-mono block mt-1">
            {experiencesStats.confirmedCount} Excursions
          </span>
          <span className="text-[10px] text-emerald-600 font-semibold">Taux de départs conforme</span>
        </div>

        {/* Pending approvals */}
        <div className="bg-white p-4.5 rounded-[20px] border border-slate-100 shadow-sm text-left">
          <span className="text-[9.5px] font-extrabold text-orange-650 uppercase tracking-widest block">En Attente Partenaire</span>
          <span className="text-2xl font-black text-orange-650 font-mono block mt-1">
            {experiencesStats.pendingCount} Demandes
          </span>
          <span className="text-[10px] text-slate-450 font-medium">validation prestataires extérieurs</span>
        </div>

      </div>

      {/* SEARCH AND FILTERS ROW */}
      <div className="bg-white p-4 rounded-[22px] border border-slate-100 shadow-sm text-left flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Search bar inputs */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Rechercher une excursion, un prestataire..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-150 rounded-xl py-2 pl-9 pr-4 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all text-slate-800"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <Search className="w-4 h-4" />
          </div>
        </div>

        {/* Categories selector */}
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto p-1 bg-slate-50 border rounded-xl select-none">
          {(['Tous', 'Safari & Nature', 'Aventure & Sport', 'Culture & Gastronomie', 'Bien-être'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`text-[10.5px] font-extrabold px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === cat 
                  ? 'bg-[#09153D] text-orange-400 font-extrabold shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {cat.toUpperCase()}
            </button>
          ))}
        </div>

      </div>

      {/* GRID DISPLAY SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left pane: Excursion listings cards */}
        <div className="lg:col-span-8 space-y-4 text-left">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredExperiences.length === 0 ? (
              <div className="md:col-span-2 bg-white rounded-[24px] border border-slate-100 p-12 text-center text-slate-400 text-xs font-semibold italic">
                Aucune excursion répertoriée ne correspond à vos critères de recherche pour l'établissement {currentHotel}.
              </div>
            ) : (
              filteredExperiences.map(ex => {
                const isSelected = selectedExpId === ex.id;
                return (
                  <div
                    key={ex.id}
                    onClick={() => setSelectedExpId(isSelected ? null : ex.id)}
                    className={`bg-white rounded-[24px] border p-5 transition-all text-left flex flex-col justify-between/0 relative cursor-pointer gap-3.5 ${
                      isSelected 
                        ? 'border-orange-500 ring-1 ring-orange-500/10 bg-orange-50/5 shadow-sm' 
                        : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/10'
                    }`}
                  >
                    
                    {/* Badge priority tag */}
                    <div className="flex items-center justify-between">
                      <span className={`text-[8.5px] font-black uppercase px-2.5 py-0.5 rounded ${
                        ex.category === 'Safari & Nature' ? 'bg-emerald-50 text-emerald-600' :
                        ex.category === 'Aventure & Sport' ? 'bg-orange-50 text-orange-600' :
                        ex.category === 'Culture & Gastronomie' ? 'bg-sky-50 text-sky-600' :
                        'bg-purple-50 text-purple-600'
                      }`}>
                        {ex.category}
                      </span>

                      {/* Score marker */}
                      <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-0.5">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
                        {ex.rating}
                      </span>
                    </div>

                    {/* Headline titles */}
                    <div>
                      <h4 className="font-extrabold text-[#09153D] text-xs md:text-sm tracking-tight leading-snug mt-1">
                        {ex.title}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wide">Fourni par : {ex.provider}</p>
                    </div>

                    {/* Fast description details */}
                    <p className="text-[11px] text-slate-500 line-clamp-3 leading-normal font-medium">
                      {ex.description}
                    </p>

                    {/* Highlights row footer details */}
                    <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                      
                      <div className="flex items-center gap-2.5 text-slate-400 select-none">
                        <span className="flex items-center gap-1 text-[10.5px]">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {ex.duration}
                        </span>
                        <span className="text-[10px]">•</span>
                        <span className="flex items-center gap-0.5 text-[10.5px]">
                          <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          Max {ex.spotsMax} pers
                        </span>
                      </div>

                      {/* Pricing block info */}
                      <div className="text-right">
                        <span className="text-sm font-black text-[#09153D] font-mono block">
                          {ex.pricePerPerson.toLocaleString('fr-FR')} F
                        </span>
                        <span className="text-[8.5px] text-slate-400 font-bold uppercase block">par personne</span>
                      </div>

                    </div>

                  </div>
                );
              })
            )}
          </div>

          {/* ACTIVE BOOKINGS LIST BOARD Table layout */}
          <div className="bg-white rounded-[24px] border border-slate-100 p-5 shadow-sm space-y-4">
            
            <div className="flex items-center justify-between border-b pb-3.5">
              <div>
                <h3 className="font-extrabold text-[#09153D] text-sm">Registre des Bons d'Excursion Émis</h3>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Contrôle des billets actifs, commissions et logistique prestataires</p>
              </div>

              <span className="text-[10px] font-extrabold font-mono text-[#09153D] bg-slate-50 border border-slate-150 px-2.5 py-1 rounded">
                {bookings.length} Bons Actifs
              </span>
            </div>

            {bookings.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-6">Aucun bon de conciergerie actuellement émis.</p>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="min-w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-[#09153D] font-black uppercase text-[9px] tracking-wider select-none">
                      <th className="py-2">Réf Voucher</th>
                      <th className="py-2">Client logé</th>
                      <th className="py-2">Activité / Excursion</th>
                      <th className="py-2 text-right">Tarif Global</th>
                      <th className="py-2 text-right">Com. Hôtel</th>
                      <th className="py-2 text-center">Statut</th>
                      <th className="py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {bookings.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                        
                        {/* 1. Voucher REF */}
                        <td className="py-3 pr-2">
                          <button
                            onClick={() => setViewTicketVoucher(b)}
                            className="bg-slate-50 hover:bg-orange-50 border border-slate-205 border-slate-150 text-[10px] text-slate-650 hover:text-orange-600 font-mono font-bold px-2 py-0.5 rounded cursor-pointer transition-all flex items-center gap-1"
                          >
                            <QrCode className="w-3 h-3" />
                            {b.id}
                          </button>
                        </td>

                        {/* 2. Guest Name */}
                        <td className="py-3">
                          <p className="font-extrabold text-slate-800">{b.guestName}</p>
                          <span className="text-[9.5px] text-slate-400 font-mono bg-slate-50 px-1 border rounded">{b.roomNumber}</span>
                        </td>

                        {/* 3. Activity Title and pax */}
                        <td className="py-3 max-w-[180px] truncate">
                          <p className="font-bold text-[#09153D] truncate" title={b.experienceTitle}>
                            {b.experienceTitle}
                          </p>
                          <span className="text-[9.5px] text-orange-650 font-bold">
                            👨‍👩‍👦 {b.paxCount} {b.paxCount > 1 ? 'participants' : 'participant'} • {b.dateStr}
                          </span>
                        </td>

                        {/* 4. Global pricing */}
                        <td className="py-3 text-right font-mono font-black text-[#09153D]">
                          {b.totalPrice.toLocaleString('fr-FR')} F
                        </td>

                        {/* 5. 15% commission marker */}
                        <td className="py-3 text-right font-mono font-bold text-emerald-600 bg-emerald-50/10 px-1">
                          +{b.commissionEarned.toLocaleString('fr-FR')} F
                        </td>

                        {/* 6. Status badge */}
                        <td className="py-3 text-center">
                          <div className="flex items-center justify-center">
                            {b.status === 'Confirmé' ? (
                              <span className="bg-emerald-50 text-emerald-600 text-[8.5px] font-black uppercase px-2 py-0.5 rounded flex items-center gap-0.5">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                Confirmé
                              </span>
                            ) : b.status === 'En attente' ? (
                              <span className="bg-orange-50 text-orange-600 text-[8.5px] font-black uppercase px-2 py-0.5 rounded flex items-center gap-0.5">
                                <Activity className="w-2.5 h-2.5 animate-pulse" />
                                En Attente
                              </span>
                            ) : (
                              <span className="bg-rose-50 text-rose-600 text-[8.5px] font-black uppercase px-2 py-0.5 rounded">
                                Annulé
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 7. Action buttons */}
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1 select-none">
                            {b.status === 'En attente' && (
                              <button
                                onClick={() => handleUpdateBookingStatus(b.id, 'Confirmé')}
                                className="p-1 text-emerald-650 hover:bg-emerald-50 rounded"
                                title="Approuver l'activité"
                              >
                                ✓
                              </button>
                            )}

                            {b.status === 'Confirmé' && (
                              <button
                                onClick={() => handleUpdateBookingStatus(b.id, 'Annulé')}
                                className="p-1 text-orange-600 hover:bg-orange-50 rounded"
                                title="Déclarer annulé"
                              >
                                ✕
                              </button>
                            )}

                            {(currentRole === "Propriétaire d'Hôtel" || currentRole === 'Directeur Financier') && (
                              <button
                                onClick={() => handleDeleteBooking(b.id, b.guestName)}
                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                                title="Supprimer définitivement"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>

        </div>

        {/* Right pane: Excursion specific operations / Details summary panel */}
        <div className="lg:col-span-4 space-y-4">
          
          {selectedExperience ? (
            <div className="bg-white rounded-[24px] border border-slate-100 p-5 text-left shadow-sm space-y-4.5">
              
              <div className="border-b border-slate-50 pb-4.5">
                <span className="text-[9px] font-extrabold text-[#09153D]/50 uppercase tracking-widest block">FICHE EXCURSION EN SENEGAL</span>
                <h3 className="font-extrabold text-md text-[#09153D] leading-snug mt-2">{selectedExperience.title}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">{selectedExperience.provider}</p>
              </div>

              {/* Mini details list */}
              <div className="space-y-2.5 text-xs text-slate-600">
                <p className="leading-relaxed font-semibold italic text-slate-500">
                  "{selectedExperience.description}"
                </p>

                <div className="grid grid-cols-2 gap-3 text-left pt-2">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[8.5px] font-extrabold text-slate-400 uppercase tracking-wider block">DURÉE</span>
                    <span className="text-xs font-black text-[#09153D]">{selectedExperience.duration}</span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[8.5px] font-extrabold text-slate-400 uppercase tracking-wider block">CAPACITÉ</span>
                    <span className="text-xs font-black text-[#09153D]">Max {selectedExperience.spotsMax} PAX</span>
                  </div>
                </div>

                <div className="bg-orange-50/50 p-3.5 rounded-xl border border-orange-100/60 flex items-center justify-between mt-2">
                  <div>
                    <span className="text-[9px] text-orange-650 font-extrabold uppercase tracking-wide block">Tarif Conseillé</span>
                    <span className="text-xl font-mono font-black text-[#09153D] mt-0.5">
                      {selectedExperience.pricePerPerson.toLocaleString('fr-FR')} F
                    </span>
                  </div>

                  <div className="bg-white px-3.5 py-2.5 rounded-lg border border-orange-100/50 text-right">
                    <span className="text-[8px] text-emerald-600 font-extrabold block">COMMISSION</span>
                    <span className="text-[11px] font-mono font-black text-emerald-600">
                      {(selectedExperience.pricePerPerson * 0.15).toLocaleString('fr-FR')} F
                    </span>
                  </div>
                </div>
              </div>

              {/* ACTION: EMIT VOUCHER */}
              {currentRole !== 'Responsable Ménage' ? (
                <button
                  onClick={() => setShowBuyModal(true)}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black text-xs p-3.5 rounded-xl shadow-lg shadow-orange-550/10 transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Map className="w-4 h-4" />
                  <span>Nouveau Bon de Réservation</span>
                </button>
              ) : (
                <p className="text-[10px] text-slate-400 font-bold italic text-center p-2.5 bg-slate-50 rounded-xl">
                  🔒 Réservation restreinte au personnel navigant et Front Desk.
                </p>
              )}

              {/* Compatible hotels info badge */}
              <div className="pt-2 text-[10.5px] text-slate-400 text-left font-medium space-y-1">
                <span className="font-extrabold block text-slate-500 uppercase text-[9px]">Géo-localisations recommandées :</span>
                <span className="inline-flex gap-1.5 flex-wrap">
                  {selectedExperience.hotelCompatibility.map((h, i) => (
                    <span key={i} className="bg-slate-50 border border-slate-150 px-2 py-0.5 rounded text-[#09153D] font-bold">
                      📍 {h}
                    </span>
                  ))}
                </span>
              </div>

            </div>
          ) : (
            <div className="bg-white rounded-[24px] border border-slate-100 p-12 text-center text-slate-400 text-xs italic font-medium min-h-[300px] flex flex-col items-center justify-center space-y-3">
              <Compass className="w-8 h-8 text-slate-300 stroke-[1.5]" />
              <div>
                <p className="font-bold">Aucune activité sélectionnée</p>
                <p className="text-[10px] text-slate-400 mt-1 max-w-[200px] leading-relaxed mx-auto">
                  Veuillez cliquer sur une excursion de la liste pour voir sa tarification complète, ses conditions d'accès, et générer les bons de départ.
                </p>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* MODAL 1: EMIT EXCURSION RESERVATION VOUCHER */}
      {showBuyModal && selectedExperience && (
        <div className="fixed inset-0 z-50 bg-[#09153D]/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] border border-slate-150/80 shadow-2xl max-w-md w-full overflow-hidden text-left animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="p-6 bg-[#09153D] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Compass className="w-5.5 h-5.5 text-orange-400" />
                <div>
                  <h3 className="font-extrabold text-white text-md tracking-tight">Réserver une Excursion</h3>
                  <p className="text-[10px] text-slate-300 font-medium">Formulaire de Conciergerie Téranga - {currentHotel}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowBuyModal(false)}
                className="text-white hover:text-slate-300 cursor-pointer text-sm font-bold bg-white/10 w-7 h-7 rounded-full flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleBuyBookingSubmit} className="p-6 space-y-4">
              
              {/* Target activity information view */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-150 space-y-1">
                <span className="text-[8.5px] font-bold text-slate-400 uppercase">Activité ciblée :</span>
                <p className="text-xs font-extrabold text-[#09153D]">{selectedExperience.title}</p>
                <p className="text-[10.5px] font-semibold text-orange-650">{selectedExperience.pricePerPerson.toLocaleString('fr-FR')} F / personne</p>
              </div>

              {/* Guest search name input */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  Nom complet du client logé (Sénégal Hotels) :
                </label>
                <input
                  type="text"
                  placeholder="Ex : Philippe Martin, Khady Diouf..."
                  value={buyGuest}
                  onChange={(e) => setBuyGuest(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs font-bold p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500"
                  required
                />
              </div>

              {/* Room and Date selection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Chambre rattachée :
                  </label>
                  <input
                    type="text"
                    placeholder="Ex : Suite 203, Chambre 14"
                    value={buyRoom}
                    onChange={(e) => setBuyRoom(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold p-3 rounded-xl focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Date prévue du départ :
                  </label>
                  <input
                    type="date"
                    value={buyDate}
                    onChange={(e) => setBuyDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-mono p-3 rounded-xl focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Pax count */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  Nombre de participants :
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={selectedExperience.spotsMax}
                    value={buyPax}
                    onChange={(e) => setBuyPax(parseInt(e.target.value) || 1)}
                    className="flex-1 accent-orange-600"
                  />
                  <span className="w-12 text-center bg-slate-100 font-mono font-black border p-2 text-xs rounded-lg text-[#09153D]">
                    {buyPax} PAX
                  </span>
                </div>
              </div>

              {/* Extra Experience Add-ons */}
              <div className="space-y-2">
                <label className="block text-[10.5px] font-extrabold text-slate-400 uppercase tracking-widest">
                  Options et suppléments de conciergerie :
                </label>
                
                <div className="flex items-center gap-2.5 p-3.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    id="optLunch"
                    checked={optLunch}
                    onChange={(e) => setOptLunch(e.target.checked)}
                    className="w-4.5 h-4.5 cursor-pointer accent-orange-600 rounded"
                  />
                  <div>
                    <label htmlFor="optLunch" className="block text-xs font-bold text-slate-700 cursor-pointer">
                      Intégrer Coffret Panier Repas Gourmet (+15 000 F / PAX)
                    </label>
                    <span className="text-[10px] text-slate-450 block">Confit de canard casamançais, boissons fraîches artisanales.</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-3.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    id="optDroneVideo"
                    checked={optDroneVideo}
                    onChange={(e) => setOptDroneVideo(e.target.checked)}
                    className="w-4.5 h-4.5 cursor-pointer accent-orange-600 rounded"
                  />
                  <div>
                    <label htmlFor="optDroneVideo" className="block text-xs font-bold text-slate-700 cursor-pointer">
                      Reportage Drone, Go Pro & Cadreur Souvenir (+25 000 F)
                    </label>
                    <span className="text-[10px] text-slate-450 block">Le prestataire fournira un montage vidéo 4K de l'excursion sous 48h.</span>
                  </div>
                </div>
              </div>

              {/* Submit panel summary */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3.5">
                <button
                  type="button"
                  onClick={() => setShowBuyModal(false)}
                  className="px-4.5 py-3 hover:bg-slate-50 border border-slate-200 text-xs font-extrabold text-slate-600 rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs px-5 py-3 rounded-xl cursor-pointer shadow-md shadow-orange-550/10"
                >
                  Émettre et Enregistrer le Bon
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD A LOCAL EXCURSION REFERRAL */}
      {showAddExpModal && (
        <div className="fixed inset-0 z-50 bg-[#09153D]/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] border border-slate-150/80 shadow-2xl max-w-md w-full overflow-hidden text-left animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-[#09153D] to-orange-650 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Plus className="w-5.5 h-5.5 text-white" />
                <div>
                  <h3 className="font-extrabold text-white text-md tracking-tight">Référencer un Partenaire Local</h3>
                  <p className="text-[10.5px] text-orange-200 font-medium">Ajouter une expérience touristique au guide de {currentHotel}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddExpModal(false)}
                className="text-white hover:text-slate-300 cursor-pointer text-sm font-bold bg-white/10 w-7 h-7 rounded-full flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateExperienceSubmit} className="p-6 space-y-4">
              
              {/* Experience Title */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  Titre commercial de l'excursion :
                </label>
                <input
                  type="text"
                  placeholder="Ex : Randonnée Pirogue Somone Coucher de Soleil..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs font-bold p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500"
                  required
                />
              </div>

              {/* Provider & Category */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Prestateur de service :
                  </label>
                  <input
                    type="text"
                    placeholder="Ex : Somone Loisirs GIE"
                    value={newProvider}
                    onChange={(e) => setNewProvider(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold p-3 rounded-xl focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Catégorie d'Excursion :
                  </label>
                  <select
                    value={newCat}
                    onChange={(e) => setNewCat(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold p-3 rounded-xl cursor-pointer"
                  >
                    <option value="Safari & Nature">Safari & Nature</option>
                    <option value="Aventure & Sport">Aventure & Sport</option>
                    <option value="Culture & Gastronomie">Culture & Gastronomie</option>
                    <option value="Bien-être">Bien-être</option>
                  </select>
                </div>
              </div>

              {/* Price, Duration, Capacity */}
              <div className="grid grid-cols-3 gap-3">
                
                <div className="space-y-1.5">
                  <label className="block text-[8.5px] font-extrabold text-slate-400 uppercase tracking-widest">
                    P.U Public (F) :
                  </label>
                  <input
                    type="number"
                    min={5000}
                    step={1000}
                    value={newPrice}
                    onChange={(e) => setNewPrice(parseInt(e.target.value) || 5000)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold p-3 rounded-xl focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[8.5px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Durée Estimée :
                  </label>
                  <input
                    type="text"
                    placeholder="Ex : 2h30, 1 Jour"
                    value={newDuration}
                    onChange={(e) => setNewDuration(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold p-3 rounded-xl focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[8.5px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Max PAX :
                  </label>
                  <input
                    type="number"
                    min={2}
                    value={newMaxSpots}
                    onChange={(e) => setNewMaxSpots(parseInt(e.target.value) || 2)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold p-3 rounded-xl focus:outline-none"
                    required
                  />
                </div>

              </div>

              {/* Short description */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  Description de l'aventure touristique :
                </label>
                <textarea
                  placeholder="Détaillez le parcours guidé, les arrêts clés, dégustations ou matériels récréatifs fournis au client..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs font-medium p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500 h-20 resize-none"
                  required
                />
              </div>

              {/* Submit footer */}
              <div className="pt-4 border-t border-slate-50 flex items-center justify-end gap-3.5">
                <button
                  type="button"
                  onClick={() => setShowAddExpModal(false)}
                  className="px-4.5 py-3 hover:bg-slate-50 border text-xs font-extrabold text-slate-600 rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-[#09153D] hover:bg-[#1f3775] text-white font-black text-xs px-5 py-3 rounded-xl cursor-pointer shadow-md"
                >
                  Ajouter au Catalogue Public
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* POPUP 3: SPECIFIC TICKET EXPERIENCE VOUCHER INVOICE */}
      {viewTicketVoucher && (
        <div className="fixed inset-0 z-50 bg-[#09153D]/35 backdrop-blur-xs flex items-center justify-center p-4 select-none">
          <div className="bg-white rounded-[28px] border border-slate-150/70 shadow-2xl max-w-sm w-full overflow-hidden text-left animate-in zoom-in-95 duration-200">
            
            {/* Header style */}
            <div className="p-5 bg-[#09153D] text-white flex items-center justify-between text-center relative">
              <div className="mx-auto text-center space-y-1">
                <span className="text-[10px] font-black tracking-widest uppercase text-orange-400 bg-white/10 px-3 py-1 rounded-full">
                  BON DE CONCIERGERIE SENEGAL
                </span>
                <p className="text-[9.5px] text-slate-350 font-bold tracking-widest pt-1">SENEGAL HOTELS • {currentHotel}</p>
              </div>
              <button 
                onClick={() => setViewTicketVoucher(null)}
                className="text-white hover:text-slate-300 cursor-pointer absolute right-4 top-4 bg-white/10 w-6 h-6 rounded-full flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            {/* Voucher Body layout */}
            <div className="p-6 space-y-5 text-xs text-[#09153D]">
              
              <div className="text-center space-y-1.5 border-b border-dashed border-slate-200 pb-4">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest select-none">N° D'AUTHENTICITÉ UNIQUE</p>
                <span className="text-lg font-black font-mono text-orange-650 bg-slate-50 px-3.5 py-1 rounded-xl border border-slate-150">
                  {viewTicketVoucher.id}
                </span>
              </div>

              {/* Excursion and Guests metadata */}
              <div className="space-y-3">
                
                <div>
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Activité Excursion</span>
                  <p className="font-extrabold text-sm text-[#09153D] mt-0.5 leading-snug">{viewTicketVoucher.experienceTitle}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Client Logé</span>
                    <p className="font-extrabold text-slate-850 mt-0.5">{viewTicketVoucher.guestName}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Chambre</span>
                    <p className="font-extrabold text-slate-850 mt-0.5">{viewTicketVoucher.roomNumber}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Date du départ</span>
                    <p className="font-mono font-bold mt-0.5">{viewTicketVoucher.dateStr}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Participants</span>
                    <p className="font-extrabold mt-0.5">👨‍👩‍👦 {viewTicketVoucher.paxCount} PAX</p>
                  </div>
                </div>

                {viewTicketVoucher.optionsSelected.length > 0 && (
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-150">
                    <span className="text-[8.5px] font-extrabold text-slate-400 uppercase tracking-widest block">Suppléments requis :</span>
                    <ul className="list-disc pl-3 text-[10px] text-slate-500 font-semibold space-y-0.5 mt-1">
                      {viewTicketVoucher.optionsSelected.map((op, i) => (
                        <li key={i}>{op}</li>
                      ))}
                    </ul>
                  </div>
                )}

              </div>

              <div className="rounded-2xl bg-orange-50/50 p-4 border border-orange-100 flex items-center justify-between">
                <div>
                  <span className="text-[9.5px] font-extrabold text-[#09153D]/50 uppercase tracking-wider block">Solde à imputer sur facture :</span>
                  <span className="text-lg font-mono font-black text-[#09153D] mt-0.5 block">
                    {viewTicketVoucher.totalPrice.toLocaleString('fr-FR')} F
                  </span>
                </div>

                <div className="w-12 h-12 bg-white rounded border border-slate-100 flex items-center justify-center">
                  <QrCode className="w-9 h-9 text-slate-500" />
                </div>
              </div>

              <div className="text-center pt-2 select-none">
                <p className="text-[9px] text-slate-400 font-medium">Billet électronique officiel. Généré par {viewTicketVoucher.agentName}</p>
                <p className="text-[9px] text-slate-400 font-semibold mt-0.5">La commission de 15% est provisionnée d'office dans l'aperçu financier.</p>
              </div>

              {/* Action */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setViewTicketVoucher(null);
                    triggerToast("Ticket envoyé à l'imprimante thermique du Front Desk.");
                  }}
                  className="w-full bg-[#09153D] hover:bg-[#1a2d61] text-white font-extrabold text-xs py-3 rounded-xl transition-all cursor-pointer text-center"
                >
                  Imprimer le ticket
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
