import {
  LayoutDashboard, BedDouble, CalendarDays, Users, Wallet, Building2, Settings, MonitorCheck, KeyRound,
  CalendarRange, Brush, Wrench, TrendingUp, MessageCircle, ScrollText, UserCog,
} from 'lucide-react';
import type { AppRole } from './roles';
import type { MessageKey } from './i18n';

export interface NavItem {
  id: string;
  label: MessageKey;
  icon: typeof LayoutDashboard;
  roles: AppRole[] | 'all';
}

const FRONT: AppRole[] = ['owner', 'general_manager', 'reservation_manager', 'front_desk'];
const MANAGEMENT: AppRole[] = ['owner', 'general_manager'];
const FINANCE: AppRole[] = ['owner', 'general_manager', 'accountant', 'auditor'];

// Le menu n'affiche que ce que le rôle peut utiliser ; la protection réelle
// reste la RLS et les fonctions SQL.
export const NAV: NavItem[] = [
  { id: 'reception-desk', label: 'nav.reception', icon: MonitorCheck, roles: FRONT },
  { id: 'dashboard', label: 'nav.dashboard', icon: LayoutDashboard, roles: 'all' },
  { id: 'room-rack', label: 'nav.rack', icon: CalendarRange, roles: [...FRONT, 'housekeeping_manager', 'accountant', 'auditor'] },
  { id: 'bookings-desk', label: 'nav.bookings', icon: CalendarDays, roles: [...FRONT, 'accountant', 'auditor'] },
  { id: 'guests', label: 'nav.guests', icon: Users, roles: [...FRONT, 'accountant', 'auditor'] },
  { id: 'rooms-inventory', label: 'nav.rooms', icon: BedDouble, roles: 'all' },
  { id: 'housekeeping', label: 'nav.housekeeping', icon: Brush, roles: ['owner', 'general_manager', 'front_desk', 'housekeeping_manager', 'housekeeper'] },
  { id: 'maintenance', label: 'nav.maintenance', icon: Wrench, roles: 'all' },
  { id: 'finance', label: 'nav.finance', icon: Wallet, roles: [...FRONT, 'accountant', 'auditor'] },
  { id: 'analytics', label: 'nav.analytics', icon: TrendingUp, roles: FINANCE },
  { id: 'communications', label: 'nav.communications', icon: MessageCircle, roles: FRONT },
  { id: 'hotels', label: 'nav.hotels', icon: Building2, roles: MANAGEMENT },
  { id: 'team-access', label: 'nav.team', icon: KeyRound, roles: MANAGEMENT },
  { id: 'settings', label: 'nav.settings', icon: Settings, roles: MANAGEMENT },
  { id: 'audit-log', label: 'nav.audit', icon: ScrollText, roles: ['owner', 'general_manager', 'auditor'] },
  { id: 'account', label: 'nav.account', icon: UserCog, roles: 'all' },
];

export const navFor = (role: AppRole) => NAV.filter((n) => n.roles === 'all' || n.roles.includes(role));
