/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type RoomStatus = 'occupied' | 'available' | 'reserved' | 'not-ready';

export interface Room {
  id: string;
  number: string;
  floor: number;
  category: string;
  status: RoomStatus;
  guestName?: string;
  checkInDate?: string;
  checkOutDate?: string;
  nightlyRate: number;
  phone?: string;
  occupants?: number;
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  priority: 'haute' | 'moyenne' | 'basse';
  category: string;
}

export interface BookingSource {
  name: string;
  count: number;
  revenue: number;
  percentage: number;
  colorClass: string;
}

export interface Review {
  id: string;
  author: string;
  avatarText: string;
  rating: number;
  comment: string;
  date: string;
  source: string;
}

export interface PMSNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'réservation' | 'paiement' | 'alerte' | 'info';
  read: boolean;
}

export type RBACRole = 'Propriétaire d\'Hôtel' | 'Réceptionniste (Front Desk)' | 'Directeur Financier' | 'Responsable Ménage';

export const ROLE_CONSOLES_MAPPING: Record<RBACRole, string[]> = {
  'Propriétaire d\'Hôtel': [
    'dashboard',
    'hotels-hub',
    'rooms-inventory',
    'bookings-desk',
    'guests-crm',
    'payments-finance',
    'event-venues',
    'experiences-market',
    'marketing-packages',
    'guest-feedbacks',
    'deep-analytics',
    'staff-directory',
    'messages-inbox',
    'global-settings'
  ],
  'Directeur Financier': [
    'dashboard',
    'hotels-hub',
    'guests-crm',
    'payments-finance',
    'deep-analytics',
    'staff-directory',
    'messages-inbox',
    'global-settings'
  ],
  'Réceptionniste (Front Desk)': [
    'dashboard',
    'hotels-hub',
    'rooms-inventory',
    'bookings-desk',
    'guests-crm',
    'event-venues',
    'experiences-market',
    'marketing-packages',
    'guest-feedbacks',
    'staff-directory',
    'messages-inbox'
  ],
  'Responsable Ménage': [
    'dashboard',
    'rooms-inventory',
    'staff-directory',
    'messages-inbox'
  ]
};

export interface StatCardData {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  label: string;
}
