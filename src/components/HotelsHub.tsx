/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  BedDouble, 
  TrendingUp, 
  Star, 
  Users, 
  Check, 
  AlertCircle, 
  ArrowUpRight, 
  DollarSign, 
  Activity, 
  Sparkles, 
  Coins, 
  Sliders, 
  Shuffle 
} from 'lucide-react';

interface HotelsHubProps {
  currentHotel: string;
  onHotelChange: (hotel: string) => void;
  currentRole: string;
}

interface HotelStats {
  id: string;
  name: string;
  location: string;
  capacity: number;
  roomsOccupied: number;
  adr: number; // Average Daily Rate in FCFA
  manager: string;
  rating: number;
  cleanliness: number;
  description: string;
  badge: string;
  badgeColor: string;
  accentColor: string;
}

export default function HotelsHub({ currentHotel, onHotelChange, currentRole }: HotelsHubProps) {
  // Local state to simulate updates inside the hub
  const [hotels, setHotels] = useState<HotelStats[]>([
    {
      id: 'h-1',
      name: 'Royal Saly',
      location: 'Saly Portudal, Petite-Côte',
      capacity: 120,
      roomsOccupied: 78,
      adr: 75000,
      manager: 'Awa Ndiaye',
      rating: 4.8,
      cleanliness: 4.9,
      description: 'Hôtel balnéaire haut de gamme proposant bungalows traditionnels, piscines lagon et un centre de bien-être moderne.',
      badge: 'Complexe Balnéaire',
      badgeColor: 'bg-orange-50 text-orange-600 border-orange-100',
      accentColor: 'from-orange-500 to-amber-500'
    },
    {
      id: 'h-2',
      name: 'Nema Kadior',
      location: 'Ziguinchor, Casamance',
      capacity: 72,
      roomsOccupied: 43,
      adr: 55000,
      manager: 'Ibrahima Sagna',
      rating: 4.6,
      cleanliness: 4.7,
      description: 'Oasis fluviale au cœur de la Casamance, offrant un cadre paisible entouré de jardins tropicaux et de circuits culturels.',
      badge: 'Étape Fleuve',
      badgeColor: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      accentColor: 'from-emerald-500 to-teal-500'
    },
    {
      id: 'h-3',
      name: 'Les Pélicans du Saloum',
      location: 'Toubacouta, Delta du Saloum',
      capacity: 40,
      roomsOccupied: 28,
      adr: 90000,
      manager: 'Marie-Louise Diouf',
      rating: 4.9,
      cleanliness: 4.8,
      description: 'Éco-lodge d\'exception proposant des bungalows sur pilotis face aux mangroves et des excursions ornithologiques.',
      badge: 'Éco-Retraite Prestige',
      badgeColor: 'bg-sky-50 text-sky-600 border-sky-100',
      accentColor: 'from-sky-500 to-indigo-500'
    }
  ]);

  const [simAlert, setSimAlert] = useState<string | null>(null);

  // Trigger brief floating notifications
  const triggerNotification = (msg: string) => {
    setSimAlert(msg);
    setTimeout(() => setSimAlert(null), 3500);
  };

  // Simulation: Add a reservation to a hotel
  const handleSimulateBooking = (hotelId: string) => {
    setHotels(prevHotels => 
      prevHotels.map(h => {
        if (h.id === hotelId) {
          if (h.roomsOccupied >= h.capacity) {
            triggerNotification(`L'établissement ${h.name} est déjà complet !`);
            return h;
          }
          const updated = h.roomsOccupied + 1;
          const revenueIncrease = h.adr;
          triggerNotification(`Réservation instantanée simulée pour ${h.name} : +${revenueIncrease.toLocaleString('fr-FR')} FCFA`);
          return { ...h, roomsOccupied: updated };
        }
        return h;
      })
    );
  };

  // Simulation: Change ADR (Average Daily Rate)
  const handleModifyADR = (hotelId: string, percentage: number) => {
    if (currentRole === 'Directeur Financier') {
      triggerNotification("Rôle Directeur Financier : Ajustement de la tarification approuvé !");
    }
    setHotels(prevHotels =>
      prevHotels.map(h => {
        if (h.id === hotelId) {
          const newAdr = Math.round(h.adr * (1 + percentage / 100));
          triggerNotification(`Tarif moyen journalier (ADR) de ${h.name} ajusté à ${newAdr.toLocaleString('fr-FR')} FCFA`);
          return { ...h, adr: newAdr };
        }
        return h;
      })
    );
  };

  // Overall Global metrics calculations
  const totalCapacitySum = hotels.reduce((acc, curr) => acc + curr.capacity, 0);
  const totalOccupiedSum = hotels.reduce((acc, curr) => acc + curr.roomsOccupied, 0);
  const averageOccupancyPercent = Math.round((totalOccupiedSum / totalCapacitySum) * 100);
  
  const totalGroupRevenueDaily = hotels.reduce((acc, curr) => acc + (curr.roomsOccupied * curr.adr), 0);
  const averageAdr = Math.round(hotels.reduce((acc, curr) => acc + curr.adr, 0) / hotels.length);

  return (
    <div className="space-y-6 fade-in-up">
      
      {/* 1. INTERACTIVE TOAST ALERT */}
      {simAlert && (
        <div className="bg-orange-600 text-white px-4 py-3.5 rounded-[18px] text-xs font-bold shadow-lg flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-3 duration-250 fixed top-6 right-6 z-50 max-w-sm border border-orange-500/30">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-orange-200 shrink-0 animate-bounce" />
            <span className="leading-snug text-left">{simAlert}</span>
          </div>
          <button 
            onClick={() => setSimAlert(null)}
            className="text-white hover:text-orange-200 font-extrabold px-1.5 py-0.5 rounded cursor-pointer text-[10px]"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. HEADER CONTAINER WITH DUAL-TITLES */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#09153D] tracking-tight font-sans">Hub d'Établissements Senegal Hotels</h2>
          <p className="text-xs text-slate-400 font-medium">Vue d'ensemble opérationnelle consolidée et console d'aiguillage du groupe</p>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] font-bold text-slate-500 font-mono">SYNCHRONISATION MULTI-SITES EXÉCUTIVE</span>
        </div>
      </div>

      {/* 3. GROUP STATISTICS KPI LEVEL (HIGH-POLISHED AS REQUESTED) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 w-full">
        
        {/* Metric Card 1: Cumulative Daily Revenue */}
        <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-600"></div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Revenu Quotidien Conso</span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2.5xl font-extrabold text-[#09153D] tracking-tight font-sans">
              {totalGroupRevenueDaily.toLocaleString('fr-FR')} <span className="text-xs font-bold text-slate-400">FCFA</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Calculé en temps réel (ADR x Ch. Occupées)</p>
          </div>
        </div>

        {/* Metric Card 2: Cumulative Rooms */}
        <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Chambres du Groupe</span>
            <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500">
              <BedDouble className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2.5xl font-extrabold text-[#09153D] tracking-tight font-sans">
              {totalOccupiedSum} <span className="text-xs font-bold text-slate-400">/ {totalCapacitySum} ch.</span>
            </h3>
            <p className="text-[10px] text-slate-405 font-semibold text-emerald-600 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{Math.round(totalCapacitySum - totalOccupiedSum)} Disponibles en ligne</span>
            </p>
          </div>
        </div>

        {/* Metric Card 3: Combined Occupancy Rate */}
        <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Taux d'Occupation Global</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2.5xl font-extrabold text-[#09153D] tracking-tight font-sans">
              {averageOccupancyPercent}%
            </h3>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full" 
                style={{ width: `${averageOccupancyPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Metric Card 4: Index ADR Moyen */}
        <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Prix Moyen Journalier (ADR)</span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2.5xl font-extrabold text-[#09153D] tracking-tight font-sans">
              {averageAdr.toLocaleString('fr-FR')} <span className="text-xs font-semibold text-slate-400">FCFA</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Calculé sur les 3 portefeuilles</p>
          </div>
        </div>

      </div>

      {/* 4. MAIN HOTELS GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 w-full">
        {hotels.map((h) => {
          const occupancyRate = Math.round((h.roomsOccupied / h.capacity) * 100);
          const isHotelActive = currentHotel === h.name;
          const currentRevPAR = Math.round((h.roomsOccupied * h.adr) / h.capacity);

          return (
            <div 
              key={h.id}
              className={`bg-white rounded-[24px] border transition-all duration-300 flex flex-col justify-between shadow-sm hover:shadow-md relative overflow-hidden ${
                isHotelActive 
                  ? 'border-orange-500/80 ring-2 ring-orange-500/10' 
                  : 'border-slate-100'
              }`}
            >
              {/* Hotel Card Top Header Decor */}
              <div className={`h-2.5 bg-gradient-to-r ${h.accentColor}`} />
              
              <div className="p-6 flex-grow flex flex-col justify-between">
                <div>
                  
                  {/* Badge & Switch state Indicator */}
                  <div className="flex items-center justify-between gap-2.5 mb-3.5">
                    <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full border ${h.badgeColor}`}>
                      {h.badge.toUpperCase()}
                    </span>
                    
                    {isHotelActive ? (
                      <span className="flex items-center gap-1.5 bg-orange-500 text-white text-[9.5px] font-extrabold px-3 py-0.5 rounded-full select-none shadow-sm shadow-orange-500/10 uppercase tracking-wider">
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>WorkSpace PMS</span>
                      </span>
                    ) : (
                      <span className="text-[9.5px] font-bold text-slate-400">Inactif</span>
                    )}
                  </div>

                  {/* Hotel info */}
                  <h3 className="text-lg font-black text-[#09153D] tracking-tight text-left">{h.name}</h3>
                  
                  <div className="flex items-center gap-1 mt-1 text-slate-400">
                    <MapPin className="w-3.5 h-3.5 shrink-0 text-orange-500" />
                    <span className="text-[11px] font-medium text-slate-500">{h.location}</span>
                  </div>

                  <p className="text-[11px] text-slate-500 mt-3 leading-snug text-left mb-5">
                    {h.description}
                  </p>

                  {/* Core Metrics Progress bars */}
                  <div className="space-y-4 border-t border-slate-50 pt-4.5 mb-5">
                    
                    {/* Occupancy Indicator */}
                    <div className="space-y-1 text-left">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                        <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                          <Activity className="w-3.5 h-3.5" /> Taux d'Occupation
                        </span>
                        <span className="text-sm font-extrabold text-[#09153D] font-mono">{occupancyRate}%</span>
                      </div>
                      
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-orange-500 rounded-full" 
                          style={{ width: `${occupancyRate}%` }}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                        <span>{h.roomsOccupied} Chambres Vendues</span>
                        <span>{h.capacity - h.roomsOccupied} Libres</span>
                      </div>
                    </div>

                    {/* Operational numbers summary row */}
                    <div className="grid grid-cols-2 gap-4 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100/50">
                      <div>
                        <span className="block text-[8.5px] font-extrabold text-slate-400 tracking-wider uppercase">Prix Moyen ADR</span>
                        <span className="text-sm font-black text-[#09153D] font-mono mt-0.5 block">
                          {h.adr.toLocaleString('fr-FR')} <span className="text-[9px] font-medium text-slate-405">FCFA</span>
                        </span>
                      </div>
                      <div>
                        <span className="block text-[8.5px] font-extrabold text-slate-400 tracking-wider uppercase">RevPar</span>
                        <span className="text-sm font-black text-[#09153D] font-mono mt-0.5 block">
                          {currentRevPAR.toLocaleString('fr-FR')} <span className="text-[9px] font-medium text-slate-405">FCFA</span>
                        </span>
                      </div>
                    </div>

                    {/* Scores stars and values info */}
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                      <div className="flex items-center gap-1 font-bold">
                        <Star className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
                        <span className="text-slate-800">{h.rating} / 5</span>
                        <span className="text-[9px] text-slate-400">Avis</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10.5px]">
                        <span className="text-slate-400">Propreté:</span>
                        <span className="font-extrabold text-[#09153D]">{h.cleanliness}/5.0</span>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Operations & actions block */}
                <div className="space-y-2 pt-2 border-t border-slate-50">
                  
                  {/* SWITCH PMS WORKSPACE BUTTON (Direct integration with system state) */}
                  {!isHotelActive ? (
                    <button
                      onClick={() => {
                        onHotelChange(h.name);
                        triggerNotification(`Workspace PMS commuté avec succès sur : ${h.name}`);
                      }}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3.5 px-4 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Building2 className="w-4 h-4" />
                      <span>Activer cet établissement</span>
                    </button>
                  ) : (
                    <div className="bg-orange-50 border border-orange-200/50 rounded-xl p-3 text-center text-[11px] font-bold text-orange-750 flex items-center justify-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-600 animate-pulse"></span>
                      <span>Établissement actif dans la session</span>
                    </div>
                  )}

                  {/* SIMULATE RANDOM ONLINE BOOKING ACTION */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleSimulateBooking(h.id)}
                      className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-[#09153D] font-bold p-2.5 rounded-xl text-[10px] transition-all cursor-pointer flex items-center justify-center gap-1"
                      title="Enregistrer un client fictif pour tester"
                    >
                      <span>+1 Reser. (Simul)</span>
                    </button>

                    {/* TARIF / ADR ADJUSTERS */}
                    <div className="flex border border-slate-200 rounded-xl overflow-hidden shrink-0">
                      <button
                        onClick={() => handleModifyADR(h.id, 5)}
                        className="flex-1 bg-slate-50 hover:bg-slate-150 text-[10px] font-extrabold text-emerald-600 p-2 border-r border-slate-200 hover:bg-emerald-50 cursor-pointer"
                        title="Augmenter l'ADR de 5%"
                      >
                        +5%
                      </button>
                      <button
                        onClick={() => handleModifyADR(h.id, -5)}
                        className="flex-1 bg-slate-50 hover:bg-slate-150 text-[10px] font-extrabold text-red-650 p-2 hover:bg-red-50 cursor-pointer"
                        title="Réduire l'ADR de 5%"
                      >
                        -5%
                      </button>
                    </div>
                  </div>

                </div>

              </div>
            </div>
          );
        })}
      </div>

      {/* 5. SIDE-BY-SIDE PROPERTY COMPARISON SECTION */}
      <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 text-left">
          <div>
            <h4 className="text-sm font-bold text-slate-900 tracking-tight">Rapport de Benchmarcking Groupé</h4>
            <p className="text-[11px] text-slate-400 font-medium">Comparaison des indicateurs clés de performance entre nos implantations au Sénégal</p>
          </div>
          
          <button
            onClick={() => {
              // Reset simulated statistics to baseline standards
              setHotels([
                {
                  id: 'h-1',
                  name: 'Royal Saly',
                  location: 'Saly Portudal, Petite-Côte',
                  capacity: 120,
                  roomsOccupied: 78,
                  adr: 75000,
                  manager: 'Awa Ndiaye',
                  rating: 4.8,
                  cleanliness: 4.9,
                  description: 'Hôtel balnéaire haut de gamme proposant bungalows traditionnels, piscines lagon et un centre de bien-être moderne.',
                  badge: 'Complexe Balnéaire',
                  badgeColor: 'bg-orange-50 text-orange-600 border-orange-100',
                  accentColor: 'from-orange-500 to-amber-500'
                },
                {
                  id: 'h-2',
                  name: 'Nema Kadior',
                  location: 'Ziguinchor, Casamance',
                  capacity: 72,
                  roomsOccupied: 43,
                  adr: 55000,
                  manager: 'Ibrahima Sagna',
                  rating: 4.6,
                  cleanliness: 4.7,
                  description: 'Oasis fluviale au cœur de la Casamance, offrant un cadre paisible entouré de jardins tropicaux et de circuits culturels.',
                  badge: 'Étape Fleuve',
                  badgeColor: 'bg-emerald-50 text-emerald-600 border-emerald-100',
                  accentColor: 'from-emerald-500 to-teal-500'
                },
                {
                  id: 'h-3',
                  name: 'Les Pélicans du Saloum',
                  location: 'Toubacouta, Delta du Saloum',
                  capacity: 40,
                  roomsOccupied: 28,
                  adr: 90000,
                  manager: 'Marie-Louise Diouf',
                  rating: 4.9,
                  cleanliness: 4.8,
                  description: 'Éco-lodge d\'exception proposant des bungalows sur pilotis face aux mangroves et des excursions ornithologiques.',
                  badge: 'Éco-Retraite Prestige',
                  badgeColor: 'bg-sky-50 text-sky-600 border-sky-100',
                  accentColor: 'from-sky-500 to-indigo-500'
                }
              ]);
              triggerNotification("Données opérationnelles de comparaison remises à zéro.");
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 hover:bg-slate-50 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs transition-colors cursor-pointer shrink-0"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Réinitialiser les Données</span>
          </button>
        </div>

        {/* Comparison analytical table layout */}
        <div className="overflow-x-auto border border-slate-100 rounded-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest p-4">Établissement</th>
                <th className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest p-4">Capacité</th>
                <th className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest p-4">Occupées</th>
                <th className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest p-4">ADR Tarifié</th>
                <th className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest p-4">RevPAR Moyen</th>
                <th className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest p-4">Chiffre d’Affaire / jour</th>
                <th className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest p-4 text-center">Gérant Direct</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-left">
              {hotels.map((h) => {
                const currentRevPAR = Math.round((h.roomsOccupied * h.adr) / h.capacity);
                const dailyTurnover = h.roomsOccupied * h.adr;
                return (
                  <tr key={h.id} className={`hover:bg-slate-50/40 transition-colors ${currentHotel === h.name ? 'bg-orange-50/20' : ''}`}>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🏢</span>
                        <div>
                          <span className="font-extrabold text-slate-800 leading-snug block">{h.name}</span>
                          <span className="text-[10px] text-slate-400 font-medium">{h.location}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-bold text-slate-500 font-mono">{h.capacity} Chambres</td>
                    <td className="p-4 font-extrabold font-mono text-slate-705">{h.roomsOccupied} Chambres</td>
                    <td className="p-4 font-black font-mono text-slate-800">{h.adr.toLocaleString('fr-FR')} FCFA</td>
                    <td className="p-4 font-extrabold font-mono text-orange-650">{currentRevPAR.toLocaleString('fr-FR')} FCFA</td>
                    <td className="p-4 font-black font-mono text-emerald-600">{(dailyTurnover).toLocaleString('fr-FR')} FCFA</td>
                    <td className="p-4 text-center">
                      <span className="inline-block text-[11px] font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                        👩‍💼 {h.manager}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
