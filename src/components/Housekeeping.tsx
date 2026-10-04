import React, { useMemo, useState } from 'react';
import { Play, Check, ShieldCheck, Plus, RotateCcw } from 'lucide-react';
import type { Room } from '../types';
import type { Property } from '../lib/auth';
import type { AppRole } from '../lib/roles';
import { rpc, run, type PmsActions } from '../lib/pmsData';
import { bilingual, tr, useI18n } from '../lib/i18n';
import { supabase } from '../lib/supabase';
import { useQuery } from '../lib/query';
import { Badge, Button, Card, Empty, ErrorNote, Field, Input, Loading, Modal, PageHeader, Select, Stat, useAction, type Tone } from './ui';

interface Task {
  id: string;
  room_id: string;
  status: 'todo' | 'in_progress' | 'done' | 'inspected';
  priority: 'low' | 'medium' | 'high';
  notes: string | null;
  assigned_to: string | null;
  created_at: string;
  completed_at: string | null;
}

interface Props {
  rooms: Room[];
  property: Property;
  role: AppRole;
  userId: string;
  today: string;
  actions: PmsActions;
  onChanged: () => void;
}

const STATUS: Record<Task['status'], { label: string; tone: Tone }> = {
  todo: { get label() { return tr('À faire', 'To do'); }, tone: 'red' },
  in_progress: { get label() { return tr('En cours', 'In progress'); }, tone: 'amber' },
  done: { get label() { return tr('Terminée', 'Done'); }, tone: 'blue' },
  inspected: { get label() { return tr('Inspectée', 'Inspected'); }, tone: 'green' },
};

const PRIORITY: Record<Task['priority'], string> = bilingual<Task['priority']>({ high: ['Haute', 'High'], medium: ['Normale', 'Normal'], low: ['Basse', 'Low'] });

// Gouvernante : assigne et inspecte. Femme / valet de chambre : voit ses tâches,
// les démarre et les termine. Le statut de la chambre suit automatiquement.
export default function Housekeeping({ rooms, property, role, userId, today, actions, onChanged }: Props) {
  const { tr } = useI18n();
  const manager = ['owner', 'general_manager', 'housekeeping_manager'].includes(role);
  const canCreate = manager || role === 'front_desk';
  const [onlyMine, setOnlyMine] = useState(role === 'housekeeper');
  const [creating, setCreating] = useState(false);
  const { busy, error, run: act } = useAction();

  const tasks = useQuery(async () => {
    const data = await run(
      supabase
        .from('housekeeping_tasks')
        .select('id, room_id, status, priority, notes, assigned_to, created_at, completed_at')
        .eq('property_id', property.id)
        .or(`status.in.(todo,in_progress),completed_at.gte.${today}T00:00:00`)
        .order('created_at'),
    );
    return data as Task[];
  }, [property.id, today]);

  const team = useQuery(async () => {
    const mems = (await run(
      supabase.from('memberships').select('user_id, role').eq('property_id', property.id).in('role', ['housekeeper', 'housekeeping_manager']),
    )) as { user_id: string; role: string }[];
    if (!mems.length) return [];
    const profiles = (await run(supabase.from('profiles').select('id, full_name, email').in('id', mems.map((m) => m.user_id)))) as {
      id: string; full_name: string | null; email: string | null;
    }[];
    return profiles.map((p) => ({ id: p.id, name: p.full_name || p.email || 'Agent' }));
  }, [property.id]);

  const roomNumber = useMemo(() => new Map(rooms.map((r) => [r.id, r.number])), [rooms]);
  const people = useMemo(() => new Map((team.data ?? []).map((p) => [p.id, p.name])), [team.data]);

  const list = (tasks.data ?? []).filter((t) => !onlyMine || t.assigned_to === userId || (!t.assigned_to && role === 'housekeeper'));
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  list.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority] || a.created_at.localeCompare(b.created_at));

  const change = (fn: () => Promise<unknown>) =>
    act(async () => {
      await fn();
      await tasks.reload();
      onChanged();
    });

  const counts = {
    todo: (tasks.data ?? []).filter((t) => t.status === 'todo').length,
    progress: (tasks.data ?? []).filter((t) => t.status === 'in_progress').length,
    toInspect: (tasks.data ?? []).filter((t) => t.status === 'done').length,
    dirty: rooms.filter((r) => r.housekeeping === 'dirty').length,
  };

  return (
    <div className="fade-in-up">
      <PageHeader
        title={tr('Ménage', 'Housekeeping')}
        subtitle={tr(
          'Les départs créent les tâches automatiquement. Une chambre terminée passe « propre », puis « inspectée » après contrôle.',
          'Departures create tasks automatically. A finished room becomes “clean”, then “inspected” after checking.',
        )}
        actions={canCreate ? <Button icon={Plus} onClick={() => setCreating(true)}>{tr('Nouvelle tâche', 'New task')}</Button> : undefined}
      />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <Stat label={tr('À faire', 'To do')} value={String(counts.todo)} />
        <Stat label={tr('En cours', 'In progress')} value={String(counts.progress)} />
        <Stat label={tr('À inspecter', 'To inspect')} value={String(counts.toInspect)} />
        <Stat label={tr('Chambres sales', 'Dirty rooms')} value={String(counts.dirty)} />
      </div>

      <ErrorNote message={error ?? tasks.error} />

      <Card
        title={tr('Tâches du jour', "Today's tasks")}
        actions={
          <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
            <input type="checkbox" className="accent-orange-600" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
            {tr('Mes tâches seulement', 'My tasks only')}
          </label>
        }
      >
        {tasks.loading && !tasks.data ? (
          <Loading />
        ) : list.length === 0 ? (
          <Empty>{tr('Rien à faire pour le moment.', 'Nothing to do for now.')}</Empty>
        ) : (
          <ul className="divide-y divide-slate-100">
            {list.map((t) => {
              const mine = t.assigned_to === userId;
              return (
                <li key={t.id} className="py-3 flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex items-center gap-3 md:w-56">
                    <span className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center font-black font-mono text-slate-800">
                      {roomNumber.get(t.room_id) ?? '?'}
                    </span>
                    <div>
                      <Badge tone={STATUS[t.status].tone}>{STATUS[t.status].label}</Badge>
                      <p className="text-[10px] text-slate-400 mt-1">{tr(`Priorité ${PRIORITY[t.priority].toLowerCase()}`, `${PRIORITY[t.priority]} priority`)}</p>
                    </div>
                  </div>
                  <p className="flex-1 text-xs text-slate-600">{t.notes ?? tr('Ménage', 'Housekeeping')}</p>
                  <div className="md:w-48">
                    {manager && t.status !== 'inspected' ? (
                      <Select
                        aria-label={tr('Assigner', 'Assign')}
                        value={t.assigned_to ?? ''}
                        onChange={(e) => change(() => rpc('assign_housekeeping_task', { p_task: t.id, p_user: e.target.value || null }))}
                      >
                        <option value="">{tr('Non assignée', 'Unassigned')}</option>
                        {(team.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </Select>
                    ) : (
                      <span className="text-[11px] text-slate-500">{t.assigned_to ? people.get(t.assigned_to) ?? (mine ? tr('Vous', 'You') : tr('Assignée', 'Assigned')) : tr('Non assignée', 'Unassigned')}</span>
                    )}
                  </div>
                  <div className="flex gap-2 md:w-60 justify-end">
                    {t.status === 'todo' && (
                      <Button variant="secondary" icon={Play} busy={busy} onClick={() => change(() => actions.setTaskStatus(t.id, 'in_progress'))}>{tr('Commencer', 'Start')}</Button>
                    )}
                    {(t.status === 'todo' || t.status === 'in_progress') && (
                      <Button variant="success" icon={Check} busy={busy} onClick={() => change(() => actions.setTaskStatus(t.id, 'done'))}>{tr('Terminée', 'Done')}</Button>
                    )}
                    {manager && t.status === 'done' && (
                      <>
                        <Button variant="secondary" icon={RotateCcw} busy={busy} onClick={() => change(() => actions.setTaskStatus(t.id, 'todo'))}>{tr('À refaire', 'Redo')}</Button>
                        <Button icon={ShieldCheck} busy={busy} onClick={() => change(() => actions.setTaskStatus(t.id, 'inspected'))}>{tr('Inspectée', 'Inspected')}</Button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {creating && (
        <NewTask
          rooms={rooms}
          onClose={() => setCreating(false)}
          onSubmit={async (roomId, priority, notes) => {
            await run(supabase.from('housekeeping_tasks').insert({ property_id: property.id, room_id: roomId, priority, notes }).select('id'));
            await actions.setHousekeeping(roomId, 'dirty').catch(() => undefined);
            await tasks.reload();
            onChanged();
          }}
        />
      )}
    </div>
  );
}

function NewTask({ rooms, onClose, onSubmit }: { rooms: Room[]; onClose: () => void; onSubmit: (roomId: string, priority: Task['priority'], notes: string) => Promise<void> }) {
  const { tr } = useI18n();
  const [roomId, setRoomId] = useState(rooms[0]?.id ?? '');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [notes, setNotes] = useState('');
  const { busy, error, run: act } = useAction();
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await act(async () => {
      await onSubmit(roomId, priority, notes);
      return true;
    });
    if (ok) onClose();
  };
  return (
    <Modal title={tr('Nouvelle tâche de ménage', 'New housekeeping task')} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label={tr('Chambre', 'Room')}>
            <Select value={roomId} onChange={(e) => setRoomId(e.target.value)}>
              {rooms.map((r) => <option key={r.id} value={r.id}>{r.number} · {r.category}</option>)}
            </Select>
          </Field>
          <Field label={tr('Priorité', 'Priority')}>
            <Select value={priority} onChange={(e) => setPriority(e.target.value as Task['priority'])}>
              <option value="high">{tr('Haute', 'High')}</option>
              <option value="medium">{tr('Normale', 'Normal')}</option>
              <option value="low">{tr('Basse', 'Low')}</option>
            </Select>
          </Field>
        </div>
        <Field label={tr('Consigne', 'Instructions')}>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={tr('Recouche, changement de draps, VIP…', 'Stayover, change of sheets, VIP…')} />
        </Field>
        <ErrorNote message={error} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>{tr('Fermer', 'Close')}</Button>
          <Button type="submit" busy={busy}>{tr('Créer', 'Create')}</Button>
        </div>
      </form>
    </Modal>
  );
}
