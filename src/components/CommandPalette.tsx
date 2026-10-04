import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { BedDouble, CalendarDays, CornerDownLeft, LayoutGrid, Search } from 'lucide-react';
import type { Room } from '../types';
import type { ReservationRow } from '../lib/pmsData';
import { useI18n } from '../lib/i18n';

export interface PaletteScreen {
  id: string;
  label: string;
}

interface Props {
  screens: PaletteScreen[];
  rooms: Room[];
  reservations: ReservationRow[];
  showReservations: boolean;
  onClose: () => void;
  onNavigate: (id: string) => void;
  onSelectRoom: (room: Room) => void;
  onSelectReservation: (reservation: ReservationRow) => void;
}

type Item =
  | { kind: 'screen'; key: string; title: string; sub: string; screen: PaletteScreen }
  | { kind: 'room'; key: string; title: string; sub: string; room: Room }
  | { kind: 'reservation'; key: string; title: string; sub: string; reservation: ReservationRow };

const MAX_PER_GROUP = 8;
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const digits = (s: string) => s.replace(/\D/g, '');

// Recherche globale (Ctrl+K, « / ») sur les données déjà chargées en mémoire.
export default function CommandPalette({ screens, rooms, reservations, showReservations, onClose, onNavigate, onSelectRoom, onSelectReservation }: Props) {
  const { tr } = useI18n();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => inputRef.current?.focus(), []);

  const items = useMemo<Item[]>(() => {
    const q = norm(query.trim());
    const qDigits = digits(query);
    const out: Item[] = [];
    out.push(
      ...screens
        .filter((s) => !q || norm(s.label).includes(q))
        .slice(0, MAX_PER_GROUP)
        .map((s): Item => ({ kind: 'screen', key: `s-${s.id}`, title: s.label, sub: tr('Écran', 'Screen'), screen: s })),
    );
    if (!q) return out;
    if (showReservations) {
      out.push(
        ...reservations
          .filter((r) =>
            norm(r.code).includes(q) ||
            norm(r.guest?.full_name ?? '').includes(q) ||
            (qDigits.length >= 3 && digits(r.guest?.phone ?? '').includes(qDigits)),
          )
          .sort((a, b) => b.check_in.localeCompare(a.check_in))
          .slice(0, MAX_PER_GROUP)
          .map((r): Item => {
            const room = rooms.find((x) => x.id === r.room_id);
            return {
              kind: 'reservation',
              key: `r-${r.id}`,
              title: `${r.code} · ${r.guest?.full_name ?? '—'}`,
              sub: `${r.check_in} → ${r.check_out}${room ? tr(` · ch. ${room.number}`, ` · room ${room.number}`) : ''}`,
              reservation: r,
            };
          }),
      );
    }
    out.push(
      ...rooms
        .filter((r) => norm(r.number).includes(q))
        .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }))
        .slice(0, MAX_PER_GROUP)
        .map((r): Item => ({ kind: 'room', key: `c-${r.id}`, title: tr(`Chambre ${r.number}`, `Room ${r.number}`), sub: r.category, room: r })),
    );
    return out;
  }, [query, screens, rooms, reservations, showReservations, tr]);

  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const choose = (item: Item | undefined) => {
    if (!item) return;
    onClose();
    if (item.kind === 'screen') onNavigate(item.screen.id);
    else if (item.kind === 'room') onSelectRoom(item.room);
    else onSelectReservation(item.reservation);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (items.length ? (i + 1) % items.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (items.length ? (i - 1 + items.length) % items.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(items[active]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const Icon = { screen: LayoutGrid, room: BedDouble, reservation: CalendarDays };

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-[#09153D]/30 backdrop-blur-[2px] flex items-start justify-center p-4 pt-[12vh] no-print"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div role="dialog" aria-modal="true" aria-label={tr('Recherche globale', 'Global search')} className="bg-white rounded-[24px] border border-slate-100 shadow-2xl w-full max-w-xl overflow-hidden" onKeyDown={onKeyDown}>
        <div className="flex items-center gap-2 px-4 border-b border-slate-100">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={showReservations
              ? tr('Réservation, client, téléphone, chambre, écran…', 'Reservation, guest, phone, room, screen…')
              : tr('Chambre, écran…', 'Room, screen…')}
            aria-label={tr('Recherche globale', 'Global search')}
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-list"
            aria-activedescendant={items[active] ? `cp-${items[active].key}` : undefined}
            className="flex-1 py-4 text-sm text-slate-800 bg-transparent focus:outline-none"
          />
          <kbd className="text-[10px] font-bold text-slate-400 border border-slate-200 rounded-md px-1.5 py-0.5">Esc</kbd>
        </div>
        <ul ref={listRef} id="command-palette-list" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
          {items.length === 0 ? (
            <li className="text-xs text-slate-400 italic text-center py-8">{tr('Aucun résultat.', 'No results.')}</li>
          ) : (
            items.map((item, i) => {
              const ItemIcon = Icon[item.kind];
              return (
                <li
                  key={item.key}
                  id={`cp-${item.key}`}
                  data-index={i}
                  role="option"
                  aria-selected={i === active}
                  onMouseMove={() => setActive(i)}
                  onClick={() => choose(item)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer ${i === active ? 'bg-orange-50 text-[#09153D]' : 'text-slate-700'}`}
                >
                  <ItemIcon className={`w-4 h-4 shrink-0 ${i === active ? 'text-orange-600' : 'text-slate-400'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate">{item.title}</p>
                    <p className="text-[10px] text-slate-400 truncate">{item.sub}</p>
                  </div>
                  {i === active && <CornerDownLeft className="w-3.5 h-3.5 text-orange-600 shrink-0" />}
                </li>
              );
            })
          )}
        </ul>
        <div className="flex gap-4 px-4 py-2 border-t border-slate-100 text-[10px] text-slate-400 font-semibold">
          <span>↑ ↓ {tr('naviguer', 'navigate')}</span>
          <span>↵ {tr('ouvrir', 'open')}</span>
          <span>Esc {tr('fermer', 'close')}</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
