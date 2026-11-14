import { useState } from 'react';
import { Mail, MessageSquare, Phone } from 'lucide-react';
import type { Property } from '../lib/auth';
import { run } from '../lib/pmsData';
import { bilingual, tr, useI18n } from '../lib/i18n';
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

const TEMPLATES: Record<string, string> = bilingual({
  reservation_confirmed: ['Confirmation', 'Confirmation'],
  reservation_cancelled: ['Annulation', 'Cancellation'],
  arrival_reminder: ['Rappel J-1', 'Day-before reminder'],
});

const STATUS: Record<Message['status'], { label: string; tone: Tone }> = {
  pending: { get label() { return tr('En attente', 'Pending'); }, tone: 'amber' },
  sent: { get label() { return tr('Envoyé', 'Sent'); }, tone: 'green' },
  failed: { get label() { return tr('Échec', 'Failed'); }, tone: 'red' },
  skipped: { get label() { return tr('Non configuré', 'Not configured'); }, tone: 'slate' },
};

const ICONS = { email: Mail, sms: Phone, whatsapp: MessageSquare };

// Journal des messages automatiques envoyés aux clients (confirmation,
// annulation, rappel la veille de l'arrivée). Les canaux s'activent dans
// Paramètres ; les clés des prestataires se règlent côté Supabase.
export default function Communications({ property }: { property: Property }) {
  const { lang, tr } = useI18n();
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
    property.notify_email && tr('e-mail', 'email'),
    property.notify_sms && 'SMS',
    property.notify_whatsapp && 'WhatsApp',
  ].filter(Boolean);

  return (
    <div className="fade-in-up">
      <PageHeader
        title={tr('Communications', 'Messages')}
        subtitle={tr(
          `Messages automatiques aux clients. Canaux actifs : ${channels.length ? channels.join(', ') : 'aucun'} (à régler dans Paramètres).`,
          `Automatic messages to guests. Active channels: ${channels.length ? channels.join(', ') : 'none'} (set in Settings).`,
        )}
        actions={
          <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label={tr('Filtrer par statut', 'Filter by status')} className="w-48">
            <option value="">{tr('Tous les statuts', 'All statuses')}</option>
            {(Object.keys(STATUS) as Message['status'][]).map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
          </Select>
        }
      />
      <ErrorNote message={messages.error} />
      <Card>
        {messages.loading && !messages.data ? (
          <Loading />
        ) : !messages.data?.length ? (
          <Empty>{tr('Aucun message.', 'No messages.')}</Empty>
        ) : (
          <Table head={[tr('Date', 'Date'), tr('Canal', 'Channel'), tr('Destinataire', 'Recipient'), tr('Message', 'Message'), tr('Réservation', 'Reservation'), tr('Statut', 'Status')]}>
            {messages.data.map((m) => {
              const Icon = ICONS[m.channel];
              return (
                <tr key={m.id}>
                  <td className="p-3 whitespace-nowrap">{new Date(m.created_at).toLocaleString(lang === 'en' ? 'en-GB' : 'fr-FR')}</td>
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
