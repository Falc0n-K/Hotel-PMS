/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Megaphone, 
  Plus, 
  Sparkles, 
  Search, 
  Sliders, 
  Percent, 
  Gift, 
  Mail, 
  Send, 
  UserCheck, 
  Trash2, 
  Star, 
  DollarSign, 
  Activity, 
  Award, 
  Clock, 
  Play, 
  CheckCircle2, 
  Users, 
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';
import { RBACRole } from '../types';

interface MarketingPackagesProps {
  currentHotel: string;
  currentRole: RBACRole;
  onAddNotification: (title: string, message: string, type: 'réservation' | 'paiement' | 'alerte' | 'info') => void;
}

export interface MarketingPackage {
  id: string;
  name: string;
  hotel: 'Royal Saly' | 'Nema Kadior' | 'Les Pélicans du Saloum';
  category: 'Romance' | 'Affaires' | 'Famille' | 'Bien-être';
  nightlyRate: number;
  discountPercent: number; // e.g. 15 for 15%
  includedExtras: string[];
  status: 'Actif' | 'Brouillon' | 'Archivé';
  description: string;
}

export interface PromoCampaign {
  id: string;
  title: string;
  channel: 'Email Newsletter' | 'Réseaux Sociaux' | 'Partenaires de Voyage' | 'Sponsor Direct';
  clickCount: number;
  conversionRate: number; // e.g. 4.8 for 4.8%
  roiMultiplier: number; // e.g. 3.2 for 3.2x
  budgetSpent: number;
  status: 'Active' | 'Planifié' | 'Terminé';
}

export interface MarketingLead {
  id: string;
  name: string;
  email: string;
  origin: string;
  interets: string;
  lastAction: string;
  hasCoupon: boolean;
}

export default function MarketingPackages({
  currentHotel,
  currentRole,
  onAddNotification
}: MarketingPackagesProps) {

  // Pre-configured premium marketing packages
  const [packages, setPackages] = useState<MarketingPackage[]>([
    {
      id: "PKG-ROM-01",
      name: "Escapade Romance Baobab & Coquillages",
      hotel: "Royal Saly",
      category: "Romance",
      nightlyRate: 145000,
      discountPercent: 20,
      includedExtras: ["Panier de fruits & Fleurs locales en chambre", "Accès plage privée des Cocotiers", "Massage impérial karité couple", "Dîner langoustes aux chandelles"],
      status: "Actif",
      description: "L'escapade amoureuse par excellence sous le soleil de Saly. Hébergement en Suite Lit King, petites attentions locales et moments complices de relaxation absolue."
    },
    {
      id: "PKG-SEM-02",
      name: "Séminaire Innovation & Éco-Rando",
      hotel: "Les Pélicans du Saloum",
      category: "Affaires",
      nightlyRate: 450000,
      discountPercent: 12,
      includedExtras: ["Salle Polyvalente Sine-Saloum", "Projecteur & Sonos Laser", "Excursion Pirogue Mangrove", "Buffet de Poissons Grillés midi & soir"],
      status: "Actif",
      description: "Associez haute performance et reconnexion écologique. Solution tout-en-un pour vos comités d'administration et kick-offs corporatifs durables."
    },
    {
      id: "PKG-DET-03",
      name: "Bulle de Plénitude Fleuve Casamance",
      hotel: "Nema Kadior",
      category: "Bien-être",
      nightlyRate: 110000,
      discountPercent: 15,
      includedExtras: ["Spa Beurre de Karité & Baobab", "Thé Ataya & Mignardises à la mangue", "Cours d'étirement matinal face au fleuve", "Shuttle Aéroport Ziguinchor aller-retour"],
      status: "Actif",
      description: "Une cure de zenitude au fil de l'eau. Déconnexion spirituelle, massages traditionnels aux essences d'Afrique et alimentation saine locale."
    },
    {
      id: "PKG-FAM-04",
      name: "Safari Bandia & Aventure Familiale",
      hotel: "Royal Saly",
      category: "Famille",
      nightlyRate: 175000,
      discountPercent: 25,
      includedExtras: ["Entrées privatives Réserve de Bandia", "Bungalow communicant avec terrasse", "Atelier Culinaire d'initiation enfants", "Glace artisanale cacao en illimité"],
      status: "Actif",
      description: "Créez des souvenirs inoubliables pour petits et grands. Un cocktail parfait d'observation de la biodiversité et de plaisirs balnéaires conviviaux."
    }
  ]);

  // Lead subscribers database
  const [leads, setLeads] = useState<MarketingLead[]>([
    {
      id: "LD-001",
      name: "Sokhna Fall",
      email: "sokhna.fall@dakar-invest.sn",
      origin: "Instagram d'influence",
      interets: "Romance / Lune de miel",
      lastAction: "A visité le site il y a 2h",
      hasCoupon: false
    },
    {
      id: "LD-002",
      name: "Gérard Deprez",
      email: "g.deprez@voile-france.fr",
      origin: "Salon du Tourisme Paris",
      interets: "Aventure & Safari Saloum",
      lastAction: "Offre brochure téléchargée",
      hasCoupon: true
    },
    {
      id: "LD-003",
      name: "Aminata Diop",
      email: "a.diop@orange.sn",
      origin: "LinkedIn Affaires",
      interets: "MICE / Team Building corporate",
      lastAction: "Demande de devis envoyé",
      hasCoupon: false
    },
    {
      id: "LD-004",
      name: "Michel Lemoine",
      email: "mlem@lyon-conventions.fr",
      origin: "Google Search SEO",
      interets: "Bien-être / Spa Casamance",
      lastAction: "Inscrit Newsletter en Avril",
      hasCoupon: false
    }
  ]);

  // Performance campaigns index
  const [campaigns, setCampaigns] = useState<PromoCampaign[]>([
    {
      id: "CMP-01",
      title: "Hivernage Zen Royal Saly",
      channel: "Email Newsletter",
      clickCount: 1420,
      conversionRate: 5.6,
      roiMultiplier: 4.2,
      budgetSpent: 450000,
      status: "Active"
    },
    {
      id: "CMP-02",
      title: "Escapade Couples d'Afrique",
      channel: "Réseaux Sociaux",
      clickCount: 2850,
      conversionRate: 3.8,
      roiMultiplier: 3.1,
      budgetSpent: 800000,
      status: "Active"
    },
    {
      id: "CMP-03",
      title: "Comité Exécutif Delta Saloum 2026",
      channel: "Partenaires de Voyage",
      clickCount: 650,
      conversionRate: 11.2,
      roiMultiplier: 6.5,
      budgetSpent: 300050,
      status: "Terminé"
    }
  ]);

  // Filter configurations
  const [catFilter, setCatFilter] = useState<string>('Tous');
  const [selectedPkgId, setSelectedPkgId] = useState<string | null>("PKG-ROM-01");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Modal visibility flags
  const [showAddPkgModal, setShowAddPkgModal] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);

  // Form states for New Package
  const [npName, setNpName] = useState('');
  const [npCat, setNpCat] = useState<MarketingPackage['category']>("Romance");
  const [npRate, setNpRate] = useState<number>(120000);
  const [npDiscount, setNpDiscount] = useState<number>(15);
  const [npDesc, setNpDesc] = useState('');
  const [npExtrasInput, setNpExtrasInput] = useState('');
  const [npExtras, setNpExtras] = useState<string[]>([]);

  // Form states for New Promo Campaign
  const [ncTitle, setNcTitle] = useState('');
  const [ncChannel, setNcChannel] = useState<PromoCampaign['channel']>("Email Newsletter");
  const [ncBudget, setNcBudget] = useState<number>(200000);

  // Form states to distribute dynamic coupon
  const [selectedLeadId, setSelectedLeadId] = useState<string>('LD-001');
  const [couponCode, setCouponCode] = useState('TERANGA-LOVE20');
  const [couponValue, setCouponValue] = useState<number>(20);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Switch package statuses
  const handleTogglePackageStatus = (pkgId: string) => {
    if (currentRole === 'Responsable Ménage') {
      triggerToast("Permissions refusées : La gouvernance des forfaits commerciaux exige le rôle de Direction.");
      return;
    }

    setPackages(prev => prev.map(p => {
      if (p.id === pkgId) {
        const nextStatus: MarketingPackage['status'] = p.status === 'Actif' ? 'Brouillon' : 'Actif';
        onAddNotification(
          nextStatus === 'Actif' ? "Forfait Commercial Activé" : "Forfait Mis en Sommeil",
          `Le forfait "${p.name}" (${p.hotel}) a été configuré en mode ${nextStatus.toLowerCase()}.`,
          nextStatus === 'Actif' ? 'info' : 'alerte'
        );
        return { ...p, status: nextStatus };
      }
      return p;
    }));
    triggerToast("Statut de publication mis à jour.");
  };

  // Add extra amenities on the fly
  const handleAddExtraTag = () => {
    if (npExtrasInput.trim()) {
      setNpExtras([...npExtras, npExtrasInput.trim()]);
      setNpExtrasInput('');
    }
  };

  // Create Package Submit
  const handleCreatePackageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!npName.trim() || !npDesc.trim()) {
      triggerToast("Veuillez renseigner les champs obligatoires.");
      return;
    }

    // Role check for high discounts
    if (npDiscount > 30 && currentRole !== 'Propriétaire d\'Hôtel' && currentRole !== 'Directeur Financier') {
      triggerToast("Demande rejetée : Les rabais supérieurs à 30% exigent l'approbation formelle de la direction financière.");
      return;
    }

    const uniqueId = `PKG-CUST-${Date.now().toString().slice(-3)}`;
    const newPkg: MarketingPackage = {
      id: uniqueId,
      name: npName.trim(),
      hotel: currentHotel as any,
      category: npCat,
      nightlyRate: npRate,
      discountPercent: npDiscount,
      includedExtras: npExtras.length > 0 ? npExtras : ["Accueil VIP Téranga"],
      status: "Actif",
      description: npDesc.trim()
    };

    setPackages([...packages, newPkg]);
    setShowAddPkgModal(false);
    
    // Clear
    setNpName('');
    setNpDesc('');
    setNpExtras([]);
    setNpRate(120000);
    setNpDiscount(15);

    onAddNotification(
      "Nouveau Forfait Créé",
      `Offre groupée "${npName}" mise en ligne pour ${currentHotel}. Tarif de base : ${npRate.toLocaleString()} F (-${npDiscount}%).`,
      'info'
    );
    triggerToast("Nouveau forfait enregistré et publié !");
  };

  // Launch campaign submit
  const handleCreateCampaignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ncTitle.trim()) {
      triggerToast("Le titre de la campagne est requis.");
      return;
    }

    const newCamp: PromoCampaign = {
      id: `CMP-${Date.now().toString().slice(-3)}`,
      title: ncTitle.trim(),
      channel: ncChannel,
      clickCount: 0,
      conversionRate: 0, // initially 0%
      roiMultiplier: 1.0, // base
      budgetSpent: ncBudget,
      status: "Active"
    };

    setCampaigns([...campaigns, newCamp]);
    setShowCampaignModal(false);
    setNcTitle('');

    onAddNotification(
      "Campagne Marketing Lancée",
      `Diffusion entamée pour l'audience cible via le canal "${ncChannel}". Budget : ${ncBudget.toLocaleString()} FCFA.`,
      'info'
    );
    triggerToast("Campagne de relations publiques initialisée !");
  };

  // Distribute promotion voucher to lead
  const handleDistributeCouponSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetedLead = leads.find(l => l.id === selectedLeadId);
    if (!targetedLead) return;

    setLeads(prev => prev.map(l => {
      if (l.id === selectedLeadId) {
        return { ...l, hasCoupon: true, lastAction: `A reçu le code '${couponCode}' (${couponValue}% de réduction)` };
      }
      return l;
    }));

    setShowCouponModal(false);
    onAddNotification(
      "E-mail Marketing Distribué",
      `Offre de rabais promotionnel délivrée par mail à ${targetedLead.name} (${targetedLead.email}). Code : ${couponCode}.`,
      'paiement'
    );
    triggerToast(`Code promo envoyé à ${targetedLead.name} !`);
  };

  // General Archival
  const handleDeletePackage = (id: string, name: string) => {
    if (currentRole !== 'Propriétaire d\'Hôtel') {
      triggerToast("Permissions RBAC insuffisantes : Seul le Propriétaire de l'établissement peut radier un forfait commercial historique.");
      return;
    }

    setDeleteConfirmId(id);
  };

  const handleDeletePackageConfirmed = (id: string) => {
    setDeleteConfirmId(null);
    setPackages(prev => prev.filter(p => p.id !== id));
    if (selectedPkgId === id) setSelectedPkgId(null);
    triggerToast("Forfait marketing supprimé du PMS.");
  };

  // Filter based on active hotel and category selection
  const activeHotelPackages = useMemo(() => {
    return packages.filter(p => {
      const matchHotel = p.hotel === currentHotel;
      const matchCat = catFilter === 'Tous' || p.category === catFilter;
      return matchHotel && matchCat;
    });
  }, [packages, currentHotel, catFilter]);

  // Selected package details computation
  const selectedPackage = useMemo(() => {
    if (!selectedPkgId) return null;
    return packages.find(p => p.id === selectedPkgId) || null;
  }, [selectedPkgId, packages]);

  // General performance metrics computed for active campaigns
  const performanceTotals = useMemo(() => {
    const totalBudget = campaigns.reduce((acc, c) => acc + c.budgetSpent, 0);
    // Weighted conversions
    const totalClicks = campaigns.reduce((acc, c) => acc + c.clickCount, 0);
    const avgConversion = campaigns.length > 0
      ? Number((campaigns.reduce((acc, c) => acc + c.conversionRate, 0) / campaigns.length).toFixed(1))
      : 0;

    return { totalBudget, totalClicks, avgConversion };
  }, [campaigns]);

  return (
    <div className="space-y-6 fade-in-up">
      
      {/* Toast notifications */}
      {toastMessage && (
        <div className="bg-[#09153D] text-white px-4 py-3.5 rounded-[18px] text-xs font-bold shadow-lg flex items-center gap-2.5 fixed top-6 right-6 z-50 max-w-sm border border-slate-700/60 animate-in fade-in slide-in-from-top-3">
          <Sparkles className="w-4 h-4 text-orange-400 shrink-0" />
          <span className="leading-snug text-left text-slate-100">{toastMessage}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#09153D] tracking-tight font-sans">Forfaits Marketings & Offres Spéciales</h2>
          <p className="text-xs text-slate-400 font-medium font-sans">Gestion des tarifs exclusifs, coupons pour la newsletter locale, et campagnes publicitaires à {currentHotel}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0 select-none">
          {currentRole !== 'Responsable Ménage' && (
            <button
              onClick={() => {
                setNpExtras([]);
                setShowAddPkgModal(true);
              }}
              className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs px-4 py-3 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-orange-600/10"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Concevoir un Forfait</span>
            </button>
          )}

          <button
            onClick={() => setShowCampaignModal(true)}
            className="bg-[#09153D] hover:bg-[#112354] text-white font-extrabold text-xs px-4 py-3 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
          >
            <Megaphone className="w-4 h-4 text-orange-400" />
            <span>Créer Campagne</span>
          </button>
        </div>
      </div>

      {/* METRICS DASHBOARD BANNER */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total marketing active packages count */}
        <div className="bg-white p-4.5 rounded-[20px] border border-slate-100 shadow-sm text-left">
          <span className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest block">Forfaits en Ligne</span>
          <span className="text-2xl font-black text-[#09153D] font-mono block mt-1">
            {activeHotelPackages.filter(p => p.status === 'Actif').length} Offres actives
          </span>
          <span className="text-[10px] text-slate-450 font-semibold uppercase tracking-tight">Rattachées à {currentHotel}</span>
        </div>

        {/* Global budget allocated */}
        <div className="bg-white p-4.5 rounded-[20px] border border-slate-100 shadow-sm text-left">
          <span className="text-[9.5px] font-extrabold text-orange-650 uppercase tracking-widest block">Budget Campagnes</span>
          <span className="text-2xl font-black text-orange-600 font-mono block mt-1">
            {performanceTotals.totalBudget.toLocaleString('fr-FR')} F
          </span>
          <span className="text-[10px] text-slate-450 font-medium">investis sur les 6 derniers mois</span>
        </div>

        {/* Total clicks/reach simulated */}
        <div className="bg-white p-4.5 rounded-[20px] border border-slate-100 shadow-sm text-left">
          <span className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest block">Audience Touchée</span>
          <span className="text-2xl font-black text-[#09153D] font-mono block mt-1">
            {performanceTotals.totalClicks.toLocaleString('fr-FR')} Clics
          </span>
          <span className="text-[10px] text-emerald-600 font-bold">Via e-mailing et réseaux</span>
        </div>

        {/* Average conversion rate */}
        <div className="bg-white p-4.5 rounded-[20px] border border-slate-100 shadow-sm text-left">
          <span className="text-[9.5px] font-extrabold text-emerald-650 uppercase tracking-widest block">Taux Conv. Moyen</span>
          <span className="text-2xl font-black text-emerald-600 font-mono block mt-1">
            {performanceTotals.avgConversion}%
          </span>
          <span className="text-[10px] text-slate-450 font-medium">Réservations validées / visiteurs</span>
        </div>

      </div>

      {/* SEARCH AND FILTERS PANEL */}
      <div className="bg-white p-4 rounded-[22px] border border-slate-100 shadow-sm text-left flex flex-col md:flex-row items-center justify-between gap-4 select-none">
        
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-extrabold text-[#09153D]">Filtrer par thématique d'offre :</span>
        </div>

        {/* Categories toggles */}
        <div className="flex items-center gap-1 bg-slate-50 border p-1 rounded-xl overflow-x-auto w-full md:w-auto">
          {['Tous', 'Romance', 'Affaires', 'Famille', 'Bien-être'].map(t => (
            <button
              key={t}
              onClick={() => setCatFilter(t)}
              className={`text-[10.5px] font-extrabold px-3.5 py-1.5 rounded-lg whitespace-nowrap cursor-pointer transition-all ${
                catFilter === t 
                  ? 'bg-[#09153D] text-orange-400 font-extrabold shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>

      </div>

      {/* CORE SPLIT SCREEN */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Packages listings */}
        <div className="lg:col-span-7 space-y-3.5 text-left">
          
          <div className="flex items-center justify-between border-b pb-1">
            <h3 className="text-xs font-black text-[#09153D] uppercase tracking-wider">Catalogue des forfaits disponibles</h3>
            <span className="text-[10.5px] font-mono text-slate-400 font-bold">{activeHotelPackages.length} Forfaits Configurés</span>
          </div>

          {activeHotelPackages.length === 0 ? (
            <div className="bg-white rounded-[24px] border border-slate-100 p-12 text-center text-slate-400 text-xs font-medium italic">
              Aucun forfait promotionnel configuré pour {currentHotel} sous cette thématique.
            </div>
          ) : (
            activeHotelPackages.map(pkg => {
              const isSelected = selectedPkgId === pkg.id;
              
              const computedNightlyDiscount = Math.round(pkg.nightlyRate * (1 - pkg.discountPercent / 100));

              return (
                <div
                  key={pkg.id}
                  onClick={() => setSelectedPkgId(isSelected ? null : pkg.id)}
                  className={`bg-white rounded-[24px] border p-5 transition-all text-left flex flex-col justify-between/0 relative cursor-pointer gap-3.5 ${
                    isSelected 
                      ? 'border-orange-500 bg-orange-50/5 shadow-sm' 
                      : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/10'
                  }`}
                >
                  
                  {/* Category badging */}
                  <div className="flex items-center justify-between">
                    <span className={`text-[8.5px] font-black uppercase px-2.5 py-0.5 rounded ${
                      pkg.category === 'Romance' ? 'bg-rose-50 text-rose-600' :
                      pkg.category === 'Affaires' ? 'bg-slate-100 text-[#09153D]' :
                      pkg.category === 'Famille' ? 'bg-sky-50 text-sky-600' :
                      'bg-purple-50 text-purple-600'
                    }`}>
                      {pkg.category}
                    </span>

                    {/* Status badge */}
                    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${
                      pkg.status === 'Actif' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                    }`}>
                      ● {pkg.status}
                    </span>
                  </div>

                  {/* Pricing and core info */}
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h4 className="font-extrabold text-sm text-[#09153D] leading-snug tracking-tight">
                        {pkg.name}
                      </h4>
                      <p className="text-[10.5px] text-slate-400 font-medium mt-1 uppercase tracking-wide">Établissement : {pkg.hotel}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-400 line-through font-mono">
                          {pkg.nightlyRate.toLocaleString('fr-FR')} F
                        </span>
                        <span className="bg-red-50 text-red-650 text-[10px] font-black px-1.5 py-0.5 rounded-md">
                          -{pkg.discountPercent}%
                        </span>
                      </div>
                      
                      {/* Promoted price */}
                      <span className="text-sm font-black text-orange-600 font-mono block mt-1">
                        {computedNightlyDiscount.toLocaleString('fr-FR')} F
                      </span>
                      <span className="text-[8.5px] text-slate-400 font-bold uppercase block">par Nuitée</span>
                    </div>
                  </div>

                  {/* Highlights loop */}
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    {pkg.description}
                  </p>

                  <div className="border-t border-slate-50 pt-3 flex items-center justify-between text-xs select-none">
                    
                    <span className="text-[10px] font-bold text-[#09153D] bg-slate-50 border px-2.5 py-0.5 rounded-full">
                      🔥 {pkg.includedExtras.length} Prestations Incluses
                    </span>

                    <span className="text-[10.5px] text-slate-400 font-mono">
                      Ref: {pkg.id}
                    </span>

                  </div>

                </div>
              );
            })
          )}

          {/* ACTIVE CAMPAIGNS SUB SECTION WITH INLINE SVG BAR GRAPH */}
          <div className="bg-white rounded-[24px] border border-slate-100 p-5 shadow-sm space-y-4">
            
            <div className="flex items-center justify-between border-b pb-3.5">
              <div>
                <h3 className="font-extrabold text-[#09153D] text-sm leading-tight">Canaux Publicitaires & Performance</h3>
                <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Observation synthétique des conversions par canal et ROI de l'investissement marketing</p>
              </div>

              <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded">
                Écriture PMS Directe
              </span>
            </div>

            {/* Simulated graph using SVG */}
            <div className="h-44 w-full bg-slate-50 rounded-2xl border border-slate-100 p-4 relative flex flex-col justify-between">
              
              <div className="flex justify-between items-center text-[10px] font-bold text-[#09153D]/50 select-none">
                <span>CONVERSION ET MULTIPLICATEUR DE CHIFFRE D'AFFAIRES (ROI)</span>
                <span className="flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 bg-orange-600 rounded"></span> Taux de Conv %
                  <span className="inline-block w-2.5 h-2.5 bg-[#09153D] rounded"></span> Facteur ROI
                </span>
              </div>

              {/* Bars Row container */}
              <div className="grid grid-cols-3 gap-6 flex-grow items-end pt-4 select-none">
                {campaigns.map((c, idx) => {
                  // Normalize heights for SVG representation
                  const maxConvHeight = 15; // standard cap
                  const convBarPct = Math.min((c.conversionRate / maxConvHeight) * 100, 100);
                  const roiBarPct = Math.min((c.roiMultiplier / 8) * 100, 100);

                  return (
                    <div key={idx} className="flex flex-col items-center gap-1 text-center">
                      <div className="w-full h-24 flex items-end justify-center gap-1.5 bg-white rounded-lg border border-slate-150 p-2 relative shadow-inner">
                        
                        {/* 1. Conversion Rate Bar */}
                        <div 
                          className="w-4 bg-orange-600 rounded-t hover:bg-orange-700 transition-all cursor-pointer relative group flex justify-center"
                          style={{ height: `${convBarPct}%` }}
                          title={`Conv Rate: ${c.conversionRate}%`}
                        >
                          <span className="hidden group-hover:block absolute -top-6 bg-slate-900 text-white text-[8px] px-1 rounded font-mono font-bold z-15 whitespace-nowrap">
                            {c.conversionRate}%
                          </span>
                        </div>

                        {/* 2. ROI factor Bar */}
                        <div 
                          className="w-4 bg-[#09153D] rounded-t hover:bg-[#152e6d] transition-all cursor-pointer relative group flex justify-center"
                          style={{ height: `${roiBarPct}%` }}
                          title={`ROI Multiplier: ${c.roiMultiplier}x`}
                        >
                          <span className="hidden group-hover:block absolute -top-6 bg-slate-900 text-white text-[8px] px-1 rounded font-mono font-bold z-15 whitespace-nowrap">
                            {c.roiMultiplier}x
                          </span>
                        </div>

                      </div>

                      {/* Info label name below bar chart */}
                      <span className="text-[9.5px] font-extrabold text-slate-700 truncate max-w-[120px] pt-1">
                        {c.title}
                      </span>
                      <span className="text-[8px] text-slate-400 uppercase tracking-widest leading-none">
                        {c.channel}
                      </span>
                    </div>
                  );
                })}
              </div>

            </div>

          </div>

        </div>

        {/* Right Side: Operations desk and custom lead dispatcher */}
        <div className="lg:col-span-12 xl:col-span-5 space-y-4">
          
          {selectedPackage ? (
            <div className="bg-white rounded-[24px] border border-slate-100 p-6 text-left shadow-sm space-y-4.5">
              
              <div className="border-b border-slate-50 pb-4.5 flex items-start justify-between">
                <div>
                  <span className="text-[9px] font-black font-mono text-slate-400 bg-slate-50 px-2.5 py-1 rounded border">
                    FORFAIT DESK EXCLUSIF
                  </span>
                  <h3 className="font-black text-slate-900 text-md tracking-tight mt-3">{selectedPackage.name}</h3>
                  <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider mt-1">Réseau : {selectedPackage.hotel}</p>
                </div>

                {currentRole === 'Propriétaire d\'Hôtel' && (
                  deleteConfirmId === selectedPackage.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDeletePackageConfirmed(selectedPackage.id)}
                        className="bg-red-500 hover:bg-red-600 text-white font-extrabold text-[9px] px-2 py-1.5 rounded-lg cursor-pointer"
                      >
                        Confirmer
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[9px] px-2 py-1.5 rounded-lg cursor-pointer"
                      >
                        Non
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleDeletePackage(selectedPackage.id, selectedPackage.name)}
                      className="text-red-500 hover:text-red-700 p-1.5 bg-red-50 rounded-lg shrink-0 cursor-pointer"
                      title="Supprimer le forfait"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )
                )}
              </div>

              {/* Action desk options block */}
              <div className="space-y-3.5 text-xs text-slate-600">
                
                <p className="leading-relaxed text-slate-500 font-semibold italic">
                  "{selectedPackage.description}"
                </p>

                {/* Prestations loop detailed */}
                <div className="bg-slate-50/70 rounded-2xl border border-slate-100 p-4 space-y-2">
                  <span className="text-[9px] font-extrabold text-[#09153D]/50 uppercase tracking-widest block">Prestations Complémentaires de la Téranga Incluses :</span>
                  
                  <div className="space-y-1.5">
                    {selectedPackage.includedExtras.map((ext, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-[11px] font-bold text-slate-75 * text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                        <span>{ext}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  
                  {/* Toggle publish button */}
                  {currentRole !== 'Responsable Ménage' && (
                    <button
                      onClick={() => handleTogglePackageStatus(selectedPackage.id)}
                      className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all cursor-pointer border text-center ${
                        selectedPackage.status === 'Actif'
                          ? 'bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100'
                          : 'bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-700'
                      }`}
                    >
                      {selectedPackage.status === 'Actif' ? 'Suspendre la publication' : 'Mettre en Ligne'}
                    </button>
                  )}

                  {/* Attachment selector */}
                  <button
                    onClick={() => triggerToast(`Forfait "${selectedPackage.name}" rattaché au modèle d'e-mailing principal.`)}
                    className="px-3.5 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl font-extrabold text-slate-700 text-xs cursor-pointer transition-colors"
                    title="Associer au template newsletter"
                  >
                    Lier Template Mail
                  </button>

                </div>

              </div>

            </div>
          ) : (
            <div className="bg-white rounded-[24px] border border-slate-100 p-8 text-center text-slate-400 text-xs italic font-medium min-h-[160px] flex flex-col items-center justify-center space-y-2">
              <Sparkles className="w-8 h-8 text-slate-300 stroke-[1.5]" />
              <p>Sélectionnez une offre groupée pour modifier ses avantages inclus ou alterner sa disponibilité au PMS.</p>
            </div>
          )}

          {/* LEADS AND CRM PROMOTIONAL CODE BROADCASTER */}
          <div className="bg-white rounded-[24px] border border-slate-100 p-5 shadow-sm space-y-4 text-left">
            
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Prospects & Distribution de Coupons</h3>
                <p className="text-[10px] text-slate-400 font-medium">Ciblage stratégique des leads motivés pour le remplissage hors-saison</p>
              </div>

              {currentRole !== 'Responsable Ménage' && (
                <button
                  onClick={() => setShowCouponModal(true)}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-[9px] px-2.5 py-1 rounded uppercase tracking-wide cursor-pointer transition-all"
                >
                  Envoyer Coupon
                </button>
              )}
            </div>

            {/* Newsletter subscribers interactive list row */}
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {leads.map((l) => (
                <div key={l.id} className="bg-slate-50/60 hover:bg-slate-50 border border-slate-150/40 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                  
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-extrabold text-[#09153D]">{l.name}</h4>
                      <span className="bg-white border text-[8.5px] font-mono text-slate-400 px-1 rounded">{l.id}</span>
                    </div>

                    <p className="text-[10.5px] text-slate-400 font-medium font-mono">{l.email}</p>
                    <p className="text-[10.5px] text-slate-500 font-semibold">Thématique : <span className="text-[#09153D]">{l.interets}</span></p>
                  </div>

                  {/* Actions logs status */}
                  <div className="text-right flex flex-col items-stretch md:items-end gap-1 shrink-0">
                    <span className="text-[9.5px] font-medium text-slate-400 italic block">
                      {l.lastAction}
                    </span>

                    {/* Has coupon status check badge */}
                    {l.hasCoupon ? (
                      <span className="inline-flex self-start md:self-auto items-center gap-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-black px-2 py-0.5 rounded uppercase">
                        ✓ Coupon ACTIF
                      </span>
                    ) : (
                      <span className="inline-flex self-start md:self-auto items-center gap-0.5 bg-slate-100 text-slate-450 text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                        Aucun Code
                      </span>
                    )}
                  </div>

                </div>
              ))}
            </div>

          </div>

        </div>

      </div>

      {/* MODAL 1: CONCEIVE A EXCLUSIV PACKAGE FOR CUSTOMER */}
      {showAddPkgModal && (
        <div className="fixed inset-0 z-50 bg-[#09153D]/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] border border-slate-150/80 shadow-2xl max-w-md w-full overflow-hidden text-left animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-orange-600 to-amber-500 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Gift className="w-5.5 h-5.5 text-white" />
                <div>
                  <h3 className="font-extrabold text-white text-md tracking-tight">Nouvel Assemblage Forfait</h3>
                  <p className="text-[10px] text-orange-100 font-medium">Combiner hébergement premium, remises et extras locaux</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddPkgModal(false)}
                className="text-white hover:text-orange-200 cursor-pointer text-sm font-bold bg-white/10 w-7 h-7 rounded-full flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreatePackageSubmit} className="p-6 space-y-4">
              
              {/* Name */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  Nom commercial de l'offre groupée (Public) :
                </label>
                <input
                  type="text"
                  placeholder="Ex : Bulle de Rêve & Safari d'Exception..."
                  value={npName}
                  onChange={(e) => setNpName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs font-bold p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500"
                  required
                />
              </div>

              {/* Category selector */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Thématique de l'offre :
                  </label>
                  <select
                    value={npCat}
                    onChange={(e) => setNpCat(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold p-3 rounded-xl focus:outline-none cursor-pointer"
                  >
                    <option value="Romance">Romance / Amoureux</option>
                    <option value="Affaires">Affaires / Corporatif</option>
                    <option value="Famille">Famille & Vacances</option>
                    <option value="Bien-être">Bien-être / Cure</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-orange-600 uppercase tracking-widest">
                    Hôtel Rattaché ( PMS Courant ) :
                  </label>
                  <div className="bg-slate-50 p-3 border border-slate-150 rounded-xl font-mono font-black text-xs text-[#09153D]">
                    🏢 {currentHotel}
                  </div>
                </div>
              </div>

              {/* Rate and Discount percentage */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Tarif Nuitée Standard (FCFA) :
                  </label>
                  <input
                    type="number"
                    min={40000}
                    step={10000}
                    value={npRate}
                    onChange={(e) => setNpRate(parseInt(e.target.value) || 40000)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold p-3 rounded-xl focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Rabais consenti (%) :
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={60}
                    value={npDiscount}
                    onChange={(e) => setNpDiscount(parseInt(e.target.value) || 5)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold p-3 rounded-xl focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  Paragraphe de vente / Description de l'offre :
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex : Conçu pour les amoureux de la nature voulant combiner détente de charme brevetée, excursion insolite au lagon..."
                  value={npDesc}
                  onChange={(e) => setNpDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold p-3 rounded-xl focus:outline-none text-slate-800"
                  required
                />
              </div>

              {/* Extra features Tag builder */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  Avantages complices inclus gratuitements :
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ex : WiFi fibre illimité, Petit dèj offert au lit..."
                    value={npExtrasInput}
                    onChange={(e) => setNpExtrasInput(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 text-xs p-3 rounded-xl focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddExtraTag}
                    className="bg-[#09153D] hover:bg-[#112354] text-white font-extrabold text-xs px-4 rounded-xl cursor-pointer"
                  >
                    Ajouter
                  </button>
                </div>

                {/* Tags preview */}
                {npExtras.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {npExtras.map((p, idx) => (
                      <span key={idx} className="bg-slate-50 border border-slate-150 text-[9.5px] font-bold text-[#09153D] px-2 py-0.5 rounded-lg flex items-center gap-1.5 select-none animate-in zoom-in-95 duration-100">
                        ✓ {p}
                        <button
                          type="button"
                          onClick={() => setNpExtras(npExtras.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-slate-600 font-bold ml-1 cursor-pointer"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Notice row */}
              {npDiscount > 30 && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-[10px] text-red-650 font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4.5 h-4.5 text-red-650 shrink-0" />
                  <span>Un rabais supérieur à 30% va requérir un pass de validation financier d'audit.</span>
                </div>
              )}

              {/* Form submit footer */}
              <div className="pt-4 border-t border-slate-50 flex items-center justify-end gap-3.5">
                <button
                  type="button"
                  onClick={() => setShowAddPkgModal(false)}
                  className="px-4.5 py-3 hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl cursor-pointer"
                >
                  Annuler la création
                </button>
                <button
                  type="submit"
                  className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs px-5 py-3 rounded-xl cursor-pointer shadow-md shadow-orange-550/10"
                >
                  Publier l'Offre au Group Dashboard
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: INITIATE MARKETING CAMPAIGN FOR NEWSLETTER OR SOCIALS */}
      {showCampaignModal && (
        <div className="fixed inset-0 z-50 bg-[#09153D]/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] border border-slate-150/80 shadow-2xl max-w-sm w-full overflow-hidden text-left animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="p-6 bg-[#09153D] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5 animate-pulse">
                <Megaphone className="w-5.5 h-5.5 text-orange-400 animate-bounce" />
                <div>
                  <h3 className="font-extrabold text-white text-md tracking-tight">Nouvel Investissement Pub</h3>
                  <p className="text-[10px] text-slate-300 font-medium">{currentHotel}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCampaignModal(false)}
                className="text-white hover:text-slate-300 cursor-pointer text-sm font-bold bg-white/10 w-7 h-7 rounded-full flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateCampaignSubmit} className="p-6 space-y-4">
              
              {/* Event Title */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  Titre synthétique de la campagne :
                </label>
                <input
                  type="text"
                  placeholder="Ex : Soldes Hivernale France 2026..."
                  value={ncTitle}
                  onChange={(e) => setNcTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs font-bold p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500"
                  required
                />
              </div>

              {/* Channel */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  Canal de diffusion préférentiel :
                </label>
                <select
                  value={ncChannel}
                  onChange={(e) => setNcChannel(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs font-bold p-3 rounded-xl cursor-pointer focus:outline-none"
                >
                  <option value="Email Newsletter">Email Newsletter interne (Mailing)</option>
                  <option value="Réseaux Sociaux">Réseaux Sociaux (Instagram & Facebook ads)</option>
                  <option value="Partenaires de Voyage">Partenaires de Voyage (Tours Opérateurs & GIE)</option>
                  <option value="Sponsor Direct">Sponsor Direct (Comités d'entreprises régionaux)</option>
                </select>
              </div>

              {/* Budget */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  Budget prévisionnel alloué (FCFA) :
                </label>
                <input
                  type="number"
                  min={50000}
                  step={50000}
                  value={ncBudget}
                  onChange={(e) => setNcBudget(parseInt(e.target.value) || 50000)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs font-bold p-3 rounded-xl focus:outline-none"
                  required
                />
              </div>

              {/* Form submit footer */}
              <div className="pt-4 border-t border-slate-50 flex items-center justify-end gap-3.5">
                <button
                  type="button"
                  onClick={() => setShowCampaignModal(false)}
                  className="px-4 py-2.5 hover:bg-slate-50 border text-xs font-bold text-slate-600 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-[#09153D] hover:bg-[#112354] text-white font-extrabold text-xs px-4 py-2.5 rounded-xl cursor-pointer"
                >
                  Diffuser l'Initation
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DISPATCH EMAIL COUPONS FOR LEADS */}
      {showCouponModal && (
        <div className="fixed inset-0 z-50 bg-[#09153D]/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] border border-slate-150/80 shadow-2xl max-w-sm w-full overflow-hidden text-left animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-[#09153D] to-orange-655 to-orange-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Send className="w-5.5 h-5.5 text-orange-200" />
                <div>
                  <h3 className="font-extrabold text-white text-md tracking-tight">Distribuer Code Promo</h3>
                  <p className="text-[10px] text-orange-100 font-medium">Contacter les clients cibles par e-mailing automatisé</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCouponModal(false)}
                className="text-white hover:text-orange-200 cursor-pointer text-sm font-bold bg-white/10 w-7 h-7 rounded-full flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleDistributeCouponSubmit} className="p-6 space-y-4">
              
              {/* Target lead selection */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  Prospect ciblé :
                </label>
                <select
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs font-bold p-3 rounded-xl focus:outline-none"
                >
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>{l.name} ({l.email})</option>
                  ))}
                </select>
              </div>

              {/* Coupon alphanumeric code */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  Code alphanumérique du coupon :
                </label>
                <input
                  type="text"
                  placeholder="Ex : SALY-TERANGA2026, RETOUR-10"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-50 border border-slate-200 text-xs font-mono font-bold p-3 rounded-xl focus:outline-none"
                  required
                />
              </div>

              {/* Discount value percentage slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[10.5px] font-extrabold text-slate-400 uppercase tracking-widest">
                  <span>Remise accordée :</span>
                  <span className="text-orange-600 font-black">{couponValue}% de réduction</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={45}
                  value={couponValue}
                  onChange={(e) => setCouponValue(parseInt(e.target.value) || 5)}
                  className="w-full accent-orange-600 cursor-pointer"
                />
              </div>

              {/* Form submit footer */}
              <div className="pt-4 border-t border-slate-50 flex items-center justify-end gap-3.5">
                <button
                  type="button"
                  onClick={() => setShowCouponModal(false)}
                  className="px-4 py-2.5 hover:bg-slate-50 border text-xs font-bold text-slate-600 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl cursor-pointer shadow-md shadow-orange-550/10"
                >
                  Envoyer par Mail
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
