import { bilingual } from './i18n';
import type { RBACRole } from '../types';

// Rôles tels que stockés en base (public.app_role).
export type AppRole =
  | 'owner'
  | 'general_manager'
  | 'reservation_manager'
  | 'front_desk'
  | 'housekeeping_manager'
  | 'housekeeper'
  | 'maintenance'
  | 'accountant'
  | 'auditor';

export const APP_ROLE_LABELS = bilingual<AppRole>({
  owner: ['Propriétaire', 'Owner'],
  general_manager: ['Directeur général', 'General manager'],
  reservation_manager: ['Responsable réservations', 'Reservations manager'],
  front_desk: ['Réception', 'Front desk'],
  housekeeping_manager: ['Gouvernante', 'Head housekeeper'],
  housekeeper: ['Femme / valet de chambre', 'Room attendant'],
  maintenance: ['Maintenance', 'Maintenance'],
  accountant: ['Comptabilité', 'Accounting'],
  auditor: ['Auditeur', 'Auditor'],
});

// Les écrans existants raisonnent sur quatre profils. Le rôle serveur décide
// du profil d'affichage ; les droits réels sont appliqués par la RLS et les
// fonctions SQL, l'interface ne fait que refléter ce que le serveur autorise.
export function uiRoleFor(role: AppRole): RBACRole {
  switch (role) {
    case 'owner':
    case 'general_manager':
      return "Propriétaire d'Hôtel";
    case 'reservation_manager':
    case 'front_desk':
      return 'Réceptionniste (Front Desk)';
    case 'accountant':
    case 'auditor':
      return 'Directeur Financier';
    default:
      return 'Responsable Ménage';
  }
}

export const canSeeFinance = (r: AppRole) =>
  ['owner', 'general_manager', 'accountant', 'auditor'].includes(r);
export const canManageReservations = (r: AppRole) =>
  ['owner', 'general_manager', 'reservation_manager', 'front_desk'].includes(r);
export const canManageInventory = (r: AppRole) => ['owner', 'general_manager'].includes(r);
