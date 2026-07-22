/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { RBACRole, Room, RoomStatus, Task, BookingSource, PMSNotification, ROLE_CONSOLES_MAPPING } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import MetricCards from './components/MetricCards';
import RevenueChart from './components/RevenueChart';
import OccupancyChart from './components/OccupancyChart';
import RoomGrid from './components/RoomGrid';
import BottomSections from './components/BottomSections';
import HotelsHub from './components/HotelsHub';
import RoomInventory from './components/RoomInventory';
import BookingsDesk from './components/BookingsDesk';
import GuestsCRM from './components/GuestsCRM';
import PaymentsFinance from './components/PaymentsFinance';
import EventVenues from './components/EventVenues';
import ExperiencesMarket from './components/ExperiencesMarket';
import MarketingPackages from './components/MarketingPackages';
import GuestFeedbacks from './components/GuestFeedbacks';
import DeepAnalytics from './components/DeepAnalytics';
import StaffDirectory from './components/StaffDirectory';
import MessagesInbox from './components/MessagesInbox';
import GlobalSettings from './components/GlobalSettings';
import { LockScreen } from './components/Modals';
import ReceptionistDashboard from './components/ReceptionistDashboard';

// Initial state data
import {
  generateRooms,
  bookingSources,
  guestReviews,
  initialTasks,
  initialNotifications
} from './data';
import { Shield, Sparkles, AlertTriangle, KeyRound, Award, Star, Activity, Plus } from 'lucide-react';

export default function App() {
  // Simulator states
  const [currentRole, setCurrentRole] = useState<RBACRole>('Propriétaire d\'Hôtel');
  const [activeConsole, setActiveConsole] = useState<string>('dashboard');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentHotel, setCurrentHotel] = useState<string>('Royal Saly');
  
  // Real active local databases
  const [rooms, setRooms] = useState<Room[]>(() => generateRooms());
  const [tasks, setTasks] = useState<Task[]>(() => initialTasks);
  const [notifications, setNotifications] = useState<PMSNotification[]>(() => initialNotifications);
  const [isSessionLocked, setIsSessionLocked] = useState<boolean>(false);

  // Growth-rates and standard metrics offset simulator
  const [deltaEarnings, setDeltaEarnings] = useState<number>(0);
  const [simulationAlert, setSimulationAlert] = useState<string | null>(
    "Groupe Senegal Hotels PMS : Gestion centralisée multi-établissement active."
  );

  // Live active rooms compute for the selected hotel property
  const hotelRooms = useMemo(() => {
    if (currentHotel === 'Les Pélicans du Saloum') {
      // Intimate eco-lodge: 40 cosy bungalows on 1st/2nd level, custom theme names
      return rooms
        .filter(r => r.floor <= 2 && parseInt(r.number) % 10 <= 8)
        .map(r => ({
          ...r,
          category: r.category.includes('Suite') 
            ? 'Bungalow Piloti Premium' 
            : r.category.includes('Deluxe') 
            ? 'Bungalow Vue Saloum' 
            : 'Bungalow Jardin'
        }));
    }
    if (currentHotel === 'Nema Kadior') {
      // Mid-size riverfront: 72 rooms
      return rooms
        .filter(r => r.floor <= 3 && parseInt(r.number) % 10 <= 18)
        .map(r => ({
          ...r,
          category: r.category.includes('Suite') 
            ? 'Suite Fleuve Casamance' 
            : r.category.includes('Deluxe') 
            ? 'Chambre Confort Balcon' 
            : r.category
        }));
    }
    // Royal Saly: Full 120 rooms resort
    return rooms;
  }, [rooms, currentHotel]);

  // Dynamic status counters based on physical local hotel room states
  const currentStats = useMemo(() => {
    const occupied = hotelRooms.filter(r => r.status === 'occupied').length;
    const reserved = hotelRooms.filter(r => r.status === 'reserved').length;
    const notReady = hotelRooms.filter(r => r.status === 'not-ready').length;
    
    // Scale baseline factors dynamically based on hotel tier
    const multiplier = currentHotel === 'Royal Saly' ? 1.0 : currentHotel === 'Nema Kadior' ? 0.65 : 0.35;
    
    return {
      totalRevenue: Math.round((58240 + deltaEarnings) * multiplier),
      newReservations: Math.round((106 + reserved) * multiplier),
      checkedIn: occupied,
      checkedOut: notReady + 2,
    };
  }, [hotelRooms, deltaEarnings, currentHotel]);

  // Handle room status updates from Inspector quick-actions
  const handleUpdateRoomStatus = (roomId: string, newStatus: RoomStatus) => {
    setRooms(prevRooms =>
      prevRooms.map(room => {
        if (room.id === roomId) {
          const oldStatus = room.status;
          
          // Increment simulated earnings when checking guests in
          if (oldStatus !== 'occupied' && newStatus === 'occupied') {
            setDeltaEarnings(prev => prev + room.nightlyRate);
            
            // Push dynamic notification Alert
            const newNotif: PMSNotification = {
              id: `notif-${Date.now()}`,
              title: 'Arrivée validée en temps réel',
              message: `Arrivée du client enregistrée aujourd'hui en chambre ${room.number} (${room.category}).`,
              time: 'À l\'instant',
              type: 'réservation',
              read: false
            };
            setNotifications(prev => [newNotif, ...prev]);
          }

          // Return room with updated values
          const clearGuest = newStatus === 'available' || newStatus === 'not-ready';
          return {
            ...room,
            status: newStatus,
            guestName: clearGuest ? undefined : room.guestName,
            phone: clearGuest ? undefined : room.phone,
            checkInDate: clearGuest ? undefined : room.checkInDate,
          };
        }
        return room;
      })
    );
  };

  const handleUpdateRoomStatusAndGuest = (
    roomNumber: string,
    status: RoomStatus,
    guestName?: string,
    checkIn?: string,
    checkOut?: string
  ) => {
    setRooms(prevRooms =>
      prevRooms.map(room => {
        if (room.number === roomNumber) {
          const oldStatus = room.status;
          if (oldStatus !== 'occupied' && status === 'occupied') {
            setDeltaEarnings(prev => prev + room.nightlyRate);
          }
          return {
            ...room,
            status,
            guestName: guestName,
            checkInDate: checkIn,
            checkOutDate: checkOut,
          };
        }
        return room;
      })
    );
  };

  const handleAddNotification = (
    title: string,
    message: string,
    type: 'réservation' | 'paiement' | 'alerte' | 'info'
  ) => {
    const newNotif: PMSNotification = {
      id: `notif-${Date.now()}`,
      title,
      message,
      time: 'À l\'instant',
      type,
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  // Tasks handlers
  const handleToggleTask = (id: string) => {
    setTasks(prev =>
      prev.map(t => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleAddTask = (text: string, priority: 'haute' | 'moyenne' | 'basse', category: string) => {
    const newTask: Task = {
      id: `task-${Date.now()}`,
      text,
      completed: false,
      priority,
      category: category || 'Général'
    };
    setTasks(prev => [newTask, ...prev]);
    
    // Alert feedback
    setSimulationAlert(`Nouvelle tâche ajoutée : "${text}"`);
    setTimeout(() => setSimulationAlert(null), 3500);
  };

  const handleDeleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };


  // Notifications administration
  const handleMarkNotificationRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleClearNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleRoleChange = (role: RBACRole) => {
    setCurrentRole(role);
    const allowed = ROLE_CONSOLES_MAPPING[role] || [];
    if (!allowed.includes(activeConsole)) {
      setActiveConsole(role === 'Réceptionniste (Front Desk)' ? 'reception-desk' : 'dashboard');
    }
    setSimulationAlert(`Habilitation RBAC modifiée : Affichage ajusté pour le rôle "${role}".`);
    setTimeout(() => setSimulationAlert(null), 4000);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex">
      
      {/* 1. SIDEBAR NAVIGATION PANEL */}
      <Sidebar
        currentRole={currentRole}
        onRoleChange={handleRoleChange}
        activeConsole={activeConsole}
        onConsoleSelect={setActiveConsole}
        onLockSession={() => setIsSessionLocked(true)}
        currentHotel={currentHotel}
        onHotelChange={(h) => {
          setCurrentHotel(h);
          setSimulationAlert(`Établissement actif modifié : Affichage du tableau de bord de ${h}.`);
          setTimeout(() => setSimulationAlert(null), 3500);
        }}
      />

      {/* 2. MAIN LAYOUT CONTAINER */}
      <main className="flex-grow pl-72 min-h-screen flex flex-col">
        
        {/* 3. CORE HEADER PANEL */}
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          notifications={notifications}
          onMarkNotificationRead={handleMarkNotificationRead}
          onClearNotification={handleClearNotification}
        />

        {/* 4. SCROLLABLE SCREEN CONTENTS */}
        <div className="p-8 flex-grow flex flex-col max-w-[1600px] w-full mx-auto">
          
          {/* Simulation status flash messages */}
          {simulationAlert && (
            <div className="mb-6 p-4 bg-orange-50 border border-orange-200/60 rounded-2xl flex items-center justify-between text-xs text-orange-850 shadow-sm animate-in fade-in duration-300">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-orange-650 shrink-0" />
                <span className="font-semibold">{simulationAlert}</span>
              </div>
              <button
                onClick={() => setSimulationAlert(null)}
                className="text-orange-500 hover:text-orange-700 font-bold ml-4 cursor-pointer"
              >
                Ignorer
              </button>
            </div>
          )}

          {/* RBAC Simulation Visual Warning Banner */}
          {currentRole !== 'Propriétaire d\'Hôtel' && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-850 animate-in fade-in slide-in-from-top-1 duration-200">
              <AlertTriangle className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Vue restreinte ({currentRole})</p>
                <p className="text-amber-700 font-medium mt-0.5">
                  {currentRole === 'Réceptionniste (Front Desk)' && "Certains indicateurs financiers de haut niveau sont simplifiés. Votre tableau de bord se concentre sur les arrivées/départs et les fiches clients."}
                  {currentRole === 'Directeur Financier' && "L'accès à l'inventaire physique des chambres et les modifications d'interrupteurs de ménage sont verrouillés pour préserver l'audit de facturation."}
                  {currentRole === 'Responsable Ménage' && "Les données sensibles d'encaissement et de réservations sont masquées pour des raisons de conformité opérationnelle. Votre focus est l'entretien ménager (Chambres non prêtes)."}
                </p>
              </div>
            </div>
          )}

          {/* CONDITIONAL RENDER BY ACTIVE CONSOLE VIEW */}
          {activeConsole === 'reception-desk' ? (
            <ReceptionistDashboard
              rooms={hotelRooms}
              currentHotel={currentHotel}
              currentRole={currentRole}
              onUpdateRoomStatus={handleUpdateRoomStatus}
              onAddNotification={handleAddNotification}
              onNavigate={setActiveConsole}
            />
          ) : activeConsole === 'dashboard' ? (
            <div className="fade-in-up">
              
              {/* Core stat cards (KPI widgets) - Hides revenue if currentRole is housekeeping */}
              {currentRole !== 'Responsable Ménage' ? (
                <MetricCards stats={currentStats} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-white p-5 rounded-[24px] border border-slate-100 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-3.5 bg-red-50 text-red-650 rounded-xl">
                      <Activity className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Chambres en cours de ménage</p>
                      <h4 className="text-2xl font-black text-[#09153D]">{hotelRooms.filter(r => r.status === 'not-ready').length} Chambres</h4>
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-[24px] border border-slate-100 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-3.5 bg-emerald-50 text-emerald-650 rounded-xl">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Chambres libres inspectées</p>
                      <h4 className="text-2xl font-black text-[#09153D]">{hotelRooms.filter(r => r.status === 'available').length} Chambres</h4>
                    </div>
                  </div>
                </div>
              )}

              {/* Big Charts Row: Revenue and Occupancy - Redacted/Modified based on simulated role permissions */}
              <div className="flex flex-col xl:flex-row gap-6 mb-8 w-full">
                {currentRole !== 'Responsable Ménage' ? (
                  <RevenueChart />
                ) : (
                  <div className="bg-slate-100/50 p-6 rounded-2xl border border-dashed border-slate-200 flex-1 flex flex-col items-center justify-center text-center py-12 min-h-[260px]">
                    <Shield className="w-10 h-10 text-slate-450 mb-3" />
                    <h5 className="font-bold text-slate-700">Flux financiers confidentiels</h5>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-sm">
                      Les autorisations de votre profil ({currentRole}) limitent l'accès aux graphiques de rentrées financières.
                    </p>
                  </div>
                )}
                
                <OccupancyChart rooms={hotelRooms} />
              </div>

              {/* Room Availability interactive board row */}
              <RoomGrid
                rooms={hotelRooms}
                onUpdateRoomStatus={currentRole === 'Directeur Financier' ? () => alert("Simulation PMS : L'édition d'inventaire est bloquée sous le rôle de Directeur Financier.") : handleUpdateRoomStatus}
                searchQuery={searchQuery}
              />

              {/* Bottom Row Information widgets */}
              <BottomSections
                sources={bookingSources}
                reviews={guestReviews}
                tasks={tasks}
                onToggleTask={handleToggleTask}
                onAddTask={handleAddTask}
                onDeleteTask={handleDeleteTask}
              />
              
            </div>
          ) : activeConsole === 'hotels-hub' ? (
            <HotelsHub
              currentHotel={currentHotel}
              onHotelChange={(h) => {
                setCurrentHotel(h);
                setSimulationAlert(`Établissement actif modifié : Affichage du tableau de bord de ${h}.`);
                setTimeout(() => setSimulationAlert(null), 3500);
              }}
              currentRole={currentRole}
            />
          ) : activeConsole === 'rooms-inventory' ? (
            <RoomInventory
              rooms={hotelRooms}
              currentHotel={currentHotel}
              currentRole={currentRole}
              onUpdateRoomStatus={handleUpdateRoomStatus}
              onUpdateRoomDetails={(roomId, updatedFields) => {
                setRooms(prev => prev.map(r => r.id === roomId ? { ...r, ...updatedFields } : r));
              }}
              onAddRoom={(newRoom) => {
                setRooms(prev => [...prev, newRoom]);
              }}
              onDeleteRoom={(roomId) => {
                setRooms(prev => prev.filter(r => r.id !== roomId));
              }}
            />
          ) : activeConsole === 'bookings-desk' ? (
            <BookingsDesk
              rooms={hotelRooms}
              currentHotel={currentHotel}
              currentRole={currentRole}
              onUpdateRoomStatusAndGuest={handleUpdateRoomStatusAndGuest}
              onAddNotification={handleAddNotification}
            />
          ) : activeConsole === 'guests-crm' ? (
            <GuestsCRM
              currentHotel={currentHotel}
              currentRole={currentRole}
              onAddNotification={handleAddNotification}
            />
          ) : activeConsole === 'payments-finance' ? (
            <PaymentsFinance
              currentHotel={currentHotel}
              currentRole={currentRole}
              onAddNotification={handleAddNotification}
            />
          ) : activeConsole === 'event-venues' ? (
            <EventVenues
              currentHotel={currentHotel}
              currentRole={currentRole}
              onAddNotification={handleAddNotification}
            />
          ) : activeConsole === 'experiences-market' ? (
            <ExperiencesMarket
              currentHotel={currentHotel}
              currentRole={currentRole}
              onAddNotification={handleAddNotification}
            />
          ) : activeConsole === 'marketing-packages' ? (
            <MarketingPackages
              currentHotel={currentHotel}
              currentRole={currentRole}
              onAddNotification={handleAddNotification}
            />
          ) : activeConsole === 'guest-feedbacks' ? (
            <GuestFeedbacks
              currentHotel={currentHotel}
              currentRole={currentRole}
              onAddNotification={handleAddNotification}
            />
          ) : activeConsole === 'deep-analytics' ? (
            <DeepAnalytics
              currentHotel={currentHotel}
              currentRole={currentRole}
              onAddNotification={handleAddNotification}
            />
          ) : activeConsole === 'staff-directory' ? (
            <StaffDirectory
              currentHotel={currentHotel}
              currentRole={currentRole}
              onAddNotification={handleAddNotification}
            />
          ) : activeConsole === 'messages-inbox' ? (
            <MessagesInbox
              currentHotel={currentHotel}
              currentRole={currentRole}
              onAddNotification={handleAddNotification}
            />
          ) : activeConsole === 'global-settings' ? (
            <GlobalSettings
              currentHotel={currentHotel}
              currentRole={currentRole}
              onAddNotification={handleAddNotification}
            />
          ) : (
            // Polish styled sub-consoles drawers
            <div className="flex-grow flex flex-col items-center justify-center text-center p-12 bg-white rounded-3xl border border-slate-100/80 my-auto shadow-inner py-20 fade-in-up">
              <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-3xl flex items-center justify-center mb-6 shadow-sm">
                <Shield className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-950 font-sans">Console "{activeConsole.replace('-', ' ')}" en Service</h3>
              <p className="text-xs text-slate-500 max-w-md mt-2 leading-relaxed">
                Ce plateau interactif fait partie de l'écosystème unifié du PMS <strong>Senegal Hotels</strong>. 
                Toutes les commandes opérationnelles centrales sont intégrées au <span className="font-semibold text-orange-650 cursor-pointer" onClick={() => setActiveConsole('dashboard')}>Tableau de bord principal</span>.
              </p>
              
              <div className="mt-8 flex gap-3">
                <button
                  onClick={() => setActiveConsole('dashboard')}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2.5 px-5 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Retour au Tableau de Bord
                </button>
                <button
                  onClick={() => alert('Simulateur PMS : Rapport d\'état synthétisé envoyé au propriétaire.')}
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold py-2.5 px-5 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Télécharger le rapport d'audit
                </button>
              </div>
            </div>
          )}

        </div>

        {/* 5. BRAND FOOTER WRAPPER */}
        <footer className="h-14 border-t border-slate-50 flex items-center justify-between px-8 text-[11px] text-slate-400 bg-white/50">
          <span>Senegal Hotels Workspace © 2026</span>
          <div className="flex gap-4">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span>Serveur Multi-hôtels en ligne (Port 3000)</span>
            </span>
            <span>Version 4.2.0-orange</span>
          </div>
        </footer>

      </main>

      {/* 6. SECURITY LOCKSCREEN OVERLAY SCREEN */}
      <LockScreen
        isOpen={isSessionLocked}
        onUnlock={() => setIsSessionLocked(false)}
        userName="Mamadou Diallo"
      />

    </div>
  );
}
