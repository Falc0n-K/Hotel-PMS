/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  Search, 
  Users, 
  User, 
  Clock, 
  Building2, 
  CheckCheck, 
  Sparkles, 
  Filter, 
  CornerDownRight, 
  Plus,
  Compass,
  Bell,
  CheckCircle2,
  Trash2,
  ArrowRight
} from 'lucide-react';
import { RBACRole } from '../types';

interface MessagesInboxProps {
  currentHotel: string;
  currentRole: RBACRole;
  onAddNotification: (title: string, message: string, type: 'réservation' | 'paiement' | 'alerte' | 'info') => void;
}

export interface ChatThread {
  id: string;
  type: 'guest' | 'staff';
  title: string; // Name of guest or group
  subtitle?: string; // Room number or department
  avatarInitials: string;
  hotel: 'Royal Saly' | 'Nema Kadior' | 'Les Pélicans du Saloum';
  unreadCount: number;
  lastMessageText: string;
  lastMessageTime: string;
  status: 'online' | 'offline' | 'away';
  messages: {
    id: string;
    sender: string;
    senderRole?: string;
    text: string;
    time: string;
    isSelf: boolean;
  }[];
}

export default function MessagesInbox({
  currentHotel,
  currentRole,
  onAddNotification
}: MessagesInboxProps) {

  // Initial threads and chats dataset
  const [threads, setThreads] = useState<ChatThread[]>([
    {
      id: "CH-001",
      type: "guest",
      title: "Sophie Lecomte",
      subtitle: "Bungalow Ocean 405",
      avatarInitials: "SL",
      hotel: "Royal Saly",
      unreadCount: 1,
      lastMessageText: "Serait-il possible d'avoir deux serviettes supplémentaires pour la plage s'il vous plaît ?",
      lastMessageTime: "09:42",
      status: "online",
      messages: [
        {
          id: "m1",
          sender: "Sophie Lecomte",
          text: "Bonjour Saliou ! Notre installation s'est très bien déroulée. Le coucher de soleil était somptueux.",
          time: "Hier, 18:30",
          isSelf: false
        },
        {
          id: "m2",
          sender: "Awa Ndiaye",
          senderRole: "Réception",
          text: "Merveilleux Sophie ! Profitez bien de votre premier réveil face à l'océan.",
          time: "Hier, 19:00",
          isSelf: true
        },
        {
          id: "m3",
          sender: "Sophie Lecomte",
          text: "Serait-il possible d'avoir deux serviettes supplémentaires pour la plage s'il vous plaît ?",
          time: "09:42",
          isSelf: false
        }
      ]
    },
    {
      id: "CH-002",
      type: "staff",
      title: "Ménage & Logistique",
      subtitle: "Groupe Interne",
      avatarInitials: "ML",
      hotel: "Royal Saly",
      unreadCount: 0,
      lastMessageText: "Chambre 212 prête pour l'inspection des 11h.",
      lastMessageTime: "09:12",
      status: "online",
      messages: [
        {
          id: "m4",
          sender: "Youssou Ndour Jr",
          senderRole: "Ménage",
          text: "J'attaque le couloir ouest et les bungalows fleuve.",
          time: "08:15",
          isSelf: false
        },
        {
          id: "m5",
          sender: "Fatou Kiné Diop",
          senderRole: "Gouvernante",
          text: "Parfait Youssou. Fais bien attention aux finitions de la salle de bain.",
          time: "08:45",
          isSelf: false
        },
        {
          id: "m6",
          sender: "Youssou Ndour Jr",
          senderRole: "Ménage",
          text: "Chambre 212 prête pour l'inspection des 11h.",
          time: "09:12",
          isSelf: false
        }
      ]
    },
    {
      id: "CH-003",
      type: "guest",
      title: "Thomas Müller",
      subtitle: "Chambre 212",
      avatarInitials: "TM",
      hotel: "Royal Saly",
      unreadCount: 0,
      lastMessageText: "Merci pour les conseils sur la réserve de Bandia, superbe sortie !",
      lastMessageTime: "Hier",
      status: "away",
      messages: [
        {
          id: "m7",
          sender: "Thomas Müller",
          text: "Des recommandations pour observer les animaux ?",
          time: "Hier, 14:10",
          isSelf: false
        },
        {
          id: "m8",
          sender: "Mamadou Diallo",
          senderRole: "Direction",
          text: "Cher Thomas, la Réserve de Bandia à 30 minutes de Saly est fantastique pour apercevoir rhinocéros, girafes et zèbres dans leur élément.",
          time: "Hier, 14:25",
          isSelf: true
        },
        {
          id: "m9",
          sender: "Thomas Müller",
          text: "Merci pour les conseils sur la réserve de Bandia, superbe sortie !",
          time: "Hier, 19:40",
          isSelf: false
        }
      ]
    },
    {
      id: "CH-004",
      type: "guest",
      title: "Abdoulaye Diop",
      subtitle: "Chambre 118",
      avatarInitials: "AD",
      hotel: "Nema Kadior",
      unreadCount: 2,
      lastMessageText: "La navette aéroport de 14h est-elle bien confirmée ?",
      lastMessageTime: "08:30",
      status: "online",
      messages: [
        {
          id: "m10",
          sender: "Abdoulaye Diop",
          text: "Bonjour, je dois prendre mon vol pour Dakar cet après-midi.",
          time: "08:25",
          isSelf: false
        },
        {
          id: "m11",
          sender: "Abdoulaye Diop",
          text: "La navette aéroport de 14h est-elle bien confirmée ?",
          time: "08:30",
          isSelf: false
        }
      ]
    },
    {
      id: "CH-005",
      type: "staff",
      title: "Maintenance & Technique",
      subtitle: "Groupe Interne",
      avatarInitials: "MT",
      hotel: "Nema Kadior",
      unreadCount: 0,
      lastMessageText: "Climatisation réparée dans la suite 105.",
      lastMessageTime: "07:50",
      status: "online",
      messages: [
        {
          id: "m12",
          sender: "Samba Sow",
          senderRole: "Technique",
          text: "Climatisation réparée dans la suite 105. C'était un simple problème de condenseur encrassé.",
          time: "07:50",
          isSelf: false
        }
      ]
    },
    {
      id: "CH-006",
      type: "guest",
      title: "Chantal Giraud",
      subtitle: "Bungalow Fleuve 302",
      avatarInitials: "CG",
      hotel: "Les Pélicans du Saloum",
      unreadCount: 0,
      lastMessageText: "Le wifi fonctionne à nouveau parfaitement pour mes mails professionnels, merci.",
      lastMessageTime: "21 Mai",
      status: "offline",
      messages: [
        {
          id: "m13",
          sender: "Chantal Giraud",
          text: "Le wifi est très instable ce matin près des pélicans.",
          time: "20 Mai, 11:15",
          isSelf: false
        },
        {
          id: "m14",
          sender: "Ousmane Fall",
          senderRole: "Admin",
          text: "Chère Chantal, nos techniciens ont redémarré l'antenne satellite du fleuve pour booster la couverture. Pouvez-vous réitérer ?",
          time: "20 Mai, 12:00",
          isSelf: true
        },
        {
          id: "m15",
          sender: "Chantal Giraud",
          text: "Le wifi fonctionne à nouveau parfaitement pour mes mails professionnels, merci.",
          time: "20 Mai, 14:12",
          isSelf: false
        }
      ]
    }
  ]);

  const [activeThreadId, setActiveThreadId] = useState<string>("CH-001");
  const [filterType, setFilterType] = useState<'all' | 'guest' | 'staff'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Suggested fast answers / hospitality phrases
  const fastAnswers = [
    "La Téranga sénégalaise est à votre service !",
    "Absolument, nous nous en occupons immédiatement.",
    "Un membre de notre équipe technique a été dépêché vers votre chambre.",
    "Bonjour, à quelle heure seriez-vous disponible pour cette activité ?"
  ];

  // Scroll to bottom of current messages
  const messageEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThreadId, threads]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Switch role display name
  const getUserSenderRole = () => {
    switch (currentRole) {
      case 'Propriétaire d\'Hôtel': return 'Propriétaire';
      case 'Directeur Financier': return 'Direction';
      case 'Réceptionniste (Front Desk)': return 'Réception';
      case 'Responsable Ménage': return 'Ménage';
      default: return 'Staff';
    }
  };

  // Filter threads for current active hotel
  const hotelThreads = useMemo(() => {
    return threads.filter(t => t.hotel === currentHotel);
  }, [threads, currentHotel]);

  // Compute final filtered listed chats
  const filteredThreads = useMemo(() => {
    return hotelThreads.filter(t => {
      const matchType = filterType === 'all' || t.type === filterType;
      const matchSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (t.subtitle && t.subtitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          t.lastMessageText.toLowerCase().includes(searchQuery.toLowerCase());
      return matchType && matchSearch;
    });
  }, [hotelThreads, filterType, searchQuery]);

  // Handle active thread selection (clear unread count simultaneously)
  const handleSelectThread = (threadId: string) => {
    setActiveThreadId(threadId);
    setThreads(prev => prev.map(t => {
      if (t.id === threadId) {
        return { ...t, unreadCount: 0 };
      }
      return t;
    }));
  };

  // Send message
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageInput.trim()) return;

    const loggedUserRole = getUserSenderRole();
    const newMsgId = `MSG-${Date.now().toString().slice(-4)}`;
    const nowTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    setThreads(prev => prev.map(t => {
      if (t.id === activeThreadId) {
        const updatedMessages = [
          ...t.messages,
          {
            id: newMsgId,
            sender: "Vous",
            senderRole: loggedUserRole,
            text: messageInput.trim(),
            time: nowTime,
            isSelf: true
          }
        ];
        return {
          ...t,
          lastMessageText: messageInput.trim(),
          lastMessageTime: nowTime,
          messages: updatedMessages
        };
      }
      return t;
    }));

    // Trigger alert or notification if chatting with a guest
    const currentThread = threads.find(t => t.id === activeThreadId);
    if (currentThread && currentThread.type === 'guest') {
      onAddNotification(
        "Message envoyé au voyageur",
        `Réponse de la Téranga transmise à ${currentThread.title} (${currentThread.subtitle || "Room"}).`,
        'info'
      );
    }

    setMessageInput('');
    triggerToast("Message envoyé avec succès.");
  };

  // Apply quick answer to composer
  const handleApplyFastAnswer = (text: string) => {
    setMessageInput(text);
  };

  // Delete/Archive entire thread (Proprietor level)
  const handleDeleteThread = (threadId: string, title: string) => {
    if (currentRole !== 'Propriétaire d\'Hôtel') {
      triggerToast("Permissions RBAC insuffisantes : Seul le propriétaire peut purger l'historique des discussions.");
      return;
    }

    if (!confirm(`Confirmez-vous la fermeture et l'archivage définitif du fil de discussion de ${title} ?`)) {
      return;
    }

    setThreads(prev => prev.filter(t => t.id !== threadId));
    if (activeThreadId === threadId) {
      const remaining = threads.filter(t => t.id !== threadId && t.hotel === currentHotel);
      if (remaining.length > 0) {
        setActiveThreadId(remaining[0].id);
      }
    }
    triggerToast("Discussions archivées.");
  };

  // Simulate Guest text incoming trigger
  const handleSimulateGuestResponse = () => {
    const activeThread = threads.find(t => t.id === activeThreadId);
    if (!activeThread) return;

    const repliesList = [
      "Parfait, merci pour votre réactivité légendaire !",
      "D'accord, je serai à la réception dans 10 minutes.",
      "Merci pour la confirmation. La Téranga sénégalaise au top !",
      "Merci beaucoup !",
    ];
    const randomReply = repliesList[Math.floor(Math.random() * repliesList.length)];
    const nowTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    setThreads(prev => prev.map(t => {
      if (t.id === activeThreadId) {
        return {
          ...t,
          unreadCount: 0,
          lastMessageText: randomReply,
          lastMessageTime: nowTime,
          messages: [
            ...t.messages,
            {
              id: `SIM-${Date.now().toString().slice(-3)}`,
              sender: t.title,
              text: randomReply,
              time: nowTime,
              isSelf: false
            }
          ]
        };
      }
      return t;
    }));

    onAddNotification(
      `Nouveau message de ${activeThread.title}`,
      `"${randomReply}" (${activeThread.subtitle || "Room"}).`,
      'info'
    );

    triggerToast(`Simulation: Nouveau message reçu de ${activeThread.title}`);
  };

  const activeThread = hotelThreads.find(t => t.id === activeThreadId) || (hotelThreads.length > 0 ? hotelThreads[0] : null);

  return (
    <div className="space-y-6 fade-in-up">

      {/* TOP HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-left">
          <h2 className="text-2xl font-black text-[#09153D] tracking-tight font-sans">Messagerie Instantanée</h2>
          <p className="text-xs text-slate-400 font-medium font-sans">
            Canaux de service client directs, alertes opérationnelles inter-services de l'établissement {currentHotel}
          </p>
        </div>

        {activeThread && (
          <button
            onClick={handleSimulateGuestResponse}
            className="bg-orange-650 hover:bg-orange-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-orange-600/10"
          >
            <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Simuler Message Entrant ({activeThread.title})</span>
          </button>
        )}
      </div>

      {/* CORE WORKSPACE CORES GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch h-[calc(100vh-270px)] min-h-[580px]">

        {/* LEFT COLUMN: Threads lists (4 Cols) */}
        <div className="lg:col-span-4 bg-white rounded-[24px] border border-slate-105 shadow-sm flex flex-col overflow-hidden">
          
          {/* Search and Filters */}
          <div className="p-4 border-b border-slate-100 space-y-3">
            
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Discussions, chambres, équipiers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50/70 border border-slate-155 py-2 pl-9 pr-4 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-orange-500/50"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            {/* Quick classification selectors */}
            <div className="flex bg-slate-55 p-1 rounded-xl text-xs font-black select-none border border-slate-100">
              <button
                onClick={() => setFilterType('all')}
                className={`flex-1 py-1 px-2 rounded-lg transition-colors cursor-pointer ${
                  filterType === 'all' ? 'bg-[#09153D] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Tous
              </button>
              <button
                onClick={() => setFilterType('guest')}
                className={`flex-1 py-1 px-2 rounded-lg transition-colors cursor-pointer ${
                  filterType === 'guest' ? 'bg-[#09153D] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Voyageurs
              </button>
              <button
                onClick={() => setFilterType('staff')}
                className={`flex-1 py-1 px-2 rounded-lg transition-colors cursor-pointer ${
                  filterType === 'staff' ? 'bg-[#09153D] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Interne
              </button>
            </div>

          </div>

          {/* Threads Flow lists */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-50/80 custom-scrollbar">
            {filteredThreads.length === 0 ? (
              <div className="p-12 text-center text-slate-400 italic text-xs font-semibold">
                Aucun canal actif à {currentHotel}.
              </div>
            ) : (
              filteredThreads.map((t) => {
                const isActive = activeThread ? activeThread.id === t.id : false;
                return (
                  <button
                    key={t.id}
                    onClick={() => handleSelectThread(t.id)}
                    className={`w-full p-4 flex gap-3 text-left transition-colors relative cursor-pointer ${
                      isActive ? 'bg-orange-50/40 border-l-4 border-orange-600' : 'hover:bg-slate-50/50'
                    }`}
                  >
                    
                    {/* Avatar structure */}
                    <div className="relative shrink-0 select-none">
                      <div className="w-10 h-10 rounded-full bg-slate-100/90 border border-slate-200 text-xs font-black text-[#09153D] flex items-center justify-center font-mono">
                        {t.avatarInitials}
                      </div>
                      
                      {/* Connection state dot */}
                      <span className={`w-2 h-2 rounded-full border border-white absolute bottom-0.5 right-0.5 ${
                        t.status === 'online' ? 'bg-emerald-500' :
                        t.status === 'away' ? 'bg-amber-500' :
                        'bg-slate-350'
                      }`} />
                    </div>

                    {/* Name message preview info */}
                    <div className="min-w-0 flex-1 space-y-1">
                      
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-slate-900 text-xs block truncate leading-none">
                          {t.title}
                        </span>
                        <span className="text-[9.5px] font-mono font-bold text-slate-400">
                          {t.lastMessageTime}
                        </span>
                      </div>

                      {t.subtitle && (
                        <span className="text-[9.5px] font-black uppercase text-[#09153D]/60 tracking-wider block">
                          {t.subtitle}
                        </span>
                      )}

                      <p className="text-[11px] text-slate-500 font-semibold truncate leading-normal">
                        {t.lastMessageText}
                      </p>

                    </div>

                    {/* Badge unread count */}
                    {t.unreadCount > 0 && (
                      <div className="absolute right-3.5 bottom-3 bg-orange-650 text-white w-4.5 h-4.5 rounded-full text-[9px] font-mono font-black flex items-center justify-center animate-pulse">
                        {t.unreadCount}
                      </div>
                    )}

                  </button>
                );
              })
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Chat box messages (8 Cols) */}
        <div className="lg:col-span-8 bg-white rounded-[24px] border border-slate-105 shadow-sm flex flex-col overflow-hidden">
          {activeThread ? (
            <div className="flex flex-col h-full">
              
              {/* Active Header bar info */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 select-none">
                
                <div className="flex items-center gap-3 text-left">
                  <div className="w-9 h-9 rounded-full bg-orange-100 text-[#09153D] font-mono font-black text-xs flex items-center justify-center">
                    {activeThread.avatarInitials}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-[#09153D] text-sm leading-none">{activeThread.title}</h4>
                    <span className="text-[10px] text-slate-400 font-semibold leading-normal mt-0.5 block">
                      {activeThread.subtitle || "Canal Actif"} • Sénégal Hôtels WhatsApp Suite
                    </span>
                  </div>
                </div>

                {/* Right administrative panel option */}
                {currentRole === 'Propriétaire d\'Hôtel' && (
                  <button
                    onClick={() => handleDeleteThread(activeThread.id, activeThread.title)}
                    className="text-red-500 hover:text-red-700 p-2 rounded hover:bg-red-50 cursor-pointer"
                    title="Archiver ou clore la session"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

              </div>

              {/* Chat conversation area */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/40 custom-scrollbar">
                {activeThread.messages.map((m) => {
                  return (
                    <div 
                      key={m.id} 
                      className={`flex flex-col ${m.isSelf ? 'items-end' : 'items-start'} space-y-1`}
                    >
                      
                      {/* Name tag */}
                      <span className="text-[9.5px] font-bold text-slate-400">
                        {m.sender} {m.senderRole && `(${m.senderRole})`}
                      </span>

                      {/* Bubble message */}
                      <div className={`max-w-[70%] p-3.5 rounded-[18px] text-[11.5px] font-semibold text-left shadow-xs leading-relaxed ${
                        m.isSelf 
                          ? 'bg-[#09153D] text-white rounded-br-none' 
                          : 'bg-white border text-slate-700 rounded-bl-none'
                      }`}>
                        {m.text}
                      </div>

                      {/* Time */}
                      <span className="text-[9px] font-mono font-bold text-slate-400">
                        {m.time}
                      </span>

                    </div>
                  );
                })}
                <div ref={messageEndRef} />
              </div>

              {/* Suggestions row for quick clicking */}
              <div className="border-t border-slate-100 px-4 py-2 bg-slate-50/40 flex items-center gap-2 overflow-x-auto select-none no-scrollbar">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest shrink-0">Réponses types :</span>
                {fastAnswers.map((ans, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleApplyFastAnswer(ans)}
                    className="bg-white hover:bg-slate-100 border text-[10px] text-[#09153D] font-bold px-2.5 py-1 rounded-lg shrink-0 transition-colors cursor-pointer"
                  >
                    {ans}
                  </button>
                ))}
              </div>

              {/* Chat input footer composer */}
              <div className="p-4 border-t border-slate-100 bg-white">
                <form 
                  onSubmit={handleSendMessage}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    placeholder={`Répondre en tant que ${getUserSenderRole()} Sénégal Hôtels...`}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    className="flex-grow bg-slate-50 border border-slate-200 text-xs font-semibold p-3.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                  
                  <button
                    type="submit"
                    className="bg-orange-600 hover:bg-orange-700 text-white w-12 h-12 flex items-center justify-center rounded-xl shrink-0 cursor-pointer transition-colors shadow-md shadow-orange-600/10"
                  >
                    <Send className="w-5 h-5 text-white" />
                  </button>
                </form>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-slate-400 italic text-xs font-semibold">
              Veuillez sélectionner une discussion active dans le flux de gauche.
            </div>
          )}
        </div>

      </div>

      {toastMessage && (
        <div className="bg-[#09153D] text-white px-4 py-3 rounded-2xl text-xs font-bold shadow-lg flex items-center gap-2 fixed bottom-6 right-6 z-50 animate-in fade-in duration-250 border border-slate-700">
          <Sparkles className="w-4 h-4 text-orange-400" />
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
}
