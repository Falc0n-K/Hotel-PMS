import { useState } from 'react';
import { Mail, MessageSquare, Phone } from 'lucide-react';
import type { Property } from '../lib/auth';
import { run } from '../lib/pmsData';
import { supabase } from '../lib/supabase';
import { useQuery } from '../lib/query';
import { Badge, Card, Empty, ErrorNote, Loading, PageHeader, Select, Table, type Tone } from './ui';

interface Message {
  id: string;
  channel: 'email' | 'sms' | 'whatsapp';
  recipient: string;
  template: string;
  status: 'pending' | 'sent' | 'failed' | 'skipped';
  attempts: number;
  last_error: string | null;
  created_at: string;
  sent_at: string | null;
  reservation: { code: string } | null;
}

const TEMPLATES: Record<string, string> = {
  reservation_confirmed: 'Confirmation',
  reservation_cancelled: 'Annulation',
  arrival_reminder: 'Rappel J-1',
};

const STATUS: Record<Message['status'], { label: string; tone: Tone }> = {
  pending: { label: 'En attente', tone: 'amber' },
  sent: { label: 'Envoyé', tone: 'green' },
  failed: { label: 'Échec', tone: 'red' },
  skipped: { label: 'Non configuré', tone: 'slate' },
};

const ICONS = { email: Mail, sms: Phone, whatsapp: MessageSquare };

// Journal des messages automatiques envoyés aux clients (confirmation,
// annulation, rappel la veille de l'arrivée). Les canaux s'activent dans
// Paramètres ; les clés des prestataires se règlent côté Supabase.
export default function Communications({ property }: { property: Property }) {
  const [status, setStatus] = useState<'' | Message['status']>('');
  const messages = useQuery(async () => {
    let q = supabase
      .from('notification_outbox')
      .select('id, channel, recipient, template, status, attempts, last_error, created_at, sent_at, reservation:reservations(code)')
      .eq('property_id', property.id)
      .order('created_at', { ascending: false })
      .limit(200);
    if (status) q = q.eq('status', status);
    return (await run(q)) as unknown as Message[];
  }, [property.id, status]);

  const channels = [
    property.notify_email && 'e-mail',
    property.notify_sms && 'SMS',
    property.notify_whatsapp && 'WhatsApp',
  ].filter(Boolean);

  return (
    <div className="fade-in-up">
      <PageHeader
        title="Communications"
        subtitle={`Messages automatiques aux clients. Canaux actifs : ${channels.length ? channels.join(', ') : 'aucun'} (à régler dans Paramètres).`}
        actions={
          <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Filtrer par statut" className="w-48">
            <option value="">Tous les statuts</option>
            {(Object.keys(STATUS) as Message['status'][]).map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
          </Select>
        }
      />
      <ErrorNote message={messages.error} />
      <Card>
        {messages.loading && !messages.data ? (
          <Loading />
        ) : !messages.data?.length ? (
          <Empty>Aucun message.</Empty>
        ) : (
          <Table head={['Date', 'Canal', 'Destinataire', 'Message', 'Réservation', 'Statut']}>
            {messages.data.map((m) => {
              const Icon = ICONS[m.channel];
              return (
                <tr key={m.id}>
                  <td className="p-3 whitespace-nowrap">{new Date(m.created_at).toLocaleString('fr-FR')}</td>
                  <td className="p-3"><Icon className="w-4 h-4 text-slate-500" aria-label={m.channel} /></td>
                  <td className="p-3">{m.recipient}</td>
                  <td className="p-3">{TEMPLATES[m.template] ?? m.template}</td>
                  <td className="p-3 font-mono">{m.reservation?.code ?? '—'}</td>
                  <td className="p-3">
                    <Badge tone={STATUS[m.status].tone}>{STATUS[m.status].label}</Badge>
                    {m.last_error && <span className="block text-[10px] text-slate-400 max-w-xs truncate" title={m.last_error}>{m.last_error}</span>}
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>
    </div>
  );
}
