import React, { useMemo, useState } from 'react';
import { Plus, Wrench, CheckCircle2, Play } from 'lucide-react';
import type { Room } from '../types';
import type { Property } from '../lib/auth';
import type { AppRole } from '../lib/roles';
import { rpc, run } from '../lib/pmsData';
import { tr, useI18n } from '../lib/i18n';
import { supabase } from '../lib/supabase';
import { useQuery } from '../lib/query';
import { addDays, formatDate } from '../lib/dates';
import { Badge, Button, Card, Checkbox, Empty, ErrorNote, Field, Input, Loading, Modal, PageHeader, Select, Tabs, Textarea, useAction, type Tone } from './ui';

interface Order {
  id: string;
  room_id: string | null;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'in_progress' | 'resolved';
  blocks_from: string | null;
  blocks_to: string | null;
  resolution: string | null;
  created_at: string;
  resolved_at: string | null;
}

interface Props {
  rooms: Room[];
  property: Property;
  role: AppRole;
  today: string;
  onChanged: () => void;
}

const STATUS: Record<Order['status'], { label: string; tone: Tone }> = {
  open: { get label() { return tr('Ouvert', 'Open'); }, tone: 'red' },
  in_progress: { get label() { return tr('En cours', 'In progress'); }, tone: 'amber' },
  resolved: { get label() { return tr('Résolu', 'Resolved'); }, tone: 'green' },
};

// Tout le personnel peut signaler une panne. Retirer une chambre de la vente
// (blocage daté) est réservé à la direction, la gouvernante et la maintenance.
export default function Maintenance({ rooms, property, role, today, onChanged }: Props) {
  const { tr } = useI18n();
  const canHandle = ['owner', 'general_manager', 'housekeeping_manager', 'maintenance'].includes(role);
  const [tab, setTab] = useState<'open' | 'resolved'>('open');
  const [creating, setCreating] = useState(false);
  const { busy, error, run: act } = useAction();

  const orders = useQuery(async () => {
    const q = supabase
      .from('maintenance_orders')
      .select('id, room_id, title, description, priority, status, blocks_from, blocks_to, resolution, created_at, resolved_at')
      .eq('property_id', property.id)
      .order('created_at', { ascending: false });
    return (await run(tab === 'open' ? q.neq('status', 'resolved') : q.eq('status', 'resolved').limit(100))) as Order[];
  }, [property.id, tab]);

  const roomNumber = useMemo(() => new Map(rooms.map((r) => [r.id, r.number])), [rooms]);

  const update = (o: Order, status: Order['status']) =>
    act(async () => {
      let resolution: string | null = null;
      if (status === 'resolved') {
        resolution = prompt(tr('Intervention réalisée :', 'Work carried out:'));
        if (resolution === null) return;
      }
      await rpc('update_maintenance_order', { p_order: o.id, p_status: status, p_resolution: resolution });
      await orders.reload();
      onChanged();
    });

  return (
    <div className="fade-in-up">
      <PageHeader
        title={tr('Maintenance', 'Maintenance')}
        subtitle={tr('Signalements, interventions et chambres retirées de la vente sur une période.', 'Issue reports, work orders and rooms taken out of sale for a period.')}
        actions={<Button icon={Plus} onClick={() => setCreating(true)}>{tr('Signaler', 'Report')}</Button>}
      />
      <Tabs<'open' | 'resolved'> value={tab} onChange={setTab} tabs={[{ id: 'open', label: tr('En cours', 'In progress') }, { id: 'resolved', label: tr('Résolus', 'Resolved') }]} />
      <ErrorNote message={error ?? orders.error} />
      <Card>
        {orders.loading && !orders.data ? (
          <Loading />
        ) : !orders.data?.length ? (
          <Empty>{tr('Aucun ordre de travail.', 'No work orders.')}</Empty>
        ) : (
          <ul className="divide-y divide-slate-100">
            {orders.data.map((o) => (
              <li key={o.id} className="py-3 flex flex-col md:flex-row md:items-center gap-3">
                <span className="w-12 h-12 shrink-0 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center font-black font-mono text-slate-800">
                  {o.room_id ? roomNumber.get(o.room_id) ?? '?' : <Wrench className="w-4 h-4 text-slate-400" />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800">{o.title}</p>
                  {o.description && <p className="text-xs text-slate-500">{o.description}</p>}
                  <div className="flex flex-wrap gap-2 mt-1">
                    <Badge tone={STATUS[o.status].tone}>{STATUS[o.status].label}</Badge>
                    {o.priority === 'high' && <Badge tone="red">{tr('Urgent', 'Urgent')}</Badge>}
                    {o.blocks_from && (
                      <Badge tone="violet">{tr(`Hors vente du ${formatDate(o.blocks_from)} au ${formatDate(o.blocks_to ?? undefined)}`, `Out of sale from ${formatDate(o.blocks_from)} to ${formatDate(o.blocks_to ?? undefined)}`)}</Badge>
                    )}
                    <span className="text-[10px] text-slate-400">{tr('Signalé le', 'Reported on')} {formatDate(o.created_at.slice(0, 10))}</span>
                  </div>
                  {o.resolution && <p className="text-[11px] text-emerald-700 mt-1">{tr('Intervention :', 'Work done:')} {o.resolution}</p>}
                </div>
                {canHandle && o.status !== 'resolved' && (
                  <div className="flex gap-2">
                    {o.status === 'open' && <Button variant="secondary" icon={Play} busy={busy} onClick={() => update(o, 'in_progress')}>{tr('Prendre en charge', 'Take on')}</Button>}
                    <Button variant="success" icon={CheckCircle2} busy={busy} onClick={() => update(o, 'resolved')}>{tr('Résolu', 'Resolved')}</Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {creating && (
        <ReportModal
          rooms={rooms}
          today={today}
          canBlock={canHandle}
          onClose={() => setCreating(false)}
          onSubmit={async (v) => {
            await rpc('report_maintenance', {
              p_property: property.id,
              p_room: v.roomId || null,
              p_title: v.title,
              p_description: v.description || null,
              p_priority: v.priority,
              p_blocks_from: v.block ? v.from : null,
              p_blocks_to: v.block ? v.to : null,
            });
            await orders.reload();
            onChanged();
          }}
        />
      )}
    </div>
  );
}

interface ReportValues {
  roomId: string;
  title: string;
  description: string;
  priority: Order['priority'];
  block: boolean;
  from: string;
  to: string;
}

function ReportModal({ rooms, today, canBlock, onClose, onSubmit }: { rooms: Room[]; today: string; canBlock: boolean; onClose: () => void; onSubmit: (v: ReportValues) => Promise<void> }) {
  const { tr } = useI18n();
  const [v, setV] = useState<ReportValues>({ roomId: '', title: '', description: '', priority: 'medium', block: false, from: today, to: addDays(today, 1) });
  const { busy, error, run: act } = useAction();
  const set = <K extends keyof ReportValues>(k: K, value: ReportValues[K]) => setV((p) => ({ ...p, [k]: value }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await act(async () => {
      await onSubmit(v);
      return true;
    });
    if (ok) onClose();
  };
  return (
    <Modal title={tr('Signaler un problème', 'Report an issue')} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label={tr('Chambre', 'Room')}>
            <Select value={v.roomId} onChange={(e) => set('roomId', e.target.value)}>
              <option value="">{tr('Parties communes', 'Common areas')}</option>
              {rooms.map((r) => <option key={r.id} value={r.id}>{r.number} · {r.category}</option>)}
            </Select>
          </Field>
          <Field label={tr('Priorité', 'Priority')}>
            <Select value={v.priority} onChange={(e) => set('priority', e.target.value as Order['priority'])}>
              <option value="high">{tr('Urgent', 'Urgent')}</option>
              <option value="medium">{tr('Normal', 'Normal')}</option>
              <option value="low">{tr('Faible', 'Low')}</option>
            </Select>
          </Field>
        </div>
        <Field label={tr('Problème', 'Issue')}>
          <Input required minLength={3} value={v.title} onChange={(e) => set('title', e.target.value)} placeholder={tr('Climatisation en panne, fuite…', 'Air conditioning down, leak…')} />
        </Field>
        <Field label={tr('Détails', 'Details')}>
          <Textarea rows={2} value={v.description} onChange={(e) => set('description', e.target.value)} />
        </Field>
        {canBlock && v.roomId && (
          <div className="bg-slate-50 rounded-xl p-3 space-y-2">
            <Checkbox label={tr('Retirer la chambre de la vente sur une période', 'Take the room out of sale for a period')} checked={v.block} onChange={(e) => set('block', e.target.checked)} />
            {v.block && (
              <div className="grid grid-cols-2 gap-3">
                <Field label={tr('Du', 'From')}><Input type="date" value={v.from} min={today} onChange={(e) => set('from', e.target.value)} /></Field>
                <Field label={tr('Au (exclu)', 'To (exclusive)')}><Input type="date" value={v.to} min={addDays(v.from, 1)} onChange={(e) => set('to', e.target.value)} /></Field>
              </div>
            )}
          </div>
        )}
        <ErrorNote message={error} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>{tr('Fermer', 'Close')}</Button>
          <Button type="submit" busy={busy}>{tr('Enregistrer', 'Save')}</Button>
        </div>
      </form>
    </Modal>
  );
}
