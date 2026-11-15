import React, { useState } from 'react';
import { Plus, Building2, ArrowRight } from 'lucide-react';
import type { Membership } from '../lib/auth';
import { APP_ROLE_LABELS } from '../lib/roles';
import { rpc } from '../lib/pmsData';
import { Button, Card, ErrorNote, Field, Input, Modal, PageHeader, useAction } from './ui';
import { useI18n } from '../lib/i18n';

interface Props {
  memberships: Membership[];
  currentId: string;
  onSwitch: (id: string) => void;
  onAdded: () => Promise<void>;
}

// Établissements accessibles à l'utilisateur. Chaque hôtel a ses propres
// données, rôles, tarifs et numérotation de factures.
export default function Hotels({ memberships, currentId, onSwitch, onAdded }: Props) {
  const { tr } = useI18n();
  const [adding, setAdding] = useState(false);
  const ownerOrgs = [...new Set(memberships.filter((m) => m.role === 'owner').map((m) => m.property.organization_id))];

  return (
    <div className="fade-in-up">
      <PageHeader
        title={tr('Établissements', 'Properties')}
        subtitle={tr('Chaque établissement est isolé : données, équipe, tarifs et factures lui sont propres.', 'Each property is isolated: its data, team, rates and invoices are its own.')}
        actions={ownerOrgs.length ? <Button icon={Plus} onClick={() => setAdding(true)}>{tr('Ajouter un établissement', 'Add a property')}</Button> : undefined}
      />
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {memberships.map(({ property: p, role }) => (
          <Card key={p.id} className={p.id === currentId ? 'ring-2 ring-orange-500/40' : ''}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900">{p.name}</p>
                <p className="text-[11px] text-slate-500">{[p.city, p.code].filter(Boolean).join(' · ')}</p>
                <p className="text-[11px] text-slate-500 mt-1">{tr('Votre rôle :', 'Your role:')} {APP_ROLE_LABELS[role]}</p>
              </div>
            </div>
            {p.id !== currentId && (
              <Button variant="secondary" icon={ArrowRight} className="mt-4 w-full" onClick={() => onSwitch(p.id)}>{tr('Ouvrir', 'Open')}</Button>
            )}
          </Card>
        ))}
      </div>
      {adding && <AddProperty orgId={ownerOrgs[0]} onClose={() => setAdding(false)} onAdded={onAdded} />}
    </div>
  );
}

function AddProperty({ orgId, onClose, onAdded }: { orgId: string; onClose: () => void; onAdded: () => Promise<void> }) {
  const { tr } = useI18n();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [city, setCity] = useState('');
  const { busy, error, run: act } = useAction();
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await act(async () => {
      await rpc('add_property', { p_org: orgId, p_name: name, p_code: code, p_city: city || null });
      await onAdded();
      return true;
    });
    if (ok) onClose();
  };
  return (
    <Modal title={tr('Nouvel établissement', 'New property')} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label={tr('Nom', 'Name')}><Input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Code" hint={tr('2 à 6 lettres ou chiffres (numérotation des factures)', '2 to 6 letters or digits (invoice numbering)')}>
            <Input required minLength={2} value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} />
          </Field>
          <Field label={tr('Ville', 'City')}><Input value={city} onChange={(e) => setCity(e.target.value)} /></Field>
        </div>
        <ErrorNote message={error} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>{tr('Fermer', 'Close')}</Button>
          <Button type="submit" busy={busy}>{tr('Créer', 'Create')}</Button>
        </div>
      </form>
    </Modal>
  );
}
