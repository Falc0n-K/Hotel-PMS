// Vide la file notification_outbox : e-mails (Resend), SMS et WhatsApp (Twilio).
// Appelée toutes les 5 minutes par pg_cron avec l'en-tête x-cron-secret.
import { json, safeEqual, serviceClient } from '../_shared/supabase.ts';
import { render, short } from '../_shared/templates.ts';

const MAX_ATTEMPTS = 5;

interface OutboxRow {
  id: string;
  channel: 'email' | 'sms' | 'whatsapp';
  recipient: string;
  template: string;
  payload: Record<string, string | number | null>;
  attempts: number;
}

async function sendEmail(row: OutboxRow): Promise<void> {
  const key = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('MAIL_FROM');
  if (!key || !from) throw new SkipError('RESEND_API_KEY ou MAIL_FROM non configuré');
  const { subject, text } = render(row.template, row.payload);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [row.recipient], subject, text }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status} : ${(await res.text()).slice(0, 300)}`);
}

async function sendTwilio(row: OutboxRow): Promise<void> {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = row.channel === 'whatsapp' ? Deno.env.get('TWILIO_WHATSAPP_FROM') : Deno.env.get('TWILIO_SMS_FROM');
  if (!sid || !token || !from) throw new SkipError(`Twilio non configuré pour ${row.channel}`);
  const to = row.channel === 'whatsapp' ? `whatsapp:${row.recipient.replace(/\s+/g, '')}` : row.recipient.replace(/\s+/g, '');
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ From: from, To: to, Body: short(row.template, row.payload) }),
  });
  if (!res.ok) throw new Error(`Twilio ${res.status} : ${(await res.text()).slice(0, 300)}`);
}

class SkipError extends Error {}

Deno.serve(async (req) => {
  const expected = Deno.env.get('CRON_SECRET') ?? '';
  const given = req.headers.get('x-cron-secret') ?? '';
  if (!expected || !safeEqual(given, expected)) return json({ error: 'Non autorisé' }, 401);

  const db = serviceClient();
  const { data: rows, error } = await db
    .from('notification_outbox')
    .select('id, channel, recipient, template, payload, attempts')
    .eq('status', 'pending')
    .lt('attempts', MAX_ATTEMPTS)
    .order('created_at')
    .limit(50);
  if (error) return json({ error: error.message }, 500);

  const result = { sent: 0, failed: 0, skipped: 0 };
  for (const row of (rows ?? []) as OutboxRow[]) {
    try {
      if (row.channel === 'email') await sendEmail(row);
      else await sendTwilio(row);
      await db.from('notification_outbox').update({ status: 'sent', sent_at: new Date().toISOString(), attempts: row.attempts + 1, last_error: null }).eq('id', row.id);
      result.sent++;
    } catch (e) {
      const message = (e as Error).message;
      if (e instanceof SkipError) {
        await db.from('notification_outbox').update({ status: 'skipped', last_error: message }).eq('id', row.id);
        result.skipped++;
      } else {
        const attempts = row.attempts + 1;
        await db.from('notification_outbox')
          .update({ attempts, last_error: message, status: attempts >= MAX_ATTEMPTS ? 'failed' : 'pending' })
          .eq('id', row.id);
        result.failed++;
      }
    }
  }
  return json(result);
});
