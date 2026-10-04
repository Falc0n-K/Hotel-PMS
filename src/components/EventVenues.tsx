import React, { useState, useMemo } from 'react';
import { 
  MapPin, 
  Users, 
  Calendar, 
  Briefcase, 
  Sparkles, 
  Mic, 
  Video, 
  Clock, 
  Plus, 
  Bookmark, 
  Check, 
  Trash2, 
  Play, 
  FileText, 
  Sliders, 
  Coffee, 
  Flame, 
  PartyPopper,
  DollarSign,
  UtensilsCrossed,
  ShieldAlert,
  Edit2
} from 'lucide-react';
import { RBACRole } from '../types';

interface EventVenuesProps {
  currentHotel: string;
  currentRole: RBACRole;
  onAddNotification: (title: string, message: string, type: 'réservation' | 'paiement' | 'alerte' | 'info') => void;
}

export interface VenueSpace {
  id: string;
  name: string;
  hotel: 'Royal Saly' | 'Nema Kadior' | 'Les Pélicans du Saloum';
  capacityMax: number;
  dailyRate: number;
  type: 'Salle de Conférence' | 'Plage Privée' | 'Terrasse Deck' | 'Espace Culturel';
  amenities: string[];
  activeSetup: 'Classe' | 'Théâtre' | 'U-Table' | 'Cocktails' | 'Banquet';
  status: 'Disponible' | 'Loué' | 'Sous Entretien';
}

export interface VenueEventBooking {
  id: string;
  venueId: string;
  venueName: string;
  bookingTitle: string;
  sponsorName: string;
  dateStart: string;
  dateEnd: string;
  attendees: number;
  setupNeeded: 'Classe' | 'Théâtre' | 'U-Table' | 'Cocktails' | 'Banquet';
  cateringOption: boolean;
  totalCost: number;
  paymentStatus: 'Acompte Payé' | 'Payé Intégral' | 'Non Payé';
}

export default function EventVenues({
  currentHotel,
  currentRole,
  onAddNotification
}: EventVenuesProps) {
  
  // Hardcoded core venue spaces for Seneca Hotels
  const [venues, setVenues] = useState<VenueSpace[]>([
    {
      id: "VNU-BAY",
      name: "Grand Chapiteau Baobab Saly",
      hotel: "Royal Saly",
      capacityMax: 350,
      dailyRate: 650000,
      type: "Salle de Conférence",
      amenities: ["Projecteur 4K", "Sonorisation Array", "Climatisation active", "Traduction simultanée"],
      activeSetup: "Théâtre",
      status: "Loué"
    },
    {
      id: "VNU-COCO",
      name: "La Plage des Cocotiers",
      hotel: "Royal Saly",
      capacityMax: 500,
      dailyRate: 850000,
      type: "Plage Privée",
      amenities: ["Régie Lumière Extérieure", "Bar de plage privatif", "Feu de camp autorisé", "Barnums de réception"],
      activeSetup: "Cocktails",
      status: "Disponible"
    },
    {
      id: "VNU-NEMA",
      name: "L'Espace Teranga Casamance",
      hotel: "Nema Kadior",
      capacityMax: 180,
      dailyRate: 400000,
      type: "Espace Culturel",
      amenities: ["Scène sur-élevée", "Climatisation ventilée", "Chaises rotin premium", "Micros HF Shure"],
      activeSetup: "Banquet",
      status: "Disponible"
    },
    {
      id: "VNU-PEL",
      name: "La Rotonde des Pélicans",
      hotel: "Les Pélicans du Saloum",
      capacityMax: 120,
      dailyRate: 300000,
      type: "Terrasse Deck",
      amenities: ["Vue panoramique Mangrove", "Sono portable bluetooth", "Option Buffet Poisson Grillé", "Ventilateurs brumisateurs"],
      activeSetup: "U-Table",
      status: "Disponible"
    },
    {
      id: "VNU-SALOUM",
      name: "Salle Polyvalente Sine-Saloum",
      hotel: "Les Pélicans du Saloum",
      capacityMax: 220,
      dailyRate: 480000,
      type: "Salle de Conférence",
      amenities: ["Rétroprojecteur", "Tableaux blancs", "Prises de sol multiples", "AC centralisé"],
      activeSetup: "Classe",
      status: "Sous Entretien"
    }
  ]);

  // Event Scheduler current reservations list
  const [bookings, setBookings] = useState<VenueEventBooking[]>([
    {
      id: "EV-901",
      venueId: "VNU-BAY",
      venueName: "Grand Chapiteau Baobab Saly",
      bookingTitle: "Séminaire Régional CEDEAO Telecom",
      sponsorName: "Sonatel Orange",
      dateStart: "2026-05-21",
      dateEnd: "2026-05-23",
      attendees: 280,
      setupNeeded: "Théâtre",
      cateringOption: true,
      totalCost: 1950000, // 3 days
      paymentStatus: "Payé Intégral"
    },
    {
      id: "EV-902",
      venueId: "VNU-COCO",
      venueName: "La Plage des Cocotiers",
      bookingTitle: "Mariage Traditionnel Christian & Adjara",
      sponsorName: "Famille Coste-Diop",
      dateStart: "2026-05-24",
      dateEnd: "2026-05-24",
      attendees: 420,
      setupNeeded: "Cocktails",
      cateringOption: true,
      totalCost: 1150000,
      paymentStatus: "Acompte Payé"
    },
    {
      id: "EV-903",
      venueId: "VNU-NEMA",
      venueName: "L'Espace Teranga Casamance",
      bookingTitle: "Gala de Clôture - Festival de Danse Ziguinchor",
      sponsorName: "Alliance Française",
      dateStart: "2026-05-28",
      dateEnd: "2026-05-29",
      attendees: 150,
      setupNeeded: "Banquet",
      cateringOption: true,
      totalCost: 900000,
      paymentStatus: "Non Payé"
    }
  ]);

  // Filter state
  const [typeFilter, setTypeFilter] = useState<string>('Tous');
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>("VNU-BAY");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Space Form State
  const [showAddSpaceModal, setShowAddSpaceModal] = useState(false);
  const [nsName, setNsName] = useState('');
  const [nsRate, setNsRate] = useState<number>(350000);
  const [nsCapacity, setNsCapacity] = useState<number>(100);
  const [nsType, setNsType] = useState<VenueSpace['type']>("Salle de Conférence");
  const [nsAmenitiesInput, setNsAmenitiesInput] = useState('');
  const [nsAmenities, setNsAmenities] = useState<string[]>([]);

  // Simple quick events booking state
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [ebTitle, setEbTitle] = useState('');
  const [ebSponsor, setEbSponsor] = useState('');
  const [ebDateStr, setEbDateStr] = useState('2026-05-22');
  const [ebAttendees, setEbAttendees] = useState<number>(50);
  const [ebSetup, setEbSetup] = useState<VenueSpace['activeSetup']>("Théâtre");
  const [ebCatering, setEbCatering] = useState(true);
  const [ebDays, setEbDays] = useState<number>(1);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Switch setup configuration layouts (U-Shape, Banquet, Classroom etc.)
  const handleUpdateLayout = (venueId: string, layout: VenueSpace['activeSetup']) => {
    if (currentRole === 'Responsable Ménage') {
      triggerToast("Permissions refusées : La disposition des salles exige la validation du Directeur d'exploitation.");
      return;
    }

    setVenues(prev => prev.map(v => {
      if (v.id === venueId) {
        return { ...v, activeSetup: layout };
      }
      return v;
    }));
    triggerToast(`Disposition mise à jour vers : ${layout}.`);
  };

  // Toggle Maintenance statuses
  const handleToggleMaintenance = (venueId: string) => {
    if (currentRole === 'Réceptionniste (Front Desk)') {
      triggerToast("Accès restreint aux Responsables techniques ou Ménage pour débloquer/bloquer les espaces.");
      return;
    }

    setVenues(prev => prev.map(v => {
      if (v.id === venueId) {
        const nextStatus = v.status === 'Sous Entretien' ? 'Disponible' : 'Sous Entretien';
        
        onAddNotification(
          nextStatus === 'Sous Entretien' ? "Espace En Entretien" : "Espace Prêt",
          `L'espace d'événement "${v.name}" à ${v.hotel} est désormais ${nextStatus.toLowerCase()}.`,
          nextStatus === 'Sous Entretien' ? 'alerte' : 'info'
        );

        return { ...v, status: nextStatus };
      }
      return v;
    }));
    triggerToast("Changement de disponibilité d'espace appliqué.");
  };

  // Add customized amenity to layout creator
  const handleAddAmenityTag = () => {
    if (nsAmenitiesInput.trim()) {
      setNsAmenities([...nsAmenities, nsAmenitiesInput.trim()]);
      setNsAmenitiesInput('');
    }
  };

  // Handle Create space submit
  const handleCreateSpaceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nsName.trim()) {
      triggerToast("Le nom de l'espace est requis.");
      return;
    }

    const uniqueId = `VNU-${nsName.slice(0, 4).toUpperCase()}-${Date.now().toString().slice(-3)}`;
    const newV: VenueSpace = {
      id: uniqueId,
      name: nsName.trim(),
      hotel: currentHotel as any,
      capacityMax: nsCapacity,
      dailyRate: nsRate,
      type: nsType,
      amenities: nsAmenities.length > 0 ? nsAmenities : ["Climatisation", "Multiprises"],
      activeSetup: "Théâtre",
      status: "Disponible"
    };

    setVenues([...venues, newV]);
    setShowAddSpaceModal(false);
    setNsName('');
    setNsCapacity(100);
    setNsRate(350000);
    setNsAmenities([]);
    
    onAddNotification(
      "Espace créé au PMS",
      `Nouveau lieu d'événement "${nsName.trim()}" configuré avec succès pour ${currentHotel}.`,
      'info'
    );
    triggerToast(`Nouvelle salle "${nsName}" enregistrée.`);
  };

  // Handle Event space Booking Form
  const handleAddBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVenueId) {
      triggerToast("Veuillez sélectionner une salle d'abord.");
      return;
    }
    if (!ebTitle.trim() || !ebSponsor.trim()) {
      triggerToast("Tous les champs sont obligatoires.");
      return;
    }

    const targetSpace = venues.find(v => v.id === selectedVenueId);
    if (!targetSpace) return;

    if (targetSpace.status === 'Sous Entretien') {
      triggerToast("Impossible de réserver cet espace: Il est présentement sous maintenance technique.");
      return;
    }

    const priceCateringBase = ebCatering ? (12000 * ebAttendees) : 0;
    const computedCost = (targetSpace.dailyRate * ebDays) + priceCateringBase;

    const newBooking: VenueEventBooking = {
      id: `EV-${100 + bookings.length + 1}`,
      venueId: targetSpace.id,
      venueName: targetSpace.name,
      bookingTitle: ebTitle.trim(),
      sponsorName: ebSponsor.trim(),
      dateStart: ebDateStr,
      dateEnd: ebDateStr, // standard same day/multi
      attendees: ebAttendees,
      setupNeeded: ebSetup,
      cateringOption: ebCatering,
      totalCost: computedCost,
      paymentStatus: "Acompte Payé"
    };

    // Update venue space status to "Loué"
    setVenues(prev => prev.map(v => {
      if (v.id === targetSpace.id) {
        return { ...v, status: 'Loué', activeSetup: ebSetup };
      }
      return v;
    }));

    setBookings([newBooking, ...bookings]);
    setShowBookingModal(false);

    // clear fields
    setEbTitle('');
    setEbSponsor('');
    setEbAttendees(50);

    onAddNotification(
      "Événement réservé !",
      `"${ebTitle}" programmé le ${ebDateStr} au ${targetSpace.name}. Forfait d'apport: ${computedCost.toLocaleString('fr-FR')} FCFA.`,
      'réservation'
    );
    triggerToast(`Convention d'événement validée pour le ${targetSpace.name} !`);
  };

  // Master delete venue Space
  const handleDeleteVenue = (venueId: string, label: string) => {
    if (currentRole !== "Propriétaire d'Hôtel") {
      triggerToast("Accès refusé. Seuls le Propriétaire de l’hôtel peut déclasser un espace événementiel du catalogue.");
      return;
    }

    if (!confirm(`Sérieux ? Voulez-vous radier définitivement l'espace "${label}" des registres ? Toutes les réservations associées seront ré-affectées.`)) {
      return;
    }

    setVenues(prev => prev.filter(v => v.id !== venueId));
    setBookings(prev => prev.filter(b => b.venueId !== venueId));
    if (selectedVenueId === venueId) setSelectedVenueId(null);
    triggerToast(`Espace d'événement "${label}" radié de la base.`);
  };

  // Stats computation
  const activeHotelVenues = useMemo(() => {
    return venues.filter(v => {
      const isCorrectHotel = v.hotel === currentHotel;
      const isCorrectType = typeFilter === 'Tous' || v.type === typeFilter;
      return isCorrectHotel && isCorrectType;
    });
  }, [venues, currentHotel, typeFilter]);

  const stats = useMemo(() => {
    const totalSpaces = activeHotelVenues.length;
    const rentSpaces = activeHotelVenues.filter(v => v.status === 'Loué').length;
    const maintCount = activeHotelVenues.filter(v => v.status === 'Sous Entretien').length;
    const accumulatedRentals = bookings
      .filter(b => {
        const matchingVenue = venues.find(v => v.id === b.venueId);
        return matchingVenue && matchingVenue.hotel === currentHotel;
      })
      .reduce((acc, curr) => acc + curr.totalCost, 0);

    return { totalSpaces, rentSpaces, maintCount, accumulatedRentals };
  }, [activeHotelVenues, bookings, currentHotel, venues]);

  const selectedVenue = useMemo(() => {
    if (!selectedVenueId) return null;
    return venues.find(v => v.id === selectedVenueId) || null;
  }, [selectedVenueId, venues]);

  const currentVenueBookings = useMemo(() => {
    if (!selectedVenueId) return [];
    return bookings.filter(b => b.venueId === selectedVenueId);
  }, [selectedVenueId, bookings]);

  return (
    <div className="space-y-6 fade-in-up">
      
      {/* Dynamic Toast popup */}
      {toastMessage && (
        <div className="bg-[#09153D] text-white px-4 py-3.5 rounded-[18px] text-xs font-bold shadow-lg flex items-center gap-2.5 animate-in fade-in slide-in-from-top-3 duration-250 fixed top-6 right-6 z-50 max-w-sm border border-slate-700/60">
          <Sparkles className="w-4 h-4 text-orange-400 shrink-0" />
          <span className="leading-snug text-left">{toastMessage}</span>
        </div>
      )}

      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#09153D] tracking-tight font-sans">Lieux d'Événements & Séminaires</h2>
          <p className="text-xs text-slate-400 font-medium">Planification de mariages, réceptions, comités exécutifs et séminaires à {currentHotel}</p>
        </div>

        <div className="flex items-center gap-2.5">
          {currentRole !== 'Responsable Ménage' && currentRole !== 'Réceptionniste (Front Desk)' ? (
            <button
              onClick={() => {
                setNsAmenities([]);
                setShowAddSpaceModal(true);
              }}
              className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs px-4 py-3 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-orange-600/10 shrink-0"
            >
              <Plus className="w-4.5 h-4.5 stroke-[3]" />
              <span>Créer Espace Événements</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200/50 rounded-xl text-[10px] font-bold text-slate-400">
              <Briefcase className="w-3.5 h-3.5 text-blue-500 hover:animate-spin" />
              <span>Co-ordinateur des Salles</span>
            </div>
          )}
        </div>
      </div>

      {/* METRICS ROW INFO */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        
        {/* Total Venue spaces */}
        <div className="bg-white p-4.5 rounded-[20px] border border-slate-100 shadow-sm text-left">
          <span className="text-[9px] font-extrabold text-[#09153D]/50 uppercase tracking-widest block">Capacité Salles</span>
          <span className="text-2xl font-black text-[#09153D] font-mono block mt-1">{stats.totalSpaces} Espaces</span>
          <span className="text-[9.5px] text-slate-400 font-medium">référencés à {currentHotel}</span>
        </div>

        {/* Occupied venues today */}
        <div className="bg-white p-4.5 rounded-[20px] border border-slate-100 shadow-sm text-left">
          <span className="text-[9px] font-extrabold text-orange-650 uppercase tracking-widest block">Occupés / Réservés</span>
          <span className="text-2xl font-black text-orange-600 font-mono block mt-1">{stats.rentSpaces} Réservés</span>
          <span className="text-[9.5px] text-slate-400 font-semibold">Événements planifiés aujourd'hui</span>
        </div>

        {/* Cumulative conference earnings */}
        <div className="bg-white p-4.5 rounded-[20px] border border-slate-100 shadow-sm text-left">
          <span className="text-[9px] font-extrabold text-emerald-650 uppercase tracking-widest block">C.A Banquet Réalisé</span>
          <span className="text-xl font-black text-[#09153D] font-mono block mt-1.5">
            {stats.accumulatedRentals.toLocaleString('fr-FR')} FCFA
          </span>
          <span className="text-[9.5px] text-slate-400 font-semibold text-emerald-600">Revenus de location + buffet</span>
        </div>

        {/* Under tech maintenance count */}
        <div className="bg-white p-4.5 rounded-[20px] border border-slate-100 shadow-sm text-left">
          <span className="text-[9px] font-extrabold text-slate-405 uppercase tracking-widest block">Maintenance Espaces</span>
          <span className="text-2xl font-black text-rose-600 font-mono block mt-1">{stats.maintCount} Bloqués</span>
          <span className="text-[9.5px] text-slate-400 font-medium">indisponibles au catalogue public</span>
        </div>

      </div>

      {/* FILTER TABS */}
      <div className="bg-white p-4 rounded-[22px] border border-slate-100 shadow-sm text-left flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-extrabold text-[#09153D]">Filtrer les salons de banquet :</span>
        </div>

        {/* Categories choices */}
        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl w-full md:w-auto overflow-x-auto border border-slate-100 select-none">
          {['Tous', 'Salle de Conférence', 'Plage Privée', 'Terrasse Deck', 'Espace Culturel'].map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`text-[10.5px] font-extrabold px-3.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                typeFilter === t 
                  ? 'bg-white text-orange-650 shadow-sm font-black' 
                  : 'text-slate-450 hover:text-slate-600'
              }`}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* SPLITTER MAIN */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Directory / Venues Cards Grid list */}
        <div className="lg:col-span-7 space-y-3">
          
          {activeHotelVenues.length === 0 ? (
            <div className="bg-white p-12 rounded-[24px] border border-slate-100 text-center text-slate-400 text-xs italic font-medium">
              Aucun complexe d'événements enregistré sous ce format à {currentHotel}.
            </div>
          ) : (
            activeHotelVenues.map(space => {
              const isSelected = selectedVenueId === space.id;
              return (
                <div
                  key={space.id}
                  onClick={() => setSelectedVenueId(isSelected ? null : space.id)}
                  className={`bg-white p-5 rounded-[22px] border text-left cursor-pointer transition-all relative flex flex-col justify-between gap-4 ${
                    isSelected 
                      ? 'border-orange-500 bg-orange-50/10 shadow-sm' 
                      : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/20'
                  }`}
                >
                  
                  {/* Row 1 details */}
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <span className="text-[9.5px] font-mono font-bold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded">
                        {space.id} • {space.type}
                      </span>
                      <h4 className="font-extrabold text-sm text-[#09153D] mt-2 tracking-tight">
                        {space.name}
                      </h4>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono font-black text-[#09153D] block">
                        {space.dailyRate.toLocaleString('fr-FR')} F
                      </span>
                      <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-bold">par Journée</span>
                    </div>
                  </div>

                  {/* Amenities ribbon line */}
                  <div className="flex flex-wrap gap-1">
                    {space.amenities.slice(0, 3).map((a, i) => (
                      <span key={i} className="text-[9px] font-semibold text-slate-500 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded">
                        ✓ {a}
                      </span>
                    ))}
                    {space.amenities.length > 3 && (
                      <span className="text-[9.5px] text-[#09153D]/50 font-extrabold">+{space.amenities.length - 3}</span>
                    )}
                  </div>

                  {/* Footer status attributes line */}
                  <div className="border-t border-slate-50 pt-3.5 flex items-center justify-between text-xs">
                    
                    {/* Capacity details */}
                    <span className="flex items-center gap-1.5 text-slate-500 font-bold text-[11px]">
                      <Users className="w-4 h-4 text-slate-400" />
                      Configuration : {space.activeSetup} (Max {space.capacityMax} pers)
                    </span>

                    {/* Badge state */}
                    <span className={`inline-flex items-center gap-1 font-extrabold text-[9px] px-2.5 py-0.5 rounded-full ${
                      space.status === 'Disponible' ? 'bg-emerald-50 text-emerald-600' :
                      space.status === 'Loué' ? 'bg-amber-50 text-amber-600' :
                      'bg-rose-50 text-rose-600'
                    }`}>
                      <span className={`w-1 h-1 rounded-full ${
                        space.status === 'Disponible' ? 'bg-emerald-500' :
                        space.status === 'Loué' ? 'bg-amber-500' :
                        'bg-rose-500'
                      }`} />
                      {space.status.toUpperCase()}
                    </span>

                  </div>

                </div>
              );
            })
          )}

        </div>

        {/* Right Side: Event Scheduler, layouts switchers, Maintenance blocks */}
        <div className="lg:col-span-5 space-y-4">
          
          {selectedVenue ? (
            <div className="bg-white p-6 rounded-[24px] border border-slate-150/70 shadow-sm text-left space-y-5 fade-in-up">
              
              {/* Detailed Head */}
              <div className="border-b border-slate-100 pb-4 flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-black font-mono text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                    GESTION DES BANQUETS
                  </span>
                  <h3 className="font-extrabold text-md text-[#09153D] mt-3 tracking-tight">{selectedVenue.name}</h3>
                  <p className="text-[10px] text-slate-400 font-medium mt-1">Établissement : {selectedVenue.hotel}</p>
                </div>

                {currentRole === "Propriétaire d'Hôtel" && (
                  <button
                    onClick={() => handleDeleteVenue(selectedVenue.id, selectedVenue.name)}
                    className="text-red-500 hover:text-red-700 p-1.5 bg-red-50 rounded-lg shrink-0"
                    title="Radié cet espace"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Maintenance control and book button */}
              <div className="flex gap-2">
                
                {selectedVenue.status !== 'Sous Entretien' ? (
                  <button
                    onClick={() => {
                      if (currentRole === 'Responsable Ménage') {
                        triggerToast("Accès restreint aux co-ordinateurs de réservation.");
                        return;
                      }
                      setShowBookingModal(true);
                    }}
                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs p-3.5 rounded-xl text-center shadow-lg shadow-orange-550/10 cursor-pointer transition-all flex items-center justify-center gap-1.5"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Planifier un Événement</span>
                  </button>
                ) : (
                  <div className="flex-1 text-center py-3 bg-red-50 border border-red-100 text-red-650 text-xs font-black rounded-xl select-none">
                    🛑 Salle Bloquée (Entretien)
                  </div>
                )}

                {/* Maintenance switch toggle */}
                {currentRole !== 'Réceptionniste (Front Desk)' && (
                  <button
                    onClick={() => handleToggleMaintenance(selectedVenue.id)}
                    className={`px-3 py-3 rounded-xl/80 font-bold text-xs border ${
                      selectedVenue.status === 'Sous Entretien'
                        ? 'bg-rose-600 text-white border-rose-500'
                        : 'bg-slate-50 text-slate-600 border-slate-200/50 hover:bg-slate-100'
                    } cursor-pointer transition-all`}
                    title="Intervertir statut de maintenance de la salle"
                  >
                    {selectedVenue.status === 'Sous Entretien' ? 'Remettre en Service' : 'Mettre en Entretien'}
                  </button>
                )}

              </div>

              {/* Layout switcher widget */}
              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 text-left space-y-3">
                <span className="text-[9px] font-extrabold text-[#09153D]/50 uppercase tracking-widest block">Disposition Active du mobilier :</span>
                
                <div className="grid grid-cols-5 gap-1.5 select-none">
                  {(['Classe', 'Théâtre', 'U-Table', 'Cocktails', 'Banquet'] as const).map(lay => (
                    <button
                      key={lay}
                      onClick={() => handleUpdateLayout(selectedVenue.id, lay)}
                      className={`text-[8.5px] font-bold py-1.5 rounded transition-all cursor-pointer truncate ${
                        selectedVenue.activeSetup === lay 
                          ? 'bg-[#09153D] text-orange-400 font-extrabold' 
                          : 'bg-white text-slate-500 border border-slate-200/50 hover:bg-slate-100'
                      }`}
                      title={`Configurer en mode ${lay}`}
                    >
                      {lay}
                    </button>
                  ))}
                </div>
              </div>

              {/* Booking History Planner Events list for this custom site */}
              <div className="space-y-3 text-left">
                <div className="flex items-center justify-between border-b pb-1">
                  <h4 className="text-xs font-bold text-slate-800">Événements Inscrits à cet Espace</h4>
                  <span className="text-[9.5px] font-mono text-slate-400 bg-slate-50 px-2.5 border rounded-full font-bold">
                    {currentVenueBookings.length} Planifiés
                  </span>
                </div>

                {currentVenueBookings.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">Aucune convention planifiée à court terme pour cet espace.</p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {currentVenueBookings.map((bk, idx) => (
                      <div key={idx} className="bg-slate-50/60 rounded-xl p-3 border border-slate-100 text-left space-y-2 text-xs">
                        
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black font-mono text-slate-400 bg-white border border-slate-150 rounded px-1.5">
                            {bk.id}
                          </span>

                          <span className={`text-[8.5px] px-2 py-0.5 rounded font-extrabold uppercase ${
                            bk.paymentStatus === 'Payé Intégral' ? 'bg-emerald-50 text-emerald-600' :
                            bk.paymentStatus === 'Acompte Payé' ? 'bg-sky-50 text-sky-600' :
                            'bg-yellow-50 text-yellow-600'
                          }`}>
                            {bk.paymentStatus}
                          </span>
                        </div>

                        <div>
                          <h5 className="font-extrabold text-[#09153D]">{bk.bookingTitle}</h5>
                          <p className="text-[10.5px] text-slate-450 font-bold">Sponsor: {bk.sponsorName}</p>
                        </div>

                        <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-dashed border-slate-200 pt-2 font-medium">
                          <span>📅 {bk.dateStart}</span>
                          <span className="bg-orange-50 text-orange-600 text-[9px] font-bold px-2 py-0.5 rounded">
                            {bk.attendees} Invités
                          </span>
                        </div>

                        <div className="text-right pt-1">
                          <span className="text-xs font-black text-[#09153D] font-mono">
                            {bk.totalCost.toLocaleString('fr-FR')} FCFA
                          </span>
                        </div>

                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="bg-white p-12 rounded-[24px] border border-slate-100 text-center text-slate-400 italic text-xs font-medium min-h-[300px] flex flex-col items-center justify-center space-y-3">
              <MapPin className="w-8 h-8 text-slate-300 stroke-[1.5]" />
              <div>
                <p className="font-bold text-slate-400">Aucun lieu sélectionné</p>
                <p className="text-[10px] font-medium text-slate-400 mt-1 max-w-[200px] mx-auto leading-normal">
                  Sélectionnez un complexe du catalogue hôtelier pour modifier sa configuration technique ou planifier un événement.
                </p>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* QUICK RESERVATION WORKSHOPS MODAL OVERLAY */}
      {showBookingModal && selectedVenue && (
        <div className="fixed inset-0 z-50 bg-[#09153D]/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] border border-slate-150/80 shadow-2xl max-w-md w-full overflow-hidden text-left animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="p-6 bg-[#09153D] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5 animate-pulse">
                <Calendar className="w-5.5 h-5.5 text-orange-400" />
                <div>
                  <h3 className="font-extrabold text-white text-md tracking-tight">Réserver cet Espace</h3>
                  <p className="text-[10px] text-slate-300 font-medium">{selectedVenue.name} • {selectedVenue.dailyRate.toLocaleString('fr-FR')} F/Jour</p>
                </div>
              </div>
              <button 
                onClick={() => setShowBookingModal(false)}
                className="text-white hover:text-slate-300 cursor-pointer text-sm font-bold bg-white/10 w-7 h-7 rounded-full flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddBookingSubmit} className="p-6 space-y-4">
              
              {/* Event Title */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  Titre de l'événement :
                </label>
                <input
                  type="text"
                  placeholder="Ex : Séminaire annuel de formation..."
                  value={ebTitle}
                  onChange={(e) => setEbTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs font-bold p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500"
                  required
                />
              </div>

              {/* Sponsor */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  Client commanditaire / Sponsor (CRM) :
                </label>
                <input
                  type="text"
                  placeholder="Ex : Banque Centrale, ONU Femmes..."
                  value={ebSponsor}
                  onChange={(e) => setEbSponsor(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs font-bold p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500"
                  required
                />
              </div>

              {/* Date & Days */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Date prévue :
                  </label>
                  <input
                    type="date"
                    value={ebDateStr}
                    onChange={(e) => setEbDateStr(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-mono p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Durée d'Occupation (jours) :
                  </label>
                  <select
                    value={ebDays}
                    onChange={(e) => setEbDays(parseInt(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold p-3 rounded-xl focus:outline-none cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5, 6].map(d => (
                      <option key={d} value={d}>{d} {d > 1 ? 'jours' : 'jour'}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Setup Configuration type */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Mobilier requis :
                  </label>
                  <select
                    value={ebSetup}
                    onChange={(e) => setEbSetup(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold p-3 rounded-xl focus:outline-none cursor-pointer"
                  >
                    <option value="Théâtre">Théâtre (Chaises alignées)</option>
                    <option value="Classe">Classe (Tables & Écriture)</option>
                    <option value="U-Table">U-Table (Comité de direction)</option>
                    <option value="Cocktails">Cocktails (Mange-debout)</option>
                    <option value="Banquet">Banquet (Ambiance d'honneur)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Nombre estimé d'invités :
                  </label>
                  <input
                    type="number"
                    max={selectedVenue.capacityMax}
                    min={10}
                    value={ebAttendees}
                    onChange={(e) => setEbAttendees(parseInt(e.target.value) || 10)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold p-3 rounded-xl focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Option buffet catering tag */}
              <div className="flex items-center gap-3 bg-orange-50/50 p-4 rounded-xl border border-orange-100">
                <input
                  type="checkbox"
                  id="ebCatering"
                  checked={ebCatering}
                  onChange={(e) => setEbCatering(e.target.checked)}
                  className="w-4.5 h-4.5 text-orange-600 border-slate-350 focus:ring-orange-550 rounded cursor-pointer"
                />
                <div>
                  <label htmlFor="ebCatering" className="block text-[11.5px] font-extrabold text-slate-800 cursor-pointer">
                    Intégrer Option Traiteur / Buffet Local
                  </label>
                  <p className="text-[9.5px] text-slate-450 font-medium">Poisson grillé de Saly, riz au lait casamance (+12k FCFA / pers)</p>
                </div>
              </div>

              {/* Form submit footer */}
              <div className="pt-4 border-t border-slate-50 flex items-center justify-end gap-3.5">
                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  className="px-4.5 py-3 hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-orange-605 bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs px-5 py-3 rounded-xl transition-colors cursor-pointer"
                >
                  Créer la Convention
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* NEW COMPLEX VENUE CREATOR MODAL OVERLAY */}
      {showAddSpaceModal && (
        <div className="fixed inset-0 z-50 bg-[#09153D]/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] border border-slate-150/80 shadow-2xl max-w-lg w-full overflow-hidden text-left animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-orange-600 to-amber-500 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <MapPin className="w-5.5 h-5.5 text-white" />
                <div>
                  <h3 className="font-extrabold text-white text-md tracking-tight">Nouvel Espace d'Événements</h3>
                  <p className="text-[10px] text-orange-100 font-medium">Ajouter un complexe au catalogue PMS - {currentHotel}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddSpaceModal(false)}
                className="text-white hover:text-orange-200 cursor-pointer text-sm font-bold bg-white/10 w-7 h-7 rounded-full flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateSpaceSubmit} className="p-6 space-y-4">
              
              {/* Space Name */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  Nom commercial de la salle/espace :
                </label>
                <input
                  type="text"
                  placeholder="Ex : Espace Flamboyants, Salon Margouillat, Villa Cocotiers..."
                  value={nsName}
                  onChange={(e) => setNsName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs font-bold p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500"
                  required
                />
              </div>

              {/* Target Hotel and Type */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Type d'emplacement :
                  </label>
                  <select
                    value={nsType}
                    onChange={(e) => setNsType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-75 * p-3 rounded-xl focus:outline-none"
                  >
                    <option value="Salle de Conférence">Salle de Conférence / Congrès</option>
                    <option value="Plage Privée">Plage Privée de Réception</option>
                    <option value="Terrasse Deck">Terrasse Deck / Resto bar</option>
                    <option value="Espace Culturel">Espace Plein Air / Boma</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-orange-650 uppercase tracking-widest">
                    Hôtel Rattaché (Courant requis) :
                  </label>
                  <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl text-xs font-mono font-black text-[#09153D]">
                    🏢 {currentHotel}
                  </div>
                </div>
              </div>

              {/* Rate & max capacity */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Tarif de location journalier (FCFA) :
                  </label>
                  <input
                    type="number"
                    min={50000}
                    step={10000}
                    value={nsRate}
                    onChange={(e) => setNsRate(parseInt(e.target.value) || 50000)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold p-3 rounded-xl focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Capacité Maximale autorisée :
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={2000}
                    value={nsCapacity}
                    onChange={(e) => setNsCapacity(parseInt(e.target.value) || 10)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold p-3 rounded-xl focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Amenities builder list */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  Équipements inclus d'office :
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ex : Projecteur laser, WiFi fibre 100M, Tableau à feuilles..."
                    value={nsAmenitiesInput}
                    onChange={(e) => setNsAmenitiesInput(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 text-xs p-3 rounded-xl focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddAmenityTag}
                    className="bg-[#09153D] hover:bg-[#152e6d] text-white font-extrabold text-xs px-4 rounded-xl transition-colors cursor-pointer"
                  >
                    Ajouter
                  </button>
                </div>
                
                {/* tags grid */}
                {nsAmenities.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {nsAmenities.map((p, idx) => (
                      <span key={idx} className="bg-slate-50 border border-slate-150 text-[10px] font-bold text-slate-600 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                        ✓ {p}
                        <button 
                          type="button" 
                          onClick={() => setNsAmenities(nsAmenities.filter((_, i) => i !== idx))} 
                          className="text-slate-400 hover:text-slate-600 font-bold ml-1 cursor-pointer"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Note on submit constraints */}
              <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-150 rounded-xl text-[10.5px] font-medium text-slate-500">
                <UtensilsCrossed className="w-4 h-4 text-orange-600 shrink-0" />
                <span>Tous les complexes d'événements créés s'ouvrent par défaut en statut <strong>Disponible</strong> avec configuration <strong>Théâtre</strong>.</span>
              </div>

              {/* Form submit footer */}
              <div className="pt-4 border-t border-slate-50 flex items-center justify-end gap-3.5">
                <button
                  type="button"
                  onClick={() => setShowAddSpaceModal(false)}
                  className="px-4.5 py-3 hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl transition-colors cursor-pointer"
                >
                  Annuler la création
                </button>
                <button
                  type="submit"
                  className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs px-5 py-3 rounded-xl transition-colors cursor-pointer shadow-md shadow-orange-550/10"
                >
                  Inscrire au Catalogue PMS
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
