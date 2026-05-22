/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Room, RoomStatus, Task, BookingSource, Review, PMSNotification } from './types';

// Deterministic generator to get exactly 120 rooms with correct status ratios
// Occupied: 68, Available: 25, Reserved: 22, Not Ready: 5
export function generateRooms(): Room[] {
  const rooms: Room[] = [];
  
  // Ratios to reach
  let reqOccupied = 68;
  let reqAvailable = 25;
  let reqReserved = 22;
  let reqNotReady = 5;

  const firstNames = ['Mamadou', 'Adama', 'Sarah', 'Khadija', 'Jean-Pierre', 'David', 'Elena', 'Amadou', 'Awa', 'Pierre', 'Isabelle', 'Michel', 'Fatou', 'Ousmane', 'Alice', 'Carlos', 'Hans', 'Yuki', 'Demba', 'Yacine'];
  const lastNames = ['Diallo', 'Sarr', 'Hoffmann', 'Ndiaye', 'Kamara', 'Dupont', 'Smith', 'Sow', 'Fall', 'Mendy', 'Gaye', 'Cissé', 'Moreau', 'Ba', 'Keita', 'Diop', 'Traoré', 'Gomez', 'Müller', 'Janssen'];
  
  const roomCategories = [
    { name: 'Chambre Déco Africaine', rate: 95 },
    { name: 'Chambre Deluxe', rate: 180 },
    { name: 'Suite Baobab', rate: 310 },
    { name: 'Junior Suite Prestige', rate: 420 }
  ];

  // Let's generate 4 floors, with 30 rooms per floor (total 120 rooms)
  // Floor 1: 101 to 130
  // Floor 2: 201 to 230
  // Floor 3: 301 to 330
  // Floor 4: 401 to 430
  for (let floor = 1; floor <= 4; floor++) {
    for (let r = 1; r <= 30; r++) {
      const roomNum = `${floor}${r < 10 ? '0' + r : r}`;
      const id = `room-${roomNum}`;
      
      // Determine category based on room number & floor
      // High floor = high tier
      let catIndex = 0;
      if (floor === 4) {
        catIndex = r > 20 ? 3 : 2; // suite or deluxe
      } else if (floor === 3) {
        catIndex = r > 15 ? 2 : 1; // deluxe or superior
      } else if (floor === 2) {
        catIndex = r > 15 ? 1 : 0; // superior or standard
      } else {
        catIndex = r > 24 ? 1 : 0; // standard mostly
      }
      
      const category = roomCategories[catIndex];

      // Assign status based on remaining quota
      let status: RoomStatus = 'available';
      if (reqOccupied > 0) {
        status = 'occupied';
        reqOccupied--;
      } else if (reqReserved > 0) {
        status = 'reserved';
        reqReserved--;
      } else if (reqNotReady > 0) {
        status = 'not-ready';
        reqNotReady--;
      } else if (reqAvailable > 0) {
        status = 'available';
        reqAvailable--;
      }

      // Generate guest details for occupied & reserved
      let guestName: string | undefined;
      let checkInDate: string | undefined;
      let checkOutDate: string | undefined;
      let occupants: number | undefined;
      let phone: string | undefined;

      if (status === 'occupied') {
        guestName = firstNames[(floor * r) % firstNames.length] + ' ' + lastNames[(floor + r) % lastNames.length];
        occupants = ((floor + r) % 2) + 1;
        checkInDate = `2026-05-${14 + ((floor * r) % 6)}`;
        checkOutDate = `2026-05-${22 + ((floor + r) % 5)}`;
        phone = `+221 77 ${100 + floor * 10 + r} ${40 + floor + r} 99`;
      } else if (status === 'reserved') {
        guestName = firstNames[(floor + r + 3) % firstNames.length] + ' ' + lastNames[(floor * r + 2) % lastNames.length];
        occupants = ((floor * r) % 3) + 1;
        checkInDate = `2026-05-${22 + ((floor + r) % 4)}`;
        checkOutDate = `2026-05-${26 + ((floor * r) % 5)}`;
        phone = `+33 6 ${40 + floor * r} 90 ${11 + floor + r}`;
      }

      rooms.push({
        id,
        number: roomNum,
        floor,
        category: category.name,
        status,
        guestName,
        checkInDate,
        checkOutDate,
        nightlyRate: category.rate,
        occupants,
        phone
      });
    }
  }

  // Shuffle pseudo-randomly but deterministically to mix the states across the grid
  const seedShuffle = (arr: Room[]) => {
    let m = arr.length, t, i;
    // To keep it clean, let's group rooms by number and then assign a determinist layout shuffle
    // Let's swap some elements to make it look scattered, but keep them sorted or semi-sorted
    // Let's actually sort them by room number so they display linearly in order 101...430 on the grid.
    // The grid will show scattered colors elegantly.
    return arr;
  };

  return seedShuffle(rooms);
}

// Booking sources
export const bookingSources: BookingSource[] = [
  { name: 'Direct (Site Web)', count: 42, revenue: 18480, percentage: 35, colorClass: 'bg-orange-500' },
  { name: 'Booking.com', count: 38, revenue: 14640, percentage: 31, colorClass: 'bg-orange-600' },
  { name: 'Expedia', count: 18, revenue: 8200, percentage: 15, colorClass: 'bg-amber-500' },
  { name: 'Tours Opérateurs', count: 12, revenue: 11920, percentage: 11, colorClass: 'bg-orange-400' },
  { name: 'Téléphone / Autre', count: 10, revenue: 5000, percentage: 8, colorClass: 'bg-slate-300' }
];

// Guest Reviews
export const guestReviews: Review[] = [
  {
    id: 'rev-1',
    author: 'Sophie Lecomte',
    avatarText: 'SL',
    rating: 5,
    comment: 'Un séjour idyllique de 6 nuits à l\'Hotel Club Royal Saly ! Vue océan depuis notre suite garantie, restaurant Le Baouli face à la mer exceptionnel. Service chaleureux typiquement sénégalais — la vraie Téranga.',
    date: 'Hier',
    source: 'Booking.com'
  },
  {
    id: 'rev-2',
    author: 'Thomas Müller',
    avatarText: 'TM',
    rating: 4.8,
    comment: 'Calme absolu, parfait pour se ressourcer. Le personnel de réception (notamment Mamadou) est extrêmement prévenant et accueillant. Les buffets sont formidables.',
    date: 'Il y a 2 jours',
    source: 'Direct'
  },
  {
    id: 'rev-3',
    author: 'Chantal Giraud',
    avatarText: 'CG',
    rating: 5,
    comment: 'Expérience exceptionnelle. Service de covoiturage, plage immaculée et chambres d’une propreté exemplaire. On reviendra à coup sûr l\'année prochaine !',
    date: 'Il y a 4 jours',
    source: 'Expedia'
  },
  {
    id: 'rev-4',
    author: 'Ousmane Fall',
    avatarText: 'OF',
    rating: 4.5,
    comment: 'Magnifique resort, le cadre est somptueux. Très bon rapport qualité/prix pour les séjours professionnels. Spa de très haute qualité.',
    date: 'Il y a 1 semaine',
    source: 'Direct'
  }
];

// Default checklist tasks
export const initialTasks: Task[] = [
  { id: 'task-1', text: 'Inspecter la Suite Royale 425 suite départ ce matin', completed: false, priority: 'haute', category: 'Ménage' },
  { id: 'task-2', text: 'Valider les rapports de caisse d\'hier soir', completed: true, priority: 'moyenne', category: 'Finance' },
  { id: 'task-3', text: 'Confirmer le transfert aéroport VIP pour M. Hoffmann', completed: false, priority: 'haute', category: 'Réception' },
  { id: 'task-4', text: 'Vérifier la température de la piscine principale', completed: false, priority: 'basse', category: 'Technique' },
  { id: 'task-5', text: 'Mettre à jour les tarifs promotionnels sur Booking.com', completed: true, priority: 'moyenne', category: 'Marketing' },
  { id: 'task-6', text: 'Contrôler la conformité des stocks du bar de plage', completed: false, priority: 'moyenne', category: 'Restauration' }
];

// Default notification board alerts
export const initialNotifications: PMSNotification[] = [
  {
    id: 'notif-1',
    title: 'Nouvelle réservation reçue',
    message: 'Chambre Deluxe 305 réservée pour 4 nuits par David Fall via Booking.com',
    time: 'Il y a 3 min',
    type: 'réservation',
    read: false
  },
  {
    id: 'notif-2',
    title: 'Paiement effectué avec succès',
    message: 'Encaissement de $780 pour la chambre 204 (Adama Sarr)',
    time: 'Il y a 15 min',
    type: 'paiement',
    read: false
  },
  {
    id: 'notif-3',
    title: 'Alerte Ménage requise',
    message: 'La chambre 115 est signalée prête pour inspection',
    time: 'Il y a 45 min',
    type: 'info',
    read: true
  },
  {
    id: 'notif-4',
    title: 'Alerte : Libération en retard',
    message: 'La chambre 412 (Yuki Suzuki) n\'a pas encore libéré sa chambre',
    time: 'Il y a 1 heure',
    type: 'alerte',
    read: true
  }
];

// Revenue Timeline Data for Graph
export const revenueGraphData = [
  { month: 'Jan', revenue: 210000, target: 200000 },
  { month: 'Fév', revenue: 240000, target: 220000 },
  { month: 'Mar', revenue: 315060, target: 250000 },
  { month: 'Avr', revenue: 280000, target: 260000 },
  { month: 'Mai', revenue: 305000, target: 280000 },
  { month: 'Juin', revenue: 315060, target: 300000 }
];

// Daily occupancy logs
export const occupancyTrendData = [
  { day: '12 Juin', occupied: 68, available: 52 },
  { day: '13 Juin', occupied: 72, available: 48 },
  { day: '14 Juin', occupied: 85, available: 35 },
  { day: '15 Juin', occupied: 94, available: 26 },
  { day: '16 Juin', occupied: 88, available: 32 },
  { day: '17 Juin', occupied: 76, available: 44 },
  { day: '18 Juin', occupied: 68, available: 52 } // matching current occupied state (68)
];
