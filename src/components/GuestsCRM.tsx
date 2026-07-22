/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Sparkles, 
  Star, 
  Award, 
  Mail, 
  Phone, 
  MapPin, 
  Coffee, 
  Heart, 
  TrendingUp, 
  Trash2, 
  Edit2, 
  MessageSquare,
  Calendar,
  DollarSign,
  UserCheck,
  Check,
  X,
  PlusCircle,
  Clock
} from 'lucide-react';
import { RBACRole } from '../types';

interface GuestsCRMProps {
  currentHotel: string;
  currentRole: RBACRole;
  onAddNotification: (title: string, message: string, type: 'réservation' | 'paiement' | 'alerte' | 'info') => void;
}

export interface GuestProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  originCountry: string;
  loyaltyTier: 'Diamant' | 'Or' | 'Argent' | 'Standard';
  totalVisits: number;
  totalSpend: number;
  preferredRoomType: string;
  specialRequests: string[];
  historyNotes: { date: string; note: string; hotel: string }[];
  hotelRegistered: string;
}

export default function GuestsCRM({
  currentHotel,
  currentRole,
  onAddNotification
}: GuestsCRMProps) {
  // Master CRM profiles list
  const [profiles, setProfiles] = useState<GuestProfile[]>([
    {
      id: 'GST-001',
      fullName: 'Amadou Diop',
      email: 'amadou.diop@orange.sn',
      phone: '+221 77 341 55 22',
      originCountry: 'Sénégal',
      loyaltyTier: 'Diamant',
      totalVisits: 14,
      totalSpend: 1350000,
      preferredRoomType: 'Suite Royale Swim-up',
      specialRequests: ['Préfère le Café Touba frais à l\'accueil', 'Lit bébé requis occasionnellement', 'Navette aéroport'],
      historyNotes: [
        { date: '21/04/2026', note: 'Séjour excellent, a offert des pâtisseries à la réception', hotel: 'Royal Saly' },
        { date: '10/12/2025', note: 'Demande toujours le Bungalow 104 si dispo', hotel: 'Royal Saly' }
      ],
      hotelRegistered: 'Royal Saly'
    },
    {
      id: 'GST-002',
      fullName: 'Charlotte Dubois',
      email: 'c.dubois@airfrance.fr',
      phone: '+33 6 4552 1198',
      originCountry: 'France',
      loyaltyTier: 'Or',
      totalVisits: 8,
      totalSpend: 820000,
      preferredRoomType: 'Bungalow Piloti Premium',
      specialRequests: ['Bouteille de vin de bienvenue', 'Option demi-pension permanente'],
      historyNotes: [
        { date: '04/05/2026', note: 'Préfère les serviettes supplémentaires', hotel: 'Les Pélicans du Saloum' }
      ],
      hotelRegistered: 'Les Pélicans du Saloum'
    },
    {
      id: 'GST-003',
      fullName: 'Yacine Sy',
      email: 'yacine.sy@sy-lawyers.com',
      phone: '+221 70 882 14 02',
      originCountry: 'Sénégal',
      loyaltyTier: 'Or',
      totalVisits: 6,
      totalSpend: 540000,
      preferredRoomType: 'Chambre Confort Balcon',
      specialRequests: ['Préfère un étage élevé loin des bruissements du bar'],
      historyNotes: [
        { date: '15/03/2026', note: 'Plainte sur le wifi à l\'étage 3 résolue avec l\'antenne relais', hotel: 'Nema Kadior' }
      ],
      hotelRegistered: 'Nema Kadior'
    },
    {
      id: 'GST-004',
      fullName: 'John Schmidt',
      email: 'j.schmidt@berlin-tech.de',
      phone: '+49 176 990 2341',
      originCountry: 'Allemagne',
      loyaltyTier: 'Argent',
      totalVisits: 3,
      totalSpend: 310000,
      preferredRoomType: 'Bungalow Jardin',
      specialRequests: ['Végétalien strict', 'Location de vélo de course tous les matins'],
      historyNotes: [
        { date: '01/02/2026', note: 'A adoré l\'activité de pêche guidée', hotel: 'Les Pélicans du Saloum' }
      ],
      hotelRegistered: 'Les Pélicans du Saloum'
    },
    {
      id: 'GST-005',
      fullName: 'Marie-Claude Sarr',
      email: 'mc.sarr@sonatel.sn',
      phone: '+221 76 552 90 10',
      originCountry: 'Sénégal',
      loyaltyTier: 'Standard',
      totalVisits: 2,
      totalSpend: 155000,
      preferredRoomType: 'Chambre Standard',
      specialRequests: ['Pas d\'oreillers en plumes (allergie)'],
      historyNotes: [],
      hotelRegistered: 'Royal Saly'
    }
  ]);

  // UI state variables
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('Tous');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // New guest profile form
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCountry, setNewCountry] = useState('Sénégal');
  const [newTier, setNewTier] = useState<'Diamant' | 'Or' | 'Argent' | 'Standard'>('Standard');
  const [newPreferredRoom, setNewPreferredRoom] = useState('Chambre Standard');
  const [newPrefInput, setNewPrefInput] = useState('');
  const [specialPrefs, setSpecialPrefs] = useState<string[]>([]);
  const [newNoteInput, setNewNoteInput] = useState('');

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAddPref = () => {
    if (newPrefInput.trim()) {
      setSpecialPrefs([...specialPrefs, newPrefInput.trim()]);
      setNewPrefInput('');
    }
  };

  const handleRemovePref = (idx: number) => {
    setSpecialPrefs(specialPrefs.filter((_, i) => i !== idx));
  };

  // Create Guest Profile
  const handleCreateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim()) {
      triggerToast('Le nom complet est obligatoire.');
      return;
    }

    const newId = `GST-${String(profiles.length + 1).padStart(3, '0')}`;
    const newProfile: GuestProfile = {
      id: newId,
      fullName: newFullName,
      email: newEmail || 'client@senegalhotels.sn',
      phone: newPhone || '+221 33 000 00 00',
      originCountry: newCountry,
      loyaltyTier: newTier,
      totalVisits: 1, // first time
      totalSpend: 0,
      preferredRoomType: newPreferredRoom,
      specialRequests: specialPrefs,
      historyNotes: newNoteInput.trim() ? [{ date: '21/05/2026', note: newNoteInput, hotel: currentHotel }] : [],
      hotelRegistered: currentHotel
    };

    setProfiles([newProfile, ...profiles]);
    setShowAddModal(false);
    
    // Clear forms
    setNewFullName('');
    setNewEmail('');
    setNewPhone('');
    setSpecialPrefs([]);
    setNewNoteInput('');

    onAddNotification(
      'Fiche client créée',
      `Profil de ${newFullName} ajouté au registre CRM de ${currentHotel}. Statut: ${newTier}.`,
      'info'
    );
    triggerToast(`Fiche client de ${newFullName} créée à ${currentHotel} !`);
  };

  // Add notes/interactions timeline to a selected user
  const [tempNoteText, setTempNoteText] = useState('');
  const handleAddQuickNote = (profileId: string) => {
    if (!tempNoteText.trim()) return;

    if (currentRole === 'Responsable Ménage') {
      triggerToast('Permissions insuffisantes : Le Responsable Ménage est bloqué en lecture seule sur le CRM.');
      return;
    }

    setProfiles(prev => prev.map(prof => {
      if (prof.id === profileId) {
        return {
          ...prof,
          historyNotes: [
            { date: '21/05/2026', note: tempNoteText.trim(), hotel: currentHotel },
            ...prof.historyNotes
          ]
        };
      }
      return prof;
    }));

    setTempNoteText('');
    triggerToast('Interaction enregistrée dans le dossier client !');
  };

  // Delete guest profile
  const handleDeleteProfile = (profileId: string, name: string) => {
    if (currentRole !== "Propriétaire d'Hôtel") {
      triggerToast('Accès restreint : Seul le Propriétaire d’Hôtel peut désactiver ou supprimer un profil CRM.');
      return;
    }

    if (!confirm(`Voulez-vous supprimer définitivement la fiche client de ${name} du CRM Sénégal Hotels ?`)) {
      return;
    }

    setProfiles(prev => prev.filter(p => p.id !== profileId));
    if (selectedProfileId === profileId) setSelectedProfileId(null);
    triggerToast(`Fiche client de ${name} retirée.`);
  };

  // Trigger loyalty Upgrade
  const handleUpgradeTier = (profileId: string, nextTier: 'Diamant' | 'Or' | 'Argent' | 'Standard') => {
    if (currentRole === 'Responsable Ménage') {
      triggerToast('Rôle non autorisé pour ce type de modification.');
      return;
    }

    setProfiles(prev => prev.map(prof => {
      if (prof.id === profileId) {
        return { ...prof, loyaltyTier: nextTier };
      }
      return prof;
    }));

    triggerToast(`Loyalty status mis à jour vers [${nextTier}].`);
  };

  // Filter actual profile list by hotel constraints
  const activeHotelProfiles = useMemo(() => {
    // Hotel CRM is central but highlights registered ones or can search across
    return profiles.filter(prof => {
      const matchesSearch = prof.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            prof.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            prof.phone.includes(searchQuery) ||
                            prof.originCountry.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            prof.preferredRoomType.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesTier = tierFilter === 'Tous' || prof.loyaltyTier === tierFilter;
      return matchesSearch && matchesTier;
    });
  }, [profiles, searchQuery, tierFilter]);

  // Compute CRM analytics counters for Senegal Hotels
  const crmStats = useMemo(() => {
    const total = activeHotelProfiles.length;
    const diamantOrCount = activeHotelProfiles.filter(p => p.loyaltyTier === 'Diamant' || p.loyaltyTier === 'Or').length;
    const cumulSpend = activeHotelProfiles.reduce((sum, curr) => sum + curr.totalSpend, 0);
    const averageVisits = total > 0 ? Math.round(activeHotelProfiles.reduce((sum, curr) => sum + curr.totalVisits, 0) / total) : 0;

    return { total, diamantOrCount, cumulSpend, averageVisits };
  }, [activeHotelProfiles]);

  const selectedGuestProfile = useMemo(() => {
    if (!selectedProfileId) return null;
    return profiles.find(p => p.id === selectedProfileId) || null;
  }, [selectedProfileId, profiles]);

  return (
    <div className="space-y-6 fade-in-up">
      
      {/* Toast Notification popup */}
      {toastMessage && (
        <div className="bg-[#09153D] text-white px-4 py-3.5 rounded-[18px] text-xs font-bold shadow-lg flex items-center gap-2.5 animate-in fade-in slide-in-from-top-3 duration-250 fixed top-6 right-6 z-50 max-w-sm border border-slate-700/60">
          <Sparkles className="w-4 h-4 text-orange-400 shrink-0" />
          <span className="leading-snug text-left">{toastMessage}</span>
        </div>
      )}

      {/* HEADER ROW */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#09153D] tracking-tight font-sans">CRM & Fidélisation Clientèle</h2>
          <p className="text-xs text-slate-400 font-medium">Bases de données unifiées de voyageurs, enregistrement des préférences de standing français et fidélisation</p>
        </div>

        <div>
          {currentRole !== 'Responsable Ménage' ? (
            <button
              onClick={() => {
                setSpecialPrefs([]);
                setShowAddModal(true);
              }}
              className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs px-4 py-3 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-orange-600/10 shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Nouveau Profil Client</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200/50 rounded-xl text-[10px] font-bold text-slate-400">
              <UserCheck className="w-3.5 h-3.5 text-blue-500" />
              <span>Lecture Seule CRM (Ménage)</span>
            </div>
          )}
        </div>
      </div>

      {/* METRICS ROW INFO */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        
        {/* Total clients in database */}
        <div className="bg-white p-4.5 rounded-[20px] border border-slate-100 shadow-sm text-left">
          <span className="text-[9px] font-extrabold text-[#09153D]/50 uppercase tracking-widest block">Clients Indexés</span>
          <span className="text-2xl font-black text-[#09153D] font-mono block mt-1">{crmStats.total} Voyageurs</span>
          <span className="text-[9.5px] text-slate-400 font-medium">dans l'établissement actuel</span>
        </div>

        {/* Diamant + Or Count */}
        <div className="bg-white p-4.5 rounded-[20px] border border-slate-100 shadow-sm text-left">
          <span className="text-[9px] font-extrabold text-orange-650 uppercase tracking-widest block">Membres Privilégiés (VIP)</span>
          <span className="text-2xl font-black text-orange-600 font-mono block mt-1">{crmStats.diamantOrCount} VIP</span>
          <span className="text-[9.5px] text-slate-400 font-semibold">Tiers Or & Diamant cumulés</span>
        </div>

        {/* Cumulated Spendings */}
        <div className="bg-white p-4.5 rounded-[20px] border border-slate-100 shadow-sm text-left">
          <span className="text-[9px] font-extrabold text-emerald-650 uppercase tracking-widest block">Revenu Cumulé CRM</span>
          <span className="text-xl font-black text-[#09153D] font-mono block mt-1.5">
            {crmStats.cumulSpend.toLocaleString('fr-FR')} FCFA
          </span>
          <span className="text-[9.5px] text-slate-400 font-semibold text-emerald-600">Totalisé par nuitées vécues</span>
        </div>

        {/* average stays count */}
        <div className="bg-white p-4.5 rounded-[20px] border border-slate-100 shadow-sm text-left">
          <span className="text-[9px] font-extrabold text-blue-650 uppercase tracking-widest block">Fréquence Taux de Retour</span>
          <span className="text-2xl font-black text-blue-600 font-mono block mt-1">{crmStats.averageVisits} Visites</span>
          <span className="text-[9.5px] text-slate-400 font-medium">nombre moyen de séjours</span>
        </div>

      </div>

      {/* SEARCH ROW & TABS */}
      <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm text-left">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Quick search bar */}
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher client par nom, pays, chambre favorite..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50/60 hover:bg-slate-50 border border-slate-200 text-xs px-10 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>

          {/* Loyalty tier filter tabs */}
          <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl w-full md:w-auto overflow-x-auto border border-slate-100 select-none">
            {['Tous', 'Diamant', 'Or', 'Argent', 'Standard'].map(tier => (
              <button
                key={tier}
                onClick={() => setTierFilter(tier)}
                className={`text-[10.5px] font-extrabold px-3.5 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  tierFilter === tier 
                    ? 'bg-white text-orange-650 shadow-sm font-black' 
                    : 'text-slate-450 hover:text-slate-600'
                }`}
              >
                {tier.toUpperCase()}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* SYSTEM MAIN SPLITTER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left pane: Directory list */}
        <div className="lg:col-span-7 bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm text-left space-y-4">
          
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-900 tracking-tight">Répertoire Unifié</h4>
              <p className="text-[11px] text-slate-400 font-medium">Sélectionnez un voyageur pour auditer son historique et ses préférences</p>
            </div>
            
            <span className="text-[10px] font-mono font-bold px-2.5 py-1 bg-slate-50 border border-slate-150 rounded-full text-slate-400">
              {activeHotelProfiles.length} fiches
            </span>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-[500px] pr-1.5">
            {activeHotelProfiles.length === 0 ? (
              <div className="p-12 text-center text-slate-410 italic text-xs font-medium">
                Aucun client ne correspond aux critères à SÉNÉGAL HOTELS.
              </div>
            ) : (
              activeHotelProfiles.map(prof => {
                const isSelected = selectedProfileId === prof.id;
                return (
                  <div
                    key={prof.id}
                    onClick={() => setSelectedProfileId(isSelected ? null : prof.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer text-left relative ${
                      isSelected 
                        ? 'bg-orange-50/25 border-orange-400 shadow-sm' 
                        : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/20'
                    }`}
                  >
                    {/* Top status line */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[9.5px] font-bold font-mono text-slate-400 uppercase">
                          {prof.id}
                        </span>
                        
                        <span className={`inline-flex items-center gap-1 text-[8.5px] px-2 py-0.5 rounded font-extrabold uppercase ${
                          prof.loyaltyTier === 'Diamant' ? 'bg-[#09153D] text-[#FFA500]' :
                          prof.loyaltyTier === 'Or' ? 'bg-amber-100 text-amber-700' :
                          prof.loyaltyTier === 'Argent' ? 'bg-slate-100 text-slate-650' :
                          'bg-slate-100 text-slate-400'
                        }`}>
                          <Award className="w-2.5 h-2.5" />
                          {prof.loyaltyTier}
                        </span>
                      </div>

                      <span className="text-[10px] font-mono font-bold text-slate-600 block">
                        {prof.totalSpend.toLocaleString('fr-FR')} F
                      </span>
                    </div>

                    {/* Guest name */}
                    <div className="mt-2 flex items-center justify-between">
                      <div>
                        <h5 className="font-extrabold text-sm text-[#09153D]">{prof.fullName}</h5>
                        
                        {/* coordinates */}
                        <div className="flex flex-wrap gap-x-2.5 text-[10px] text-slate-400 font-medium mt-1">
                          <span className="flex items-center gap-0.5">
                            <span className="text-[10px]">📍</span> {prof.originCountry}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Mail className="w-2.5 h-2.5" /> {prof.email}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black text-[#09153D] block font-mono">
                          {prof.totalVisits}
                        </span>
                        <span className="text-[9px] text-slate-400 uppercase tracking-widest block font-bold">Séjours</span>
                      </div>
                    </div>

                    {/* Preferred amenity tag ribbon line */}
                    {prof.specialRequests.length > 0 && (
                      <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                        {prof.specialRequests.slice(0, 2).map((req, rid) => (
                          <span key={rid} className="bg-slate-50 text-slate-500 text-[9.5px] font-bold px-2 py-0.5 rounded border border-slate-100 truncate max-w-[150px]">
                            ⚡ {req}
                          </span>
                        ))}
                        {prof.specialRequests.length > 2 && (
                          <span className="text-[9px] text-[#09153D]/50 font-extrabold">+{prof.specialRequests.length - 2}</span>
                        )}
                      </div>
                    )}

                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* Right pane: Detailed view of the selected profile */}
        <div className="lg:col-span-5 space-y-4">
          {selectedGuestProfile ? (
            <div className="bg-white p-6 rounded-[24px] border border-slate-150/70 shadow-sm text-left space-y-5 fade-in-up">
              
              {/* Detailed Head */}
              <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black font-mono text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                    FICHE INDIVIDUELLE • {selectedGuestProfile.id}
                  </span>
                  
                  {currentRole === "Propriétaire d'Hôtel" && (
                    <button
                      onClick={() => handleDeleteProfile(selectedGuestProfile.id, selectedGuestProfile.fullName)}
                      className="text-red-500 hover:text-red-700 p-1 bg-red-50 rounded-lg hover:scale-102 transition-transform cursor-pointer"
                      title="Supprimer la fiche client"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3 mt-3">
                  <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 font-black text-lg flex items-center justify-center select-none uppercase shadow-inner">
                    {selectedGuestProfile.fullName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-black text-[#09153D] text-md leading-none">{selectedGuestProfile.fullName}</h3>
                    <p className="text-[10.5px] text-slate-400 font-medium mt-1">Origine : {selectedGuestProfile.originCountry}</p>
                  </div>
                </div>
              </div>

              {/* Status & Change tier Controls */}
              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 text-left space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] font-extrabold text-slate-450 uppercase tracking-wider block">Niveau de Fidélité :</span>
                  
                  <span className="inline-flex items-center gap-1 bg-[#101F41] text-orange-400 font-extrabold text-[9px] px-2.5 py-0.5 rounded border border-slate-750">
                    ★ {selectedGuestProfile.loyaltyTier.toUpperCase()}
                  </span>
                </div>

                {/* Switcher tiers (authorized) */}
                {currentRole !== 'Responsable Ménage' && (
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                    <span className="text-[9.5px] text-slate-400 font-bold">Modifier le statut :</span>
                    <div className="flex items-center gap-1 select-none">
                      {(['Standard', 'Argent', 'Or', 'Diamant'] as const).map(tier => (
                        <button
                          key={tier}
                          onClick={() => handleUpgradeTier(selectedGuestProfile.id, tier)}
                          className={`text-[8.5px] font-extrabold px-2 py-0.8 rounded ${
                            selectedGuestProfile.loyaltyTier === tier 
                              ? 'bg-orange-600 text-white font-black shadow-sm' 
                              : 'bg-white text-slate-450 border border-slate-200/50 hover:bg-slate-100'
                          }`}
                        >
                          {tier}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* CRM Contact information data */}
              <div className="space-y-2.5 text-xs text-left">
                <h5 className="font-bold text-slate-900 text-xs border-b border-slate-50 pb-1">Coordonnées de Facturation</h5>
                
                <div className="flex items-center justify-between py-1 bg-slate-50/30 px-2 rounded-lg">
                  <span className="text-slate-400 flex items-center gap-1.5 font-bold text-[10px] uppercase">
                    <Mail className="w-3.5 h-3.5" /> Email :
                  </span>
                  <span className="font-mono text-slate-700 font-semibold">{selectedGuestProfile.email}</span>
                </div>

                <div className="flex items-center justify-between py-1 bg-slate-50/30 px-2 rounded-lg">
                  <span className="text-slate-400 flex items-center gap-1.5 font-bold text-[10px] uppercase">
                    <Phone className="w-3.5 h-3.5" /> Téléphone :
                  </span>
                  <span className="font-mono text-slate-700 font-semibold">{selectedGuestProfile.phone}</span>
                </div>

                <div className="flex items-center justify-between py-1 bg-slate-50/30 px-2 rounded-lg">
                  <span className="text-slate-400 flex items-center gap-1.5 font-bold text-[10px] uppercase">
                    <Star className="w-3.5 h-3.5" /> Standing favori :
                  </span>
                  <span className="text-[#09153D] font-extrabold text-[11px] font-sans truncate max-w-[180px]">
                    {selectedGuestProfile.preferredRoomType}
                  </span>
                </div>
              </div>

              {/* Preferences checklist block */}
              <div className="space-y-2 text-left">
                <h5 className="font-bold text-slate-900 text-xs border-b border-slate-50 pb-1">Préférences Consignées</h5>
                
                {selectedGuestProfile.specialRequests.length === 0 ? (
                  <p className="text-[11px] text-slate-410 italic">Aucune préférence notée.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedGuestProfile.specialRequests.map((req, id) => (
                      <span key={id} className="inline-flex items-center gap-1 text-[10px] font-bold bg-[#FAF4ED] text-[#9A3412] px-2.5 py-1 rounded-xl border border-[#FAECD5] select-none">
                        <Coffee className="w-2.5 h-2.5 text-[#B45309]" />
                        {req}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes Timeline */}
              <div className="space-y-3 text-left">
                <div className="flex items-center justify-between border-b border-slate-50 pb-1">
                  <h5 className="font-bold text-slate-900 text-xs">Historique des Interactions & Feedback</h5>
                  <span className="text-[9px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 border rounded">
                    {selectedGuestProfile.historyNotes.length} Événements
                  </span>
                </div>

                {/* Input box to add notes dynamically */}
                {currentRole !== 'Responsable Ménage' && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ajouter une note d'accueil, réclamation..."
                      value={tempNoteText}
                      onChange={(e) => setTempNoteText(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 text-xs px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                    <button
                      onClick={() => handleAddQuickNote(selectedGuestProfile.id)}
                      className="bg-[#09153D] hover:bg-[#122A65] text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors cursor-pointer shrink-0"
                    >
                      Noter
                    </button>
                  </div>
                )}

                {/* Timeline display */}
                {selectedGuestProfile.historyNotes.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">Aucune interaction rédigée dans son historique d'hébergement.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {selectedGuestProfile.historyNotes.map((nh, idx) => (
                      <div key={idx} className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-left space-y-1 text-xs">
                        <div className="flex items-center justify-between text-[9.5px] text-slate-400 font-bold font-mono">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                            {nh.date}
                          </span>
                          <span className="text-[9px] font-black uppercase tracking-wide text-[#09153D]/60">
                            🏨 {nh.hotel}
                          </span>
                        </div>
                        <p className="text-slate-650 font-medium text-[11px] leading-snug">
                          {nh.note}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="bg-white p-12 rounded-[24px] border border-slate-120/80 shadow-inner text-center text-slate-415 italic text-xs font-medium min-h-[400px] flex flex-col items-center justify-center space-y-2">
              <Users className="w-8 h-8 text-slate-300 stroke-[1.5]" />
              <div>
                <p className="font-bold text-slate-400">Aucun client sélectionné</p>
                <p className="text-[10px] font-medium text-slate-400 mt-1 max-w-[200px] mx-auto leading-normal">
                  Utilisez la recherche ou cliquez sur un dossier pour modifier les préférences voyageur.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* NEW CLIENT PROFILE DRAWER MODAL OVERLAY */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-[#09153D]/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] border border-slate-150/80 shadow-2xl max-w-lg w-full overflow-hidden text-left animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-orange-600 to-amber-500 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Users className="w-5.5 h-5.5 text-white" />
                <div>
                  <h3 className="font-extrabold text-white text-md tracking-tight">Création Fiche Client (CRM)</h3>
                  <p className="text-[10px] text-orange-100 font-medium">Sénégal Hotels - Enregistrement Clientèle Premium</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-white hover:text-orange-200 cursor-pointer text-sm font-bold bg-white/10 w-7 h-7 rounded-full flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Form list body */}
            <form onSubmit={handleCreateProfile} className="p-6 space-y-4">
              
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  Nom Complet du Client :
                </label>
                <input
                  type="text"
                  placeholder="Ex : Fatoumata Sy, Christian Coste..."
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs font-bold p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500"
                  required
                />
              </div>

              {/* coordinates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Email Client :
                  </label>
                  <input
                    type="email"
                    placeholder="client@gmail.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Numéro de Téléphone :
                  </label>
                  <input
                    type="text"
                    placeholder="+221 77 000 00 00"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Country & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Pays de Résidence :
                  </label>
                  <input
                    type="text"
                    placeholder="Sénégal, France, USA..."
                    value={newCountry}
                    onChange={(e) => setNewCountry(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Niveau Initial Loyalty :
                  </label>
                  <select
                    value={newTier}
                    onChange={(e) => setNewTier(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-755 p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
                  >
                    <option value="Standard">Standard</option>
                    <option value="Argent">Argent</option>
                    <option value="Or">Or</option>
                    <option value="Diamant">Diamant ★</option>
                  </select>
                </div>
              </div>

              {/* Room standing Favorite preference */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  Type d'Unité favori (Standard requis) :
                </label>
                <select
                  value={newPreferredRoom}
                  onChange={(e) => setNewPreferredRoom(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-750 p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
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

              {/* Preferences Creator tag adder */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  Enregistrer les Préférences :
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ex: Demi-pension, Lit double King, Café Touba..."
                    value={newPrefInput}
                    onChange={(e) => setNewPrefInput(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 text-xs p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddPref}
                    className="bg-[#09153D] hover:bg-[#152e6d] text-white font-extrabold text-xs px-4 rounded-xl transition-colors cursor-pointer"
                  >
                    Ajouter
                  </button>
                </div>
                
                {/* tags showing */}
                {specialPrefs.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {specialPrefs.map((p, idx) => (
                      <span key={idx} className="bg-slate-50 border border-slate-150 text-[10px] font-bold text-slate-600 px-2 py-0.8 rounded-lg flex items-center gap-1">
                        {p}
                        <button type="button" onClick={() => handleRemovePref(idx)} className="text-slate-400 hover:text-slate-650 font-bold ml-1">✕</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Initial Note */}
              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  Première annotation historique :
                </label>
                <textarea
                  placeholder="Ex: Inscrit lors du salon de tourisme de Dakar. Excellent contact."
                  value={newNoteInput}
                  onChange={(e) => setNewNoteInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-700 p-3 rounded-xl h-16 resize-none focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              {/* Form submit footer */}
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
                  Valider l'Ajout du Client
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
