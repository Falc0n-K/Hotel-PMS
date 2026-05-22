/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Share2, Plus, Check, Star, Trash2, Search, ChevronDown, CheckSquare, Calendar, User, Tag, Clock } from 'lucide-react';
import { BookingSource, Review, Task } from '../types';

interface BottomSectionsProps {
  sources: BookingSource[];
  reviews: Review[];
  tasks: Task[];
  onToggleTask: (id: string) => void;
  onAddTask: (text: string, priority: 'haute' | 'moyenne' | 'basse', category: string) => void;
  onDeleteTask: (id: string) => void;
}

interface BookingItem {
  id: string;
  guestName: string;
  roomType: string;
  roomNo: string;
  duration: string;
  checkInOut: string;
  status: 'Arrivé' | 'Confirmé' | 'En Attente';
}

export default function BottomSections({
  sources,
  reviews,
  tasks,
  onToggleTask,
  onAddTask,
  onDeleteTask
}: BottomSectionsProps) {
  // New task form state
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'haute' | 'moyenne' | 'basse'>('moyenne');
  const [newTaskCategory, setNewTaskCategory] = useState('Ménage');

  // Booking list active interactive states
  const [bookingSearchQuery, setBookingSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('Tous');

  // Static list of activities (corresponds to the feed in the image)
  const [activities, setActivities] = useState([
    {
      id: 'act-1',
      user: 'Réception (Admin)',
      time: '09:45 AM',
      text: 'Arrivée enregistrée pour Emily Carter en Chambre 210 (Suite Deluxe)',
      dotColor: 'bg-blue-500'
    },
    {
      id: 'act-2',
      user: 'Équipe Ménage',
      time: '09:20 AM',
      text: 'Chambre 305 signalée Nettoyée & Prête pour inspection',
      dotColor: 'bg-emerald-500'
    },
    {
      id: 'act-3',
      user: 'Approbation Direction',
      time: '08:50 AM',
      text: 'Check-in anticipé accordé à Daniel Wong en Chambre 315 (Chambre Supérieure)',
      dotColor: 'bg-orange-500'
    },
    {
      id: 'act-4',
      user: 'Service Réservation',
      time: '08:20 AM',
      text: 'Réservation VIP confirmée pour le forfait lune de miel (Chambre Swim-up)',
      dotColor: 'bg-purple-500'
    }
  ]);

  // Static bookings database as requested in the mockup image
  const [bookings, setBookings] = useState<BookingItem[]>([
    {
      id: '#1',
      guestName: 'Alastair Cook',
      roomType: 'Suite Swim-up Premium Lagoon',
      roomNo: '104',
      duration: '3 Nuits',
      checkInOut: '2026-05-18 — 2026-05-24',
      status: 'Arrivé'
    },
    {
      id: '#2',
      guestName: 'Sokhna Diagne',
      roomType: 'Villa Privée Horizon Océanique',
      roomNo: '201',
      duration: '3 Nuits',
      checkInOut: '2026-05-19 — 2026-05-23',
      status: 'Arrivé'
    },
    {
      id: '#3',
      guestName: 'Elena Rostova',
      roomType: 'Éco-Retraite Africaine',
      roomNo: '305',
      duration: '3 Nuits',
      checkInOut: '2026-05-20 — 2026-05-26',
      status: 'Confirmé'
    },
    {
      id: '#4',
      guestName: 'Marcus Aurel',
      roomType: 'Chambre Vista Standard Kotu',
      roomNo: '112',
      duration: '3 Nuits',
      checkInOut: '2026-05-22 — 2026-05-25',
      status: 'En Attente'
    }
  ]);

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    onAddTask(newTaskText, newTaskPriority, newTaskCategory);
    setNewTaskText('');
    setShowAddTask(false);
  };

  // Filter Bookings row-by-row
  const filteredBookings = bookings.filter((b) => {
    const matchesQuery = b.guestName.toLowerCase().includes(bookingSearchQuery.toLowerCase()) || 
                         b.roomType.toLowerCase().includes(bookingSearchQuery.toLowerCase()) ||
                         b.roomNo.includes(bookingSearchQuery);
    
    if (selectedStatusFilter === 'Tous') return matchesQuery;
    if (selectedStatusFilter === 'Arrivé' && b.status === 'Arrivé') return matchesQuery;
    if (selectedStatusFilter === 'Confirmé' && b.status === 'Confirmé') return matchesQuery;
    if (selectedStatusFilter === 'En Attente' && b.status === 'En Attente') return matchesQuery;
    return false;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full mb-8">
      
      {/* LEFT/MIDDLE SEGMENT: SPANS 2 COLS */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Row 1: Side by Side Cards (Booking Source & Overall Rating) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* A. BOOKING SOURCE - DONUT DESIGN */}
          <div className="bg-white p-6 rounded-[24px] border border-slate-100/80 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 tracking-tight">Source de Réservation</h4>
                  <p className="text-[11px] text-slate-400 font-medium">Répartition de l'origine du rendement</p>
                </div>
                <button className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <Share2 className="w-4 h-4" />
                </button>
              </div>

              {/* Graphic Ring & Side Stats */}
              <div className="flex flex-row items-center justify-between gap-4 py-3">
                
                {/* SVG Beautiful Segmented Donut */}
                <div className="relative w-[130px] h-[130px] flex items-center justify-center shrink-0">
                  <svg width="120" height="120" viewBox="0 0 120 120" className="transform -rotate-90">
                    <circle cx="60" cy="60" r="45" fill="none" stroke="#f8fafc" strokeWidth="11" />
                    
                    {/* Segment Direct Website: 42% (Orange) */}
                    <circle cx="60" cy="60" r="45" fill="none" stroke="#f97316" strokeWidth="11"
                      strokeDasharray={`${42 * 2.827} 282.7`}
                      strokeDashoffset="0"
                      strokeLinecap="round"
                    />
                    
                    {/* Segment OTA: 33% (Blue) */}
                    <circle cx="60" cy="60" r="45" fill="none" stroke="#3b82f6" strokeWidth="11"
                      strokeDasharray={`${33 * 2.827} 282.7`}
                      strokeDashoffset={`-${42 * 2.827}`}
                      strokeLinecap="round"
                    />

                    {/* Segment Passages: 15% (Yellow) */}
                    <circle cx="60" cy="60" r="45" fill="none" stroke="#eab308" strokeWidth="11"
                      strokeDasharray={`${15 * 2.827} 282.7`}
                      strokeDashoffset={`-${(42 + 33) * 2.827}`}
                      strokeLinecap="round"
                    />

                    {/* Segment Corporate/Other: 10% (Dark Slate) */}
                    <circle cx="60" cy="60" r="45" fill="none" stroke="#1e293b" strokeWidth="11"
                      strokeDasharray={`${10 * 2.827} 282.7`}
                      strokeDashoffset={`-${(42 + 33 + 15) * 2.827}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  
                  {/* Absolute Center Counter labels */}
                  <div className="absolute flex flex-col items-center text-center">
                    <span className="text-xl font-extrabold text-[#09153D] tracking-tight font-mono leading-none">42%</span>
                    <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wide">Direct</span>
                  </div>
                </div>

                {/* Legend list on the right */}
                <div className="flex-grow space-y-2.5 max-sm:hidden">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2.5 h-2.5 bg-orange-500 rounded-full shrink-0"></span>
                      <span className="text-[11px] font-bold text-slate-700 truncate">Site Web Direct</span>
                    </div>
                    <span className="text-[11px] font-extrabold text-[#09153D] font-mono pl-2">42%</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2.5 h-2.5 bg-blue-500 rounded-full shrink-0"></span>
                      <span className="text-[11px] font-bold text-slate-700 truncate">Agences (OTA)</span>
                    </div>
                    <span className="text-[11px] font-extrabold text-[#09153D] font-mono pl-2">33%</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2.5 h-2.5 bg-yellow-500 rounded-full shrink-0"></span>
                      <span className="text-[11px] font-bold text-slate-700 truncate">Passages</span>
                    </div>
                    <span className="text-[11px] font-extrabold text-[#09153D] font-mono pl-2">15%</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2.5 h-2.5 bg-slate-800 rounded-full shrink-0"></span>
                      <span className="text-[11px] font-bold text-slate-700 truncate">Entreprises</span>
                    </div>
                    <span className="text-[11px] font-extrabold text-[#09153D] font-mono pl-2">10%</span>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* B. OVERALL RATING CARD */}
          <div className="bg-white p-6 rounded-[24px] border border-slate-100/80 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 tracking-tight">Évaluation Globale</h4>
                  <p className="text-[11px] text-slate-400 font-medium">Commentaires voyageurs globaux combinés</p>
                </div>
                <button className="text-slate-400 hover:text-slate-600">
                  <span className="font-bold text-xs select-none">...</span>
                </button>
              </div>

              {/* Arc Graph Gauge on left & ratings parameters list on right */}
              <div className="flex flex-row items-center justify-between gap-4 pt-2">
                
                {/* Left Side: Semi-Circular Arc Gauge */}
                <div className="flex flex-col items-center shrink-0">
                  <div className="relative w-[110px] h-[65px] flex items-end justify-center overflow-visible">
                    <svg width="100%" height="100%" viewBox="0 0 100 60" className="overflow-visible">
                      {/* Gray track arc */}
                      <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#f1f5f9" strokeWidth="10" strokeLinecap="round" />
                      {/* Active Arc (94%) representing 4.7 out of 5 */}
                      <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#f97316" strokeWidth="10" strokeLinecap="round"
                        strokeDasharray="125.6"
                        strokeDashoffset="7.5"
                      />
                    </svg>
                    
                    {/* Absolute center rating labels */}
                    <div className="absolute bottom-0 text-center flex flex-col items-center">
                      <span className="text-lg font-black font-mono text-[#09153D] tracking-tighter">4.7/5.0</span>
                      <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest mt-0.5">1 248 GUESTS</span>
                    </div>
                  </div>

                  {/* Rating Award Badge */}
                  <div className="mt-4 flex items-center gap-1.5 px-3 py-1 bg-amber-50/50 border border-amber-200/50 rounded-full text-[10px] font-extrabold text-orange-650 tracking-tight shadow-inner">
                    <Star className="w-3 h-3 text-orange-500 fill-orange-400 shrink-0" />
                    <span>Expérience Exceptionnelle</span>
                  </div>
                </div>

                {/* Right Side: Criterion Parameters & Mini Progress Bars */}
                <div className="flex-grow space-y-1.5 pl-2 max-sm:hidden">
                  {[
                    { label: 'Propreté', val: 4.8 },
                    { label: 'Confort', val: 4.6 },
                    { label: 'Service / Pers.', val: 4.9 },
                    { label: 'Équipements', val: 4.5 },
                    { label: 'Rapport Q/P', val: 4.6 },
                    { label: 'Emplacement', val: 4.7 }
                  ].map((crit) => (
                    <div key={crit.label} className="flex items-center justify-between gap-2.5">
                      <span className="text-[10px] font-bold text-slate-500 w-16 truncate text-left">{crit.label}</span>
                      
                      {/* Tiny colored horizontal bar */}
                      <div className="flex-grow h-1.5 bg-slate-50 border border-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-500 rounded-full"
                          style={{ width: `${(crit.val / 5) * 100}%` }}
                        />
                      </div>

                      {/* Score metric with mini star */}
                      <div className="flex items-center gap-0.5 shrink-0 text-right w-8">
                        <Star className="w-2.5 h-2.5 text-orange-400 fill-orange-400" />
                        <span className="text-[9.5px] font-extrabold font-mono text-slate-700">{crit.val}</span>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          </div>

        </div>

        {/* C. BOOKING LIST INTERACTIVE DATA TABLE CARD */}
        <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          
          {/* List and Search Header block */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
            <div>
              <h4 className="text-sm font-bold text-slate-900 tracking-tight">Liste des Réservations</h4>
              <p className="text-[11px] text-slate-400 font-medium">Registres des réservations en temps réel</p>
            </div>

            {/* In-table filter search & selectors */}
            <div className="flex items-center gap-3 self-end md:self-auto w-full md:w-auto">
              <div className="relative w-full md:w-60">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher client, statut..."
                  value={bookingSearchQuery}
                  onChange={(e) => setBookingSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 shrink-0 text-xs">
                <span className="text-slate-400 font-medium">Statut:</span>
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="bg-transparent border-none text-slate-700 font-bold focus:outline-none cursor-pointer text-xs"
                >
                  <option value="Tous">Tous</option>
                  <option value="Arrivé">Arrivé</option>
                  <option value="Confirmé">Confirmé</option>
                  <option value="En Attente">En Attente</option>
                </select>
              </div>
            </div>
          </div>

          {/* Property Register Responsive Table list */}
          <div className="overflow-x-auto border border-slate-100 rounded-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest p-4">NOM DU CLIENT</th>
                  <th className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest p-4">TYPE DE CHAMBRE</th>
                  <th className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest p-4">N° CH.</th>
                  <th className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest p-4">DURÉE</th>
                  <th className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest p-4">ARRIVÉE & DÉPART</th>
                  <th className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest p-4 text-center">STATUT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                      Aucun registre de réservation ne correspond
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-mono text-slate-400 font-bold leading-none">{b.id}</span>
                          <span className="font-bold text-slate-800 mt-1 leading-snug">{b.guestName}</span>
                        </div>
                      </td>
                      <td className="p-4 font-semibold text-slate-600">{b.roomType}</td>
                      <td className="p-4 font-extrabold font-mono text-slate-700">{b.roomNo}</td>
                      <td className="p-4 font-bold text-slate-500 font-mono">{b.duration}</td>
                      <td className="p-4 font-mono text-slate-400 text-[11px]">{b.checkInOut}</td>
                      <td className="p-4 text-center">
                        <span className={`inline-block text-[10px] font-extrabold px-3 py-1 rounded-full text-center ${
                          b.status === 'Arrivé' ? 'bg-emerald-50 text-emerald-600' :
                          b.status === 'Confirmé' ? 'bg-sky-50 text-sky-600' : 
                          'bg-orange-50 text-orange-600'
                        }`}>
                          {b.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>

      </div>

      {/* RIGHT SIDEBAR SEGMENT: SPANS 1 COL */}
      <div className="lg:col-span-1 space-y-6 flex flex-col justify-start">
        
        {/* D. PMS SECURITY CONTROLLED TASKS CHECKLIST (MATCHING SCREENSHOT SHAPE) */}
        <div className="bg-white p-6 rounded-[24px] border border-slate-100 flex flex-col shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900 tracking-tight">Tâches</h4>
              <p className="text-[11px] text-slate-400 font-medium">Gérer les paramètres de la liste</p>
            </div>
            
            <button
              onClick={() => setShowAddTask(!showAddTask)}
              className="w-8 h-8 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center transition-colors cursor-pointer group"
              title="Créer une tâche"
            >
              <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
            </button>
          </div>

          {/* Quick inline form insertion */}
          {showAddTask && (
            <form onSubmit={handleCreateTask} className="bg-slate-50 border border-slate-100 p-3 rounded-2xl mb-4 text-xs animate-in slide-in-from-top-2 duration-150 space-y-2">
              <input
                type="text"
                placeholder="Libellé de la tâche..."
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                required
              />
              <div className="flex items-center justify-between gap-1.5">
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value as any)}
                  className="bg-white border border-slate-200 rounded p-1 text-[11px]"
                >
                  <option value="haute">🚨 Haute</option>
                  <option value="moyenne">⚡ Moyenne</option>
                  <option value="basse">🟢 Basse</option>
                </select>
                <input
                  type="text"
                  placeholder="Catégorie (ex: Ménage)"
                  value={newTaskCategory}
                  onChange={(e) => setNewTaskCategory(e.target.value)}
                  className="w-24 bg-white border border-slate-200 rounded p-1 text-[11px]"
                />
                <button type="submit" className="bg-orange-600 text-white p-1 rounded hover:bg-orange-700">
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          )}

          {/* List of custom check items */}
          <div className="space-y-3 max-h-[290px] overflow-y-auto pr-1">
            {tasks.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-6">
                Aucune tâche à gérer
              </p>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className={`flex items-start justify-between gap-3 p-3.5 rounded-2xl border transition-all ${
                    task.completed 
                      ? 'bg-slate-50/50 border-slate-100 opacity-60' 
                      : 'bg-white border-slate-100 hover:border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Square design checkbox matching the layout */}
                    <button
                      onClick={() => onToggleTask(task.id)}
                      className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                        task.completed
                          ? 'bg-orange-600 border-orange-600 text-white'
                          : 'border-slate-200 hover:border-orange-500 bg-slate-50 text-transparent'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </button>

                    <div className="flex flex-col">
                      <span className={`text-xs font-bold leading-normal text-left cursor-pointer ${
                        task.completed ? 'text-slate-400 line-through' : 'text-slate-800'
                      }`}>
                        {task.text}
                      </span>
                      <span className="text-[10px] font-bold font-mono text-slate-400 mt-1 leading-none">
                        12 Mai 2026
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => onDeleteTask(task.id)}
                    className="text-slate-300 hover:text-red-500 shrink-0 self-start p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* E. RECENT ACTIVITIES FEED CONTAINER */}
        <div className="bg-white p-6 rounded-[24px] border border-slate-100 flex flex-col shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900 tracking-tight">Activités Récentes</h4>
              <p className="text-[11px] text-slate-400 font-medium">Flux d'actualités de la propriété en temps réel</p>
            </div>
            <button className="text-slate-400">
              <span className="font-bold text-xs">...</span>
            </button>
          </div>

          {/* Timeline Feed Stream */}
          <div className="relative pl-5 py-2 space-y-5 border-l border-slate-100/80 ml-2.5">
            {activities.map((act) => (
              <div key={act.id} className="relative">
                
                {/* Visual Circle bullet representing status update type */}
                <span className={`absolute -left-[26px] top-1.5 w-3 h-3 rounded-full border-2 border-white ring-4 ring-slate-50/50 ${act.dotColor}`} />
                
                <div className="flex flex-col">
                  {/* Item header block with right date align */}
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="font-extrabold text-slate-800 leading-snug">{act.user}</span>
                    <span className="text-[10px] text-slate-400 font-bold font-mono shrink-0 pl-3">{act.time}</span>
                  </div>
                  
                  {/* Detailed event log context text */}
                  <p className="text-[11px] text-slate-500 font-medium tracking-tight mt-1 leading-relaxed text-left">
                    {act.text}
                  </p>
                </div>

              </div>
            ))}
          </div>

        </div>

      </div>

    </div>
  );
}
