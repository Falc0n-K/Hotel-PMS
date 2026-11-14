export type RoomStatus = 'occupied' | 'available' | 'reserved' | 'not-ready' | 'maintenance';

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
  maintenanceNote?: string;
  otaSynced?: boolean;
  roomTypeId?: string;
  reservationId?: string;
  capacity?: number;
  housekeeping?: 'clean' | 'dirty' | 'inspected' | 'out_of_order';
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
