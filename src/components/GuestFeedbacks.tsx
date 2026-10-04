import React, { useState, useMemo } from 'react';
import { 
  MessageSquare, 
  Star, 
  ThumbsUp, 
  ThumbsDown, 
  Sparkles, 
  Plus, 
  Search, 
  Filter, 
  Reply, 
  CheckCircle2, 
  Trash2, 
  AlertTriangle, 
  Smile, 
  Meh, 
  Frown, 
  Send, 
  Calendar, 
  Building2,
  Sliders,
  Award,
  Users,
  Percent
} from 'lucide-react';
import { RBACRole } from '../types';

interface GuestFeedbacksProps {
  currentHotel: string;
  currentRole: RBACRole;
  onAddNotification: (title: string, message: string, type: 'réservation' | 'paiement' | 'alerte' | 'info') => void;
}

export interface Feedback {
  id: string;
  author: string;
  roomNumber?: string;
  hotel: 'Royal Saly' | 'Nema Kadior' | 'Les Pélicans du Saloum';
  rating: number;
  comment: string;
  sentiment: 'positif' | 'neutre' | 'négatif';
  date: string;
  source: 'Booking.com' | 'Expedia' | 'TripAdvisor' | 'Google Reviews' | 'Direct Checkout';
  tags: string[];
  response?: string;
  responseDate?: string;
}

export default function GuestFeedbacks({
  currentHotel,
  currentRole,
  onAddNotification
}: GuestFeedbacksProps) {

  // Feedback Database State
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([
    {
      id: "FB-001",
      author: "Sophie Lecomte",
      roomNumber: "405",
      hotel: "Royal Saly",
      rating: 5,
      comment: "Un séjour idyllique de 6 nuits ! Face à l'océan, les bungalows sont incroyables. Service chaleureux typiquement sénégalais, accueil exceptionnel et restaurant délicieux.",
      sentiment: "positif",
      date: "2026-05-21",
      source: "Booking.com",
      tags: ["Plage", "Service Chaud", "Restauration", "Bungalow Ocean"],
      response: "Chère Sophie, un immense merci pour votre retour lumineux sur le Royal Saly ! L'océan et l'accueil ensoleillé de la Téranga vous attendent déjà pour votre prochain séjour."
    },
    {
      id: "FB-002",
      author: "Thomas Müller",
      roomNumber: "212",
      hotel: "Royal Saly",
      rating: 4,
      comment: "Calme absolu, parfait pour se ressourcer. Le personnel de réception est extrêmement prévenant et accueillant. Quelques petits retards mineurs au service du petit déjeuner mais vite compensés par les sourires de l'équipe.",
      sentiment: "positif",
      date: "2026-05-20",
      source: "TripAdvisor",
      tags: ["Calme", "Réception", "Sourires"],
      response: "Cher Thomas, merci de souligner l'amabilité de notre accueil. Vos retours sur le petit-déjeuner nous aident à parfaire l'organisation de nos files du matin."
    },
    {
      id: "FB-003",
      author: "Abdoulaye Diop",
      roomNumber: "118",
      hotel: "Nema Kadior",
      rating: 5,
      comment: "Superbe séjour au calme face au fleuve Casamance. Les chambres disposent d'un confort impeccable avec balcon. Le coucher de soleil sur les mangroves est un moment inoubliable.",
      sentiment: "positif",
      date: "2026-05-18",
      source: "Google Reviews",
      tags: ["Balcon Casamance", "Mangroves", "Coucher Soleil"],
    },
    {
      id: "FB-004",
      author: "Chantal Giraud",
      roomNumber: "302",
      hotel: "Les Pélicans du Saloum",
      rating: 4,
      comment: "Expérience écologique magnifique au cœur du Saloum. Balades en pirogue parfaites avec des guides très instruits. Juste une petite remarque : le wifi est instable dans le bungalow fleuve.",
      sentiment: "neutre",
      date: "2026-05-17",
      source: "Expedia",
      tags: ["Eco-lodging", "Pirogue Saloum", "Wifi Instable"],
    },
    {
      id: "FB-005",
      author: "Gérard Deprez",
      roomNumber: "204",
      hotel: "Royal Saly",
      rating: 2,
      comment: "Chambre trop bruyante à cause de la climatisation défaillante. De plus, j'ai attendu plus de 30 minutes ma bouteille d'eau à la piscine lors du premier soir. Heureusement, le cadre naturel sauve les meubles.",
      sentiment: "négatif",
      date: "2026-05-15",
      source: "Booking.com",
      tags: ["Clim Bruyante", "Attente Service", "Piscine"],
    },
    {
      id: "FB-006",
      author: "Aissatou Fall",
      roomNumber: "109",
      hotel: "Nema Kadior",
      rating: 3,
      comment: "Chambre agréable mais l'eau de la douche n'était pas assez chaude le premier matin. La cuisine par contre est excellente et très copieuse.",
      sentiment: "neutre",
      date: "2026-05-12",
      source: "Direct Checkout",
      tags: ["Eau Tiède", "Cuisine Copieuse"],
    }
  ]);

  // Form states for checking out guest feedback simulator
  const [showAddFeedbackModal, setShowAddFeedbackModal] = useState(false);
  const [newAuthor, setNewAuthor] = useState('');
  const [newRoom, setNewRoom] = useState('');
  const [newRating, setNewRating] = useState<number>(5);
  const [newComment, setNewComment] = useState('');
  const [newSource, setNewSource] = useState<'Booking.com' | 'Expedia' | 'TripAdvisor' | 'Google Reviews' | 'Direct Checkout'>('Direct Checkout');
  const [newTagsInput, setNewTagsInput] = useState('');
  const [newTags, setNewTags] = useState<string[]>([]);

  // Response simulation state
  const [replyingFeedbackId, setReplyingFeedbackId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  // Filtering configurations
  const [sentimentFilter, setSentimentFilter] = useState<string>('Tous');
  const [sourceFilter, setSourceFilter] = useState<string>('Tous');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Ready To Use Hospitality Templates (Téranga Replies)
  const TérangaTemplates = [
    {
      id: "temp-merci",
      title: "Remerciements standard",
      text: "Chère {client}, un grand merci pour votre présence et votre avis élogieux ! Notre équipe de la Téranga travaille quotidiennement pour vous offrir de merveilleux moments sous le soleil du Sénégal. Au plaisir !"
    },
    {
      id: "temp-regrets",
      title: "Excuses climatisation/service",
      text: "Cher/Chère {client}, nous sommes désolés pour ce désagrément de climatisation ou de lenteur opérationnelle. Nous avons immédiatement notifié nos équipes techniques et de restauration pour corriger ce point. Merci de nous aider à nous améliorer."
    },
    {
      id: "temp-eco-wifi",
      title: "Fidélité déconnexion nature",
      text: "Cher/Chère {client}, nous vous remercions d'avoir choisi notre éco-lodge. La nature et la faune sauvage sont prédominantes, entraînant parfois de légers aléas de réseau. Nous espérons vous revoir pour une nouvelle cure zen."
    }
  ];

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Select predefined template and format client name automatically
  const handleSelectTemplate = (templateId: string, clientName: string) => {
    const template = TérangaTemplates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      const replaced = template.text.replace('{client}', clientName);
      setReplyText(replaced);
    }
  };

  // Submit official reply on feedback
  const handleSubmitReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !replyingFeedbackId) return;

    // RBAC Permissions check: Housekeeping can't write replies
    if (currentRole === 'Responsable Ménage') {
      triggerToast("Permissions refusées : La réponse officielle aux clients exige l'habilitation Réception ou Direction.");
      return;
    }

    setFeedbacks(prev => prev.map(f => {
      if (f.id === replyingFeedbackId) {
        onAddNotification(
          "Réponse client publiée",
          `Une réponse officielle a été rédigée pour l'avis de ${f.author} (${f.hotel}).`,
          'info'
        );
        return {
          ...f,
          response: replyText.trim(),
          responseDate: new Date().toISOString().split('T')[0]
        };
      }
      return f;
    }));

    setReplyingFeedbackId(null);
    setReplyText('');
    setSelectedTemplate('');
    triggerToast("Réponse enregistrée et transmise au portail d'avis.");
  };

  // Simulate new Direct review submission
  const handleAddFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAuthor.trim() || !newComment.trim()) {
      triggerToast("Veuillez renseigner le nom et le commentaire.");
      return;
    }

    const computedSentiment = newRating >= 4 ? 'positif' : newRating >= 3 ? 'neutre' : 'négatif';
    const newFbId = `FB-${Date.now().toString().slice(-3)}`;
    
    const newFeedback: Feedback = {
      id: newFbId,
      author: newAuthor.trim(),
      roomNumber: newRoom.trim() || undefined,
      hotel: currentHotel as any,
      rating: newRating,
      comment: newComment.trim(),
      sentiment: computedSentiment,
      date: new Date().toISOString().split('T')[0],
      source: newSource,
      tags: newTags.length > 0 ? newTags : ["Avis à chaud"],
    };

    setFeedbacks([newFeedback, ...feedbacks]);
    setShowAddFeedbackModal(false);

    // Clear Form Fields
    setNewAuthor('');
    setNewRoom('');
    setNewComment('');
    setNewRating(5);
    setNewTags([]);

    // Fire PMS alert
    onAddNotification(
      `Nouvel avis client (${newRating}/5)`,
      `Avis "${computedSentiment}" déposé par ${newAuthor.trim()} pour l'hôtel ${currentHotel}.`,
      newRating <= 2 ? 'alerte' : 'info'
    );
    
    triggerToast("Retours client intégrés dans la base de données !");
  };

  // Add extra custom tag on checkout form
  const handleAddTag = () => {
    if (newTagsInput.trim()) {
      setNewTags([...newTags, newTagsInput.trim()]);
      setNewTagsInput('');
    }
  };

  // Delete Feedback entry (Proprietor level restriction)
  const handleDeleteFeedback = (id: string, author: string) => {
    if (currentRole !== 'Propriétaire d\'Hôtel') {
      triggerToast("Permissions RBAC insuffisantes : Seul le propriétaire peut purger l'historique des avis.");
      return;
    }

    if (!confirm(`Confirmez-vous le retrait définitif de l'avis de ${author} ?`)) {
      return;
    }

    setFeedbacks(prev => prev.filter(fb => fb.id !== id));
    triggerToast("Avis effacé avec succès.");
  };

  // Computed computations
  const hotelFeedbacks = useMemo(() => {
    return feedbacks.filter(fb => fb.hotel === currentHotel);
  }, [feedbacks, currentHotel]);

  // General Average compute
  const averageStatistics = useMemo(() => {
    if (hotelFeedbacks.length === 0) return { avg: 0, positivePct: 0, total: 0 };
    const sum = hotelFeedbacks.reduce((acc, f) => acc + f.rating, 0);
    const positiveCount = hotelFeedbacks.filter(f => f.sentiment === 'positif').length;
    return {
      avg: Number((sum / hotelFeedbacks.length).toFixed(1)),
      positivePct: Math.round((positiveCount / hotelFeedbacks.length) * 100),
      total: hotelFeedbacks.length
    };
  }, [hotelFeedbacks]);

  // Rating breakdowns percentages
  const ratingDistribution = useMemo(() => {
    const defaultDist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    if (hotelFeedbacks.length === 0) return defaultDist;
    
    hotelFeedbacks.forEach(f => {
      const rounded = Math.floor(f.rating);
      if (rounded >= 1 && rounded <= 5) {
        defaultDist[rounded as 5 | 4 | 3 | 2 | 1] += 1;
      }
    });

    return defaultDist;
  }, [hotelFeedbacks]);

  // Filter feedbacks for listing
  const filteredFeedbacks = useMemo(() => {
    return hotelFeedbacks.filter(fb => {
      const matchSentiment = sentimentFilter === 'Tous' || fb.sentiment === sentimentFilter;
      const matchSource = sourceFilter === 'Tous' || fb.source === sourceFilter;
      const matchSearch = fb.author.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          fb.comment.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (fb.tags && fb.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())));
      return matchSentiment && matchSource && matchSearch;
    });
  }, [hotelFeedbacks, sentimentFilter, sourceFilter, searchQuery]);

  return (
    <div className="space-y-6 fade-in-up">

      {/* Dynamic Toast alert */}
      {toastMessage && (
        <div className="bg-[#09153D] text-white px-4 py-3.5 rounded-[18px] text-xs font-bold shadow-lg flex items-center gap-2.5 fixed top-6 right-6 z-50 max-w-sm border border-slate-700/60 animate-in fade-in slide-in-from-top-3">
          <Sparkles className="w-4 h-4 text-orange-400 shrink-0" />
          <span className="leading-snug text-left text-slate-100">{toastMessage}</span>
        </div>
      )}

      {/* TOP HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-left">
          <h2 className="text-2xl font-black text-[#09153D] tracking-tight font-sans">Retours Clients & Satisfaction</h2>
          <p className="text-xs text-slate-400 font-medium font-sans">Surveillance de l'e-réputation, sentiment général, et gestion des réponses directes des clients de l'hôtel {currentHotel}</p>
        </div>

        <button
          onClick={() => setShowAddFeedbackModal(true)}
          className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs px-4 py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-orange-600/10 self-start md:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Simuler Avis Départ (Checkout)</span>
        </button>
      </div>

      {/* CORE STATS BANNER */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total feedback count */}
        <div className="bg-white p-4.5 rounded-[20px] border border-slate-100 shadow-sm text-left flex items-center justify-between">
          <div>
            <span className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest block">Volume Avis</span>
            <span className="text-2xl font-black text-[#09153D] font-mono block mt-1">
              {averageStatistics.total} Retours
            </span>
            <span className="text-[10px] text-slate-450 font-semibold">rattachés à {currentHotel}</span>
          </div>
          <div className="w-11 h-11 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
            <MessageSquare className="w-5.5 h-5.5" />
          </div>
        </div>

        {/* Average Rating Score */}
        <div className="bg-white p-4.5 rounded-[20px] border border-slate-100 shadow-sm text-left flex items-center justify-between">
          <div>
            <span className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest block">Satisfaction Globale</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black text-[#09153D] font-mono">{averageStatistics.avg}</span>
              <span className="text-xs font-bold text-slate-400">/ 5</span>
            </div>
            
            <div className="flex items-center gap-0.5 mt-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star 
                  key={s} 
                  className={`w-3 h-3 ${s <= Math.round(averageStatistics.avg) ? 'text-amber-500 fill-amber-500' : 'text-slate-200'}`} 
                />
              ))}
            </div>
          </div>
          <div className="w-11 h-11 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-mono font-black text-sm select-none">
            ★
          </div>
        </div>

        {/* Optimism / Sentiment Score Ratio */}
        <div className="bg-white p-4.5 rounded-[20px] border border-slate-100 shadow-sm text-left flex items-center justify-between">
          <div>
            <span className="text-[9.5px] font-extrabold text-emerald-650 uppercase tracking-widest block">Ratio Sentiment Positif</span>
            <span className="text-2xl font-black text-emerald-600 font-mono block mt-1">
              {averageStatistics.positivePct}%
            </span>
            <span className="text-[10px] text-slate-450 font-medium">Recommandations ensoleillées</span>
          </div>
          <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <Smile className="w-5.5 h-5.5" />
          </div>
        </div>

        {/* Alerts / Responses pending */}
        <div className="bg-white p-4.5 rounded-[20px] border border-slate-100 shadow-sm text-left flex items-center justify-between">
          <div>
            <span className="text-[9.5px] font-extrabold text-rose-650 uppercase tracking-widest block">Avis non répondus</span>
            <span className="text-2xl font-black text-rose-600 font-mono block mt-1">
              {hotelFeedbacks.filter(f => !f.response).length} En Attente
            </span>
            <span className="text-[10px] text-slate-450 font-semibold uppercase tracking-tight">À traiter en priorité</span>
          </div>
          <div className="w-11 h-11 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-5.5 h-5.5" />
          </div>
        </div>

      </div>

      {/* FILTERING AND SEARCH UTILITY BAR */}
      <div className="bg-white p-4 rounded-[22px] border border-slate-100 shadow-sm flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 select-none">
        
        {/* Left Side: Search inputs */}
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Rechercher par auteur, mots-clés de retours clients (ex: climatisation)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50/70 border border-slate-150 py-2.5 pl-10 pr-4 rounded-xl text-xs font-medium focus:none focus:outline-none focus:ring-1 focus:ring-orange-500/50"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        </div>

        {/* Right filters row */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Sentiment category selection */}
          <div className="flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">Humeur :</span>
            <select
              value={sentimentFilter}
              onChange={(e) => setSentimentFilter(e.target.value)}
              className="bg-slate-50 text-[#09153D] border border-slate-150 text-[11px] font-bold py-1.5 px-2.5 rounded-lg focus:outline-none cursor-pointer"
            >
              <option value="Tous">Tous Sentiments</option>
              <option value="positif">Positif (4-5 ★)</option>
              <option value="neutre">Neutre (3 ★)</option>
              <option value="négatif">Négatif (1-2 ★)</option>
            </select>
          </div>

          {/* Source booking origin selection */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">Source :</span>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="bg-slate-50 text-[#09153D] border border-slate-150 text-[11px] font-bold py-1.5 px-2.5 rounded-lg focus:outline-none cursor-pointer"
            >
              <option value="Tous">Toutes Plateformes</option>
              <option value="Booking.com">Booking.com</option>
              <option value="Expedia">Expedia</option>
              <option value="TripAdvisor">TripAdvisor</option>
              <option value="Google Reviews">Google Reviews</option>
              <option value="Direct Checkout">Direct Checkout</option>
            </select>
          </div>

        </div>

      </div>

      {/* RE-PUTATION MAIN GRID CONTROLLER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Feedbacks Feed Stream (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 text-left">
            <p className="text-xs font-black text-[#09153D] uppercase tracking-wide">
              {filteredFeedbacks.length} Retours filtrés pour {currentHotel}
            </p>
            <span className="text-[10.5px] text-slate-400 font-mono">Téranga Realtime Review Center</span>
          </div>

          {filteredFeedbacks.length === 0 ? (
            <div className="bg-white rounded-[24px] border border-slate-100 p-16 text-center text-slate-450 italic text-xs font-semibold">
              Aucun avis trouvé correspondant à vos filtres à {currentHotel}.
            </div>
          ) : (
            filteredFeedbacks.map((fb) => (
              <div 
                key={fb.id} 
                className="bg-white rounded-[24px] border border-slate-100/80 p-5 font-sans relative text-left hover:shadow-xs transition-shadow space-y-4"
              >
                
                {/* Header segment card info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  
                  <div className="flex items-center gap-3 select-none">
                    
                    {/* Generative Avatar layout using Initials */}
                    <div className="w-10 h-10 rounded-full bg-slate-100 border text-xs font-black text-[#09153D] flex items-center justify-center font-mono uppercase tracking-tight shrink-0">
                      {fb.author.split(' ').map(part => part[0]).join('').slice(0, 2)}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-sm leading-none">{fb.author}</span>
                        {fb.roomNumber && (
                          <span className="bg-slate-50 border text-[9px] text-[#09153D] px-1.5 py-0.5 rounded font-mono font-black" title="Chambre occupée">
                            Ch. {fb.roomNumber}
                          </span>
                        )}
                      </div>

                      <p className="text-[10px] text-slate-400 font-semibold mt-1">
                        Avis publié le {fb.date} • Plateforme : <span className="font-bold text-[#09153D]">{fb.source}</span>
                      </p>
                    </div>

                  </div>

                  {/* Rating block & sentiment badge */}
                  <div className="flex items-center gap-2 self-start sm:self-auto select-none">
                    
                    {/* Star score display */}
                    <div className="flex items-center gap-0.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 font-mono text-xs font-black text-[#09153D]">
                      <span className="text-amber-500 mr-1">★</span>
                      <span>{fb.rating}</span>
                      <span className="text-[#09153D]/40">/5</span>
                    </div>

                    {/* Mood classification */}
                    <span className={`inline-flex items-center gap-1 text-[9.5px] font-black uppercase px-2.5 py-1 rounded-lg ${
                      fb.sentiment === 'positif' ? 'bg-emerald-50 text-emerald-600' :
                      fb.sentiment === 'neutre' ? 'bg-amber-50 text-amber-600' :
                      'bg-rose-50 text-rose-600'
                    }`}>
                      {fb.sentiment === 'positif' ? <Smile className="w-3.5 h-3.5" /> : 
                       fb.sentiment === 'neutre' ? <Meh className="w-3.5 h-3.5" /> : 
                       <Frown className="w-3.5 h-3.5" />}
                      <span>{fb.sentiment}</span>
                    </span>

                  </div>

                </div>

                {/* Comment Text block */}
                <p className="text-slate-600 text-xs leading-relaxed font-semibold italic pl-1 text-left">
                  "{fb.comment}"
                </p>

                {/* Tags associated */}
                {fb.tags && fb.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pl-1 select-none">
                    {fb.tags.map((tag, idx) => (
                      <span key={idx} className="bg-slate-50 hover:bg-slate-100/80 border text-[9.5px] font-bold text-slate-500 px-2.5 py-0.5 rounded-md transition-colors">
                        # {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Existing Reply if already answered */}
                {fb.response ? (
                  <div className="bg-[#09153D]/5 rounded-2xl border border-slate-100 p-4 relative mt-3 animate-in fade-in duration-350">
                    <div className="flex items-start gap-2.5 text-xs">
                      
                      <div className="p-1.5 bg-orange-100 text-orange-700 rounded-lg shrink-0 mt-0.5">
                        <Reply className="w-3.5 h-3.5" />
                      </div>

                      <div className="space-y-1.5 text-left">
                        <span className="text-[10px] font-bold text-[#09153D]/70 uppercase tracking-widest block">
                          Réponse officielle d'établissement • {fb.responseDate || "Récemment"}
                        </span>
                        
                        <p className="font-semibold text-slate-700 leading-relaxed text-[11.5px]">
                          {fb.response}
                        </p>

                        <div className="flex gap-2.5 pt-1 text-[10px] font-bold text-[#09153D]/50 select-none">
                          <span>Signé : Mamadou Diallo (Direction client)</span>
                        </div>
                      </div>

                    </div>
                  </div>
                ) : (
                  // Conditional response block trigger
                  currentRole !== 'Responsable Ménage' && (
                    <div className="pt-3 border-t border-slate-50 flex items-center justify-between text-xs select-none">
                      
                      <span className="text-[10px] text-amber-600 font-extrabold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>Ce client attend un éclairage de votre équipe</span>
                      </span>

                      <button
                        onClick={() => {
                          setReplyText('');
                          setSelectedTemplate('');
                          setReplyingFeedbackId(fb.id);
                        }}
                        className="bg-[#09153D] hover:bg-[#112354] text-white text-[10.5px] font-extrabold px-3 py-1.5 rounded-xl cursor-pointer transition-colors"
                      >
                        Rédiger la Réponse Téranga
                      </button>

                    </div>
                  )
                )}

                {/* Admin controls row (Propriétaire Only) */}
                {currentRole === 'Propriétaire d\'Hôtel' && (
                  <div className="absolute top-4 right-4 sm:static sm:flex sm:justify-end sm:pt-2">
                    <button
                      onClick={() => handleDeleteFeedback(fb.id, fb.author)}
                      className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 cursor-pointer"
                      title="Archiver cet avis"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  </div>
                )}

              </div>
            ))
          )}

        </div>

        {/* RIGHT COLUMN: DISTRIBUTION STATS & ACTIVE COMPOSER (4 Cols) */}
        <div className="lg:col-span-4 space-y-4 text-left">
          
          {/* 1. SECTOR RATING BREAKDOWN (Aesthetic custom SVG Distribution bar) */}
          <div className="bg-white rounded-[24px] border border-slate-100 p-5 shadow-sm space-y-4">
            
            <div className="border-b pb-3.5">
              <h3 className="font-extrabold text-[#09153D] text-sm leading-tight">Distribution des Étoiles</h3>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Répartition dynamique des notes cumulées de {currentHotel}</p>
            </div>

            {/* Custom bar list */}
            <div className="space-y-2 select-none">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = ratingDistribution[stars as 5 | 4 | 3 | 2 | 1] || 0;
                const total = hotelFeedbacks.length || 1;
                const percentage = Math.round((count / total) * 100);

                return (
                  <div key={stars} className="flex items-center gap-3.5 text-xs">
                    
                    {/* Stars count indicator */}
                    <span className="w-10 font-mono font-bold text-slate-400 flex items-center justify-end shrink-0 gap-1 text-right">
                      {stars} ★
                    </span>

                    {/* Bar graphic */}
                    <div className="flex-grow h-2.5 bg-slate-50 border border-slate-100 rounded-full overflow-hidden relative">
                      <div 
                        className={`h-full transition-all duration-350 ${
                          stars >= 4 ? 'bg-emerald-500' : stars === 3 ? 'bg-amber-400' : 'bg-red-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>

                    {/* Numeric breakdown percent of total */}
                    <span className="w-12 font-mono font-bold text-[#09153D]/70 text-right shrink-0">
                      {count} ({percentage}%)
                    </span>

                  </div>
                );
              })}
            </div>

            <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 text-[10.5px] leading-relaxed text-slate-500 font-medium">
              💡 <strong>Recommandation :</strong> {averageStatistics.positivePct >= 80 
                ? "L'hôtel bénéficie d'une excellente réputation. Pensez à relancer les clients pour collecter des brevets de mérite."
                : "Des points de frictions (clim, service bar) pèsent sur la satisfaction Générale. Des correctifs d'infrastructure s'imposent."
              }
            </div>

          </div>

          {/* 2. FEEDBACKS CRITERION PIE CHEATS */}
          <div className="bg-white rounded-[24px] border border-slate-100 p-5 shadow-sm space-y-4">
            
            <div className="border-b pb-3">
              <h3 className="font-extrabold text-[#09153D] text-sm">Satisfaction par Critères</h3>
              <p className="text-[10.5px] text-slate-400 font-medium mt-0.5">Évaluation des thématiques clés d'après les retours récents</p>
            </div>

            <div className="space-y-4">
              
              {/* Criterion 1: Service */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Qualité de l'Accueil & Téranga</span>
                  <span className="text-emerald-600">4.8 / 5</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[96%]"></div>
                </div>
              </div>

              {/* Criterion 2: Cleanliness */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-705 text-slate-700">
                  <span>Propreté & Service Ménage</span>
                  <span className="text-emerald-600">4.5 / 5</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[90%]"></div>
                </div>
              </div>

              {/* Criterion 3: Beach & Comfort */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Chambres & Confort Technique</span>
                  <span className="text-amber-600">3.6 / 5</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 w-[72%]"></div>
                </div>
              </div>

              {/* Criterion 4: Food & Catering */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-705 text-slate-700">
                  <span>Restauration, Grillades & Bar</span>
                  <span className="text-emerald-600">4.2 / 5</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[84%]"></div>
                </div>
              </div>

            </div>

          </div>

          {/* 3. ACTIVE REPLY DOCK MODAL OR DRAWER BOX (Only shows when replyingFeedbackId exists) */}
          {replyingFeedbackId && (
            <div className="bg-[#09153D] text-white rounded-[24px] border border-slate-700 p-5 shadow-lg space-y-4 animate-in slide-in-from-bottom-2 duration-200">
              
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Reply className="w-4 h-4 text-orange-400" />
                  <span className="text-xs font-black uppercase tracking-wider">Répondre à {feedbacks.find(f => f.id === replyingFeedbackId)?.author}</span>
                </div>
                <button 
                  onClick={() => setReplyingFeedbackId(null)}
                  className="text-white/60 hover:text-white bg-white/10 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Template selector triggers */}
              <div className="space-y-2">
                <label className="block text-[8.5px] font-black text-slate-300 uppercase tracking-widest leading-none">
                  Modèles de Courtoisie Téranga :
                </label>
                
                <div className="flex flex-col gap-1.5">
                  {TérangaTemplates.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleSelectTemplate(t.id, feedbacks.find(f => f.id === replyingFeedbackId)?.author || 'Client')}
                      className={`text-[9.5px] font-bold px-3 py-2 rounded-lg text-left transition-colors border ${
                        selectedTemplate === t.id 
                          ? 'bg-orange-600 text-white border-orange-500' 
                          : 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/5'
                      }`}
                    >
                      ✓ {t.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Response composer Form */}
              <form onSubmit={handleSubmitReply} className="space-y-3 pt-1">
                
                <textarea
                  rows={4}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Inscrivez votre message de réponse de la Téranga ici..."
                  className="w-full bg-white/10 border border-white/10 rounded-xl p-3 text-xs font-medium text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                  required
                />

                <div className="flex items-center justify-end gap-2 text-xs select-none">
                  <button
                    type="button"
                    onClick={() => setReplyingFeedbackId(null)}
                    className="px-3.5 py-2 hover:bg-white/10 text-xs font-bold text-slate-300 rounded-lg"
                  >
                    Annuler
                  </button>
                  
                  <button
                    type="submit"
                    className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Envoyer la Réponse</span>
                  </button>
                </div>

              </form>

            </div>
          )}

        </div>

      </div>

      {/* SIMULATE GUEST DEPARTURE FEEDBACK MODAL */}
      {showAddFeedbackModal && (
        <div className="fixed inset-0 z-50 bg-[#09153D]/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] border border-slate-150/80 shadow-2xl max-w-md w-full overflow-hidden text-left animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-orange-600 to-amber-500 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Users className="w-5.5 h-5.5 text-white" />
                <div>
                  <h3 className="font-extrabold text-white text-md tracking-tight">Simulateur d'Avis au Départ</h3>
                  <p className="text-[10px] text-orange-100 font-medium">Checkout direct d'un voyageur de l'hôtel {currentHotel}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddFeedbackModal(false)}
                className="text-white hover:text-orange-200 cursor-pointer text-sm font-bold bg-white/10 w-7 h-7 rounded-full flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Form body */}
            <form onSubmit={handleAddFeedbackSubmit} className="p-6 space-y-4">
              
              {/* Author name & Room number */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Nom Complet du Voyageur :
                  </label>
                  <input
                    type="text"
                    placeholder="Ex : Saliou Mbacké"
                    value={newAuthor}
                    onChange={(e) => setNewAuthor(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold p-3 rounded-xl focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Numéro de Chambre :
                  </label>
                  <input
                    type="text"
                    placeholder="Ex : 204"
                    value={newRoom}
                    onChange={(e) => setNewRoom(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold p-3 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              {/* Source Selector & Hotel name readout */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 font-sans">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Canal d'Avis Sélectionné :
                  </label>
                  <select
                    value={newSource}
                    onChange={(e) => setNewSource(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs font-bold p-3 rounded-xl focus:outline-none cursor-pointer"
                  >
                    <option value="Direct Checkout">Direct Checkout (Au Comptoir)</option>
                    <option value="Booking.com">Booking.com</option>
                    <option value="Expedia">Expedia</option>
                    <option value="TripAdvisor">TripAdvisor</option>
                    <option value="Google Reviews">Google Reviews</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-orange-650 uppercase tracking-widest">
                    Hôtel Émetteur :
                  </label>
                  <div className="bg-slate-50 text-[#09153D] font-mono font-black text-xs p-3 rounded-xl border border-slate-150">
                    🏢 {currentHotel}
                  </div>
                </div>
              </div>

              {/* Star Rating Select slider */}
              <div className="space-y-2">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  Note attribuée par le client : {newRating} ★
                </label>
                
                <div className="flex items-center gap-2 select-none">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setNewRating(s)}
                      className={`flex-1 py-3 text-xs font-black rounded-xl border transition-all cursor-pointer ${
                        newRating >= s 
                          ? 'bg-amber-500 border-amber-500 text-white shadow-xs' 
                          : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      {s} ★ {s === 5 ? 'Parfait' : s === 1 ? 'Très Déçu' : ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment of traveler */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  Commentaire explicatif de satisfaction :
                </label>
                <textarea
                  rows={3}
                  placeholder="Ex : Excellent accueil à la réception, la piscine était parfaite pour les enfants mais le service au restaurant de plage mériterait plus de rapidité..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold p-3 rounded-xl focus:outline-none text-slate-800"
                  required
                />
              </div>

              {/* Tags Input */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  Balises / Thématiques associées :
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ex : Piscine, Climatisation, Accès Plage..."
                    value={newTagsInput}
                    onChange={(e) => setNewTagsInput(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 text-xs p-3 rounded-xl focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="bg-[#09153D] hover:bg-[#112354] text-white font-extrabold text-xs px-4 rounded-xl cursor-pointer"
                  >
                    Ajouter
                  </button>
                </div>

                {/* Tags preview */}
                {newTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1.5 select-none">
                    {newTags.map((t, idx) => (
                      <span key={idx} className="bg-slate-50 border border-slate-150 text-[9.5px] font-bold text-[#09153D] px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                        ✓ {t}
                        <button
                          type="button"
                          onClick={() => setNewTags(newTags.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-slate-600 font-bold ml-1 cursor-pointer animate-in zoom-in-95 duration-75"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Form actions footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3.5 select-none">
                <button
                  type="button"
                  onClick={() => setShowAddFeedbackModal(false)}
                  className="px-4.5 py-3 hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl cursor-pointer"
                >
                  Annuler l'Avis
                </button>
                <button
                  type="submit"
                  className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs px-5 py-3 rounded-xl cursor-pointer shadow-md shadow-orange-550/10"
                >
                  Valider le Checkout & Notifier
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
