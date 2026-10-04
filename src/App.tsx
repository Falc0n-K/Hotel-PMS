import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, AlertTriangle, Shield, X, FlaskConical, Search, Keyboard } from 'lucide-react';
import { RoomStatus, PMSNotification } from './types';
import { useAuth, type Membership } from './lib/auth';
import { usePropertyData, balanceOf, clearSnapshots } from './lib/pmsData';
import { APP_ROLE_LABELS, canManageReservations, canSeeFinance, uiRoleFor } from './lib/roles';
import { addDays } from './lib/dates';
import Sidebar from './components/Sidebar';
import { navFor } from './lib/nav';
import { useI18n } from './lib/i18n';
import Header from './components/Header';
import LoginScreen, { MfaChallengeScreen, NewPasswordScreen } from './components/LoginScreen';
import Onboarding from './components/Onboarding';
import { LockScreen } from './components/Modals';
import MetricCards, { type DashboardStats } from './components/MetricCards';
import RevenueChart, { type RevenuePoint } from './components/RevenueChart';
import OccupancyChart, { type OccupancyPoint } from './components/OccupancyChart';
import RoomGrid from './components/RoomGrid';
import DashboardOperations from './components/DashboardOperations';
import CommandPalette from './components/CommandPalette';
import ShortcutsHelp from './components/ShortcutsHelp';

// Écrans chargés à la demande : le bundle initial ne contient que le socle.
const ReceptionistDashboard = lazy(() => import('./components/ReceptionistDashboard'));
const RoomInventory = lazy(() => import('./components/RoomInventory'));
const BookingsDesk = lazy(() => import('./components/BookingsDesk'));
const TeamAccess = lazy(() => import('./components/TeamAccess'));
const RoomRack = lazy(() => import('./components/RoomRack'));
const Guests = lazy(() => import('./components/Guests'));
const Housekeeping = lazy(() => import('./components/Housekeeping'));
const Maintenance = lazy(() => import('./components/Maintenance'));
const Finance = lazy(() => import('./components/Finance'));
const Analytics = lazy(() => import('./components/Analytics'));
const Communications = lazy(() => import('./components/Communications'));
const Hotels = lazy(() => import('./components/Hotels'));
const Settings = lazy(() => import('./components/Settings'));
const AuditLog = lazy(() => import('./components/AuditLog'));
const Account = lazy(() => import('./components/Account'));

const APP_VERSION = '0.6.0';
const APP_ENV = import.meta.env.VITE_APP_ENV;

function FullPageLoader() {
  const { tr } = useI18n();
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">
      <Loader2 className="w-6 h-6 animate-spin" aria-label={tr('Chargement', 'Loading')} />
    </div>
  );
}

export default function App() {
  const auth = useAuth();

  if (auth.loading) return <FullPageLoader />;
  if (auth.passwordRecovery && auth.session) return <NewPasswordScreen onDone={auth.endPasswordRecovery} />;
  if (!auth.session) return <LoginScreen />;
  if (auth.needsMfa) return <MfaChallengeScreen />;
  if (auth.memberships.length === 0) return <Onboarding />;
  return <Workspace memberships={auth.memberships} />;
}

const STORAGE_KEY = 'pms.currentProperty';

// Raccourcis « g » puis une lettre.
const GOTO_KEYS: Record<string, string> = { d: 'dashboard', r: 'room-rack', b: 'bookings-desk', h: 'housekeeping', f: 'finance' };

const isTypingTarget = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));

function readStoredProperty(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function Workspace({ memberships }: { memberships: Membership[] }) {
  const { session, profile, signOut: authSignOut, refreshMemberships, aal } = useAuth();
  const { t, tr } = useI18n();
  // À la déconnexion, la copie hors ligne (données clients) est effacée du poste.
  const signOut = useCallback(async () => {
    clearSnapshots();
    await authSignOut();
  }, [authSignOut]);

  const [propertyId, setPropertyId] = useState<string>(() => {
    const stored = readStoredProperty();
    return memberships.some((m) => m.property.id === stored) ? stored! : memberships[0].property.id;
  });
  const membership = memberships.find((m) => m.property.id === propertyId) ?? memberships[0];
  const property = membership.property;
  const appRole = membership.role;
  const currentRole = uiRoleFor(appRole);
  const financeVisible = canSeeFinance(appRole);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, property.id);
    } catch {
      /* stockage indisponible : on garde le choix en mémoire */
    }
  }, [property.id]);

  const data = usePropertyData(property, financeVisible);
  const { rooms, reservations, today, actions } = data;

  const navItems = useMemo(() => navFor(appRole), [appRole]);
  const [activeConsole, setActiveConsole] = useState<string>(() =>
    ['front_desk', 'reservation_manager'].includes(appRole) ? 'reception-desk' : appRole === 'housekeeper' ? 'housekeeping' : 'dashboard',
  );
  useEffect(() => {
    if (!navItems.some((n) => n.id === activeConsole)) setActiveConsole(navItems[0].id);
  }, [navItems, activeConsole]);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSessionLocked, setIsSessionLocked] = useState(false);
  const [notifications, setNotifications] = useState<PMSNotification[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [roomFocus, setRoomFocus] = useState<{ query: string } | undefined>(undefined);
  const [bookingFocus, setBookingFocus] = useState<{ id: string; nonce: number } | undefined>(undefined);
  const consoleRef = useRef<HTMLDivElement>(null);

  const userName = profile?.full_name || session?.user.email || tr('Utilisateur', 'User');
  const userEmail = session?.user.email ?? '';
  const navItem = navItems.find((c) => c.id === activeConsole);
  const consoleLabel = navItem ? t(navItem.label) : '';

  // ── Recherche globale et raccourcis clavier ───────────────────────────
  const gotos = useMemo(
    () => Object.entries(GOTO_KEYS).filter(([, id]) => navItems.some((n) => n.id === id)).map(([key, id]) => ({ key, id, label: t(navItems.find((n) => n.id === id)!.label) })),
    [navItems, t],
  );
  useEffect(() => {
    let pendingG = 0;
    const onKey = (e: KeyboardEvent) => {
      if (isSessionLocked) return;
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setHelpOpen(false);
        setPaletteOpen((o) => !o);
        return;
      }
      if (paletteOpen || helpOpen || e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target)) return;
      if (document.querySelector('[role="dialog"]')) return;
      if (pendingG && Date.now() - pendingG < 1500) {
        pendingG = 0;
        const target = gotos.find((g) => g.key === e.key.toLowerCase());
        if (target) {
          e.preventDefault();
          setActiveConsole(target.id);
        }
        return;
      }
      if (e.key === '/') {
        e.preventDefault();
        setPaletteOpen(true);
      } else if (e.key === '?') {
        e.preventDefault();
        setHelpOpen(true);
      } else if (e.key === 'g') {
        pendingG = Date.now();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isSessionLocked, paletteOpen, helpOpen, gotos]);

  useEffect(() => {
    if (activeConsole !== 'rooms-inventory') setRoomFocus(undefined);
  }, [activeConsole]);


  useEffect(() => {
    document.title = `${consoleLabel} · ${property.name}`;
  }, [consoleLabel, property.name]);

  const handleAddNotification = useCallback(
    (title: string, message: string, type: 'réservation' | 'paiement' | 'alerte' | 'info') => {
      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          title,
          message,
          type,
          read: false,
          time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        },
        ...prev,
      ]);
    },
    [],
  );

  const runAction = useCallback(async (fn: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await fn();
      return true;
    } catch (e) {
      setActionError((e as Error).message);
      return false;
    }
  }, []);

  // Point d'entrée unique des changements de statut demandés par les écrans
  // (grille, inventaire, console réception). Chaque transition est traduite
  // en opération serveur : check-in, check-out, annulation ou statut ménage.
  const handleUpdateRoomStatus = useCallback(
    (roomId: string, next: RoomStatus) => {
      const room = rooms.find((r) => r.id === roomId);
      if (!room || room.status === next) return;

      if (next === 'occupied') {
        if (room.status !== 'reserved' || !room.reservationId) {
          setActionError(tr('Une chambre ne passe « occupée » que par le check-in d’une réservation.', 'A room only becomes “occupied” through a reservation check-in.'));
          return;
        }
        runAction(() => actions.checkIn(room.reservationId!)).then(
          (ok) => ok && handleAddNotification(tr('Arrivée enregistrée', 'Check-in recorded'), tr(`${room.guestName} — chambre ${room.number}.`, `${room.guestName} — room ${room.number}.`), 'réservation'),
        );
        return;
      }
      if (room.status === 'occupied' && room.reservationId) {
        runAction(() => actions.checkOut(room.reservationId!)).then(
          (ok) => ok && handleAddNotification(tr('Départ enregistré', 'Check-out recorded'), tr(`Chambre ${room.number} transmise au ménage.`, `Room ${room.number} sent to housekeeping.`), 'info'),
        );
        return;
      }
      if (room.status === 'reserved' && room.reservationId && next === 'available') {
        if (!confirm(tr(`Annuler la réservation de ${room.guestName} (chambre ${room.number}) ?`, `Cancel the reservation of ${room.guestName} (room ${room.number})?`))) return;
        runAction(() => actions.cancel(room.reservationId!));
        return;
      }
      if (next === 'reserved') {
        setActionError(tr('Les réservations se créent depuis le Guichet Réservations.', 'Reservations are created from the Reservations desk.'));
        return;
      }
      if (next === 'maintenance') {
        const reason = prompt(tr(`Motif de mise hors service de la chambre ${room.number} :`, `Reason for taking room ${room.number} out of service:`));
        if (reason === null) return;
        runAction(() => actions.setHousekeeping(room.id, 'out_of_order', reason));
        return;
      }
      runAction(() => actions.setHousekeeping(room.id, next === 'not-ready' ? 'dirty' : 'clean'));
    },
    [rooms, actions, runAction, handleAddNotification, tr],
  );

  // ── Indicateurs du tableau de bord, tous dérivés des réservations ──────
  const stats: DashboardStats = useMemo(() => {
    const monthStart = `${today.slice(0, 7)}-01`;
    const arrivals = reservations.filter((r) => r.check_in === today && r.status !== 'cancelled');
    const departures = reservations.filter((r) => r.check_out === today && r.status !== 'cancelled');
    const occupied = rooms.filter((r) => r.status === 'occupied').length;
    return {
      monthRevenue: financeVisible
        ? data.payments.filter((p) => p.created_at.slice(0, 10) >= monthStart).reduce((s, p) => s + p.amount, 0)
        : null,
      newReservations7d: reservations.filter((r) => r.created_at.slice(0, 10) >= addDays(today, -6)).length,
      arrivalsDone: arrivals.filter((r) => r.status === 'checked_in' || r.status === 'checked_out').length,
      arrivalsExpected: arrivals.filter((r) => r.status !== 'no_show').length,
      departuresDone: departures.filter((r) => r.status === 'checked_out').length,
      departuresExpected: departures.filter((r) => r.status === 'checked_in' || r.status === 'checked_out').length,
      occupancyRate: rooms.length ? Math.round((occupied / rooms.length) * 100) : 0,
    };
  }, [today, reservations, rooms, data.payments, financeVisible]);

  const occupancyTrend: OccupancyPoint[] = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const day = addDays(today, i - 6);
      const occupiedRooms = new Set(
        reservations
          .filter((r) => ['checked_in', 'checked_out'].includes(r.status) && r.check_in <= day && r.check_out > day)
          .map((r) => r.room_id),
      ).size;
      const label = new Date(`${day}T00:00:00Z`)
        .toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' })
        .replace('.', '');
      return { day: label, occupied: occupiedRooms, available: Math.max(rooms.length - occupiedRooms, 0) };
    });
  }, [today, reservations, rooms.length]);

  const revenueTrend: RevenuePoint[] = useMemo(() => {
    const base = new Date(`${today.slice(0, 7)}-01T00:00:00Z`);
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(base);
      d.setUTCMonth(d.getUTCMonth() - (5 - i));
      const key = d.toISOString().slice(0, 7);
      return {
        month: d.toLocaleDateString('fr-FR', { month: 'short', timeZone: 'UTC' }).replace('.', ''),
        revenue: data.payments.filter((p) => p.created_at.slice(0, 7) === key).reduce((s, p) => s + p.amount, 0),
      };
    });
  }, [today, data.payments]);

  const renderConsole = () => {
    switch (activeConsole) {
      case 'reception-desk':
        return (
          <ReceptionistDashboard
            rooms={rooms}
            today={today}
            currentHotel={property.name}
            currentRole={currentRole}
            onUpdateRoomStatus={handleUpdateRoomStatus}
            onAddNotification={handleAddNotification}
            onNavigate={setActiveConsole}
          />
        );
      case 'dashboard':
        return (
          <div className="fade-in-up">
            <MetricCards stats={stats} />
            <div className="flex flex-col xl:flex-row gap-6 mb-8 w-full">
              {financeVisible ? (
                <RevenueChart data={revenueTrend} />
              ) : (
                <div className="bg-slate-100/50 p-6 rounded-2xl border border-dashed border-slate-200 flex-1 flex flex-col items-center justify-center text-center py-12 min-h-[260px]">
                  <Shield className="w-10 h-10 text-slate-400 mb-3" />
                  <h5 className="font-bold text-slate-700">{tr('Données financières non accessibles', 'Financial data not accessible')}</h5>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-sm">
                    {tr(
                      `Votre rôle (${APP_ROLE_LABELS[appRole]}) ne donne pas accès aux encaissements. Ce masquage est appliqué par le serveur.`,
                      `Your role (${APP_ROLE_LABELS[appRole]}) does not give access to payments. This restriction is enforced by the server.`,
                    )}
                  </p>
                </div>
              )}
              <OccupancyChart data={occupancyTrend} totalCapacity={rooms.length} />
            </div>
            <RoomGrid rooms={rooms} onUpdateRoomStatus={handleUpdateRoomStatus} searchQuery={searchQuery} />
            <DashboardOperations
              today={today}
              rooms={rooms}
              reservations={reservations}
              tasks={data.tasks}
              showBalances={financeVisible || canManageReservations(appRole)}
              canCompleteTasks={['owner', 'general_manager', 'housekeeping_manager', 'housekeeper'].includes(appRole)}
              onCompleteTask={actions.completeTask}
            />
          </div>
        );
      case 'rooms-inventory':
        return (
          <RoomInventory
            rooms={rooms}
            currentHotel={property.name}
            currentRole={currentRole}
            onUpdateRoomStatus={handleUpdateRoomStatus}
            onUpdateRoomDetails={(roomId, fields) => {
              const room = rooms.find((r) => r.id === roomId);
              if (!room) return;
              if (fields.nightlyRate !== undefined && fields.nightlyRate !== room.nightlyRate && room.roomTypeId) {
                runAction(() => actions.updateRoomTypeRate(room.roomTypeId!, fields.nightlyRate!));
              }
              if (fields.status && fields.status !== room.status) handleUpdateRoomStatus(roomId, fields.status);
            }}
            focusSearch={roomFocus}
            onAddRoom={(r) => runAction(() => actions.addRoom(r.number, r.floor, r.category, r.nightlyRate))}
            onDeleteRoom={(roomId) => runAction(() => actions.deleteRoom(roomId))}
          />
        );
      case 'room-rack':
        return <RoomRack rooms={rooms} reservations={reservations} ratePlans={data.ratePlans} property={property} role={appRole} today={today} actions={actions} />;
      case 'bookings-desk':
        return <BookingsDesk rooms={rooms} reservations={reservations} ratePlans={data.ratePlans} property={property} role={appRole} today={today} actions={actions} focus={bookingFocus} />;
      case 'guests':
        return <Guests property={property} role={appRole} />;
      case 'housekeeping':
        return <Housekeeping rooms={rooms} property={property} role={appRole} userId={session!.user.id} today={today} actions={actions} onChanged={data.reload} />;
      case 'maintenance':
        return <Maintenance rooms={rooms} property={property} role={appRole} today={today} onChanged={data.reload} />;
      case 'finance':
        return <Finance property={property} role={appRole} userId={session!.user.id} today={today} onChanged={data.reload} />;
      case 'analytics':
        return <Analytics property={property} roomCount={rooms.filter((r) => r.status !== 'maintenance').length} today={today} />;
      case 'communications':
        return <Communications property={property} />;
      case 'hotels':
        return <Hotels memberships={memberships} currentId={property.id} onSwitch={setPropertyId} onAdded={refreshMemberships} />;
      case 'team-access':
        return <TeamAccess property={property} myRole={appRole} myUserId={session!.user.id} />;
      case 'settings':
        return (
          <Settings
            property={property}
            roomTypes={data.roomTypes}
            ratePlans={data.ratePlans}
            rooms={data.rooms}
            aal2={aal === 'aal2'}
            onChanged={async () => {
              await refreshMemberships();
              await data.reload();
            }}
          />
        );
      case 'audit-log':
        return <AuditLog property={property} today={today} />;
      case 'account':
        return <Account />;
      default:
        return null;
    }
  };

  const unpaidInHouse = reservations.filter((r) => r.status === 'checked_in' && balanceOf(r) > 0).length;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex">
      <Sidebar
        items={navItems}
        roleLabel={APP_ROLE_LABELS[appRole]}
        activeConsole={activeConsole}
        onConsoleSelect={setActiveConsole}
        onLockSession={() => setIsSessionLocked(true)}
        onSignOut={signOut}
        properties={memberships.map((m) => m.property)}
        currentPropertyId={property.id}
        onPropertyChange={(id) => {
          setPropertyId(id);
          setNotifications([]);
          setActionError(null);
        }}
        userName={userName}
        userEmail={userEmail}
      />

      <main className="flex-grow pl-72 min-h-screen flex flex-col">
        <Header
          title={consoleLabel}
          userName={userName}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          notifications={notifications}
          onMarkNotificationRead={(id) => setNotifications((p) => p.map((n) => (n.id === id ? { ...n, read: true } : n)))}
          onClearNotification={(id) => setNotifications((p) => p.filter((n) => n.id !== id))}
        />

        <div className="p-8 flex-grow flex flex-col max-w-[1600px] w-full mx-auto">
          {data.error && (
            <Banner tone="red" onClose={data.reload} closeLabel={tr('Réessayer', 'Retry')}>
              {tr('Impossible de charger les données :', 'Unable to load data:')} {data.error}
            </Banner>
          )}
          {actionError && (
            <Banner tone="red" onClose={() => setActionError(null)}>
              {actionError}
            </Banner>
          )}
          {APP_ENV && APP_ENV !== 'production' && (
            <Banner tone="amber">{t('shell.staging')}{tr(' : environnement de test.', ': test environment.')}</Banner>
          )}
          {data.offline && <Banner tone="amber">{t('shell.offline')}</Banner>}
          {property.require_mfa && aal !== 'aal2' && ['owner', 'general_manager', 'accountant'].includes(appRole) && (
            <Banner tone="red">
              {tr(
                'Cet établissement exige la double authentification pour votre rôle : activez-la dans « Mon compte », puis reconnectez-vous.',
                'This property requires two-factor authentication for your role: enable it in “My account”, then sign in again.',
              )}
            </Banner>
          )}
          {unpaidInHouse > 0 && (activeConsole === 'bookings-desk' || activeConsole === 'reception-desk') && canManageReservations(appRole) && (
            <Banner tone="amber">
              {tr(
                `${unpaidInHouse} séjour${unpaidInHouse > 1 ? 's' : ''} en cours avec un solde à encaisser avant le départ.`,
                `${unpaidInHouse} in-house stay${unpaidInHouse > 1 ? 's' : ''} with a balance to collect before departure.`,
              )}
            </Banner>
          )}

          {data.loading ? (
            <div className="flex-grow flex items-center justify-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" aria-label={tr('Chargement', 'Loading')} />
            </div>
          ) : (
            <Suspense
              fallback={
                <div className="flex-grow flex items-center justify-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin" aria-label={tr('Chargement', 'Loading')} />
                </div>
              }
            >
              <div ref={consoleRef} className="contents">{renderConsole()}</div>
            </Suspense>
          )}
        </div>

        <footer className="h-14 border-t border-slate-100 flex items-center justify-between px-8 text-[11px] text-slate-400 bg-white/50">
          <span>Senegal Hotels PMS © {today.slice(0, 4)}</span>
          <span className="flex items-center gap-3">
            <button onClick={() => setPaletteOpen(true)} className="flex items-center gap-1.5 font-semibold hover:text-slate-700 cursor-pointer" aria-label={tr('Recherche globale', 'Global search')}>
              <Search className="w-3.5 h-3.5" />
              {tr('Rechercher', 'Search')}
              <kbd className="text-[10px] font-bold border border-slate-200 rounded px-1">Ctrl K</kbd>
            </button>
            <button onClick={() => setHelpOpen(true)} className="flex items-center gap-1.5 font-semibold hover:text-slate-700 cursor-pointer" aria-label={tr('Raccourcis clavier', 'Keyboard shortcuts')}>
              <Keyboard className="w-3.5 h-3.5" />
              <kbd className="text-[10px] font-bold border border-slate-200 rounded px-1">?</kbd>
            </button>
            <span>Version {APP_VERSION}</span>
          </span>
        </footer>
      </main>

      {paletteOpen && !isSessionLocked && (
        <CommandPalette
          screens={navItems.map((n) => ({ id: n.id, label: t(n.label) }))}
          rooms={rooms}
          reservations={reservations}
          showReservations={navItems.some((n) => n.id === 'bookings-desk')}
          onClose={() => setPaletteOpen(false)}
          onNavigate={setActiveConsole}
          onSelectRoom={(room) => {
            setRoomFocus({ query: room.number });
            setActiveConsole('rooms-inventory');
          }}
          onSelectReservation={(r) => {
            setBookingFocus({ id: r.id, nonce: Date.now() });
            setActiveConsole('bookings-desk');
          }}
        />
      )}
      {helpOpen && !isSessionLocked && <ShortcutsHelp gotos={gotos} onClose={() => setHelpOpen(false)} />}

      <LockScreen
        isOpen={isSessionLocked}
        onUnlock={() => setIsSessionLocked(false)}
        onSignOut={() => {
          setIsSessionLocked(false);
          signOut();
        }}
        userName={userName}
        email={userEmail}
      />
    </div>
  );
}

function Banner({
  tone,
  children,
  onClose,
  closeLabel,
  icon,
}: {
  tone: 'red' | 'amber';
  children: React.ReactNode;
  onClose?: () => void;
  closeLabel?: string;
  icon?: 'demo';
}) {
  const { tr } = useI18n();
  const styles = tone === 'red' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-800';
  const Icon = icon === 'demo' ? FlaskConical : AlertTriangle;
  return (
    <div role={tone === 'red' ? 'alert' : 'status'} className={`mb-6 p-4 border rounded-2xl flex items-start justify-between gap-3 text-xs ${styles}`}>
      <div className="flex items-start gap-2.5">
        <Icon className="w-4 h-4 shrink-0 mt-0.5" />
        <span className="font-semibold leading-relaxed">{children}</span>
      </div>
      {onClose && (
        <button onClick={onClose} className="font-bold shrink-0 flex items-center gap-1 cursor-pointer" aria-label={closeLabel ?? tr('Fermer', 'Close')}>
          {closeLabel ?? <X className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
}

