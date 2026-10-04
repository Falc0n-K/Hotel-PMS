// Crée un lien de paiement Stripe (carte) ou PayDunya (Wave, Orange Money…)
// pour tout ou partie du solde d'une réservation.
// Le contrôle des droits et du montant est fait par prepare_payment_link(),
// exécutée avec le jeton de l'utilisateur appelant.
import { cors, json, paydunyaBase, paydunyaHeaders, serviceClient, userClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);

  let body: { reservation_id?: string; amount?: number; provider?: 'stripe' | 'paydunya' };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Corps JSON invalide' }, 400);
  }
  const { reservation_id, amount, provider } = body;
  if (!reservation_id || !Number.isInteger(amount) || (provider !== 'stripe' && provider !== 'paydunya')) {
    return json({ error: 'reservation_id, amount (entier) et provider (stripe | paydunya) requis' }, 400);
  }
  if (provider === 'stripe' && !Deno.env.get('STRIPE_SECRET_KEY')) return json({ error: 'Stripe n’est pas configuré' }, 503);
  if (provider === 'paydunya' && !Deno.env.get('PAYDUNYA_MASTER_KEY')) return json({ error: 'PayDunya n’est pas configuré' }, 503);

  const asUser = userClient(req);
  const { data: linkId, error: prepError } = await asUser.rpc('prepare_payment_link', {
    p_reservation: reservation_id,
    p_amount: amount,
    p_provider: provider,
  });
  if (prepError) return json({ error: prepError.message }, prepError.code === '42501' ? 403 : 400);

  const db = serviceClient();
  const { data: ctx, error: ctxError } = await db
    .from('reservations')
    .select('code, guest:guests(full_name, email), property:properties(name)')
    .eq('id', reservation_id)
    .single();
  if (ctxError || !ctx) return json({ error: 'Réservation introuvable' }, 404);
  const c = ctx as unknown as { code: string; guest: { full_name: string; email: string | null } | null; property: { name: string } };

  const appUrl = Deno.env.get('APP_URL') ?? 'https://hotel-pms-mu.vercel.app';
  const description = `${c.property.name} · réservation ${c.code}`;

  try {
    let url: string;
    let ref: string;
    if (provider === 'stripe') {
      const form = new URLSearchParams({
        mode: 'payment',
        'line_items[0][quantity]': '1',
        'line_items[0][price_data][currency]': 'xof', // devise sans décimales chez Stripe
        'line_items[0][price_data][unit_amount]': String(amount),
        'line_items[0][price_data][product_data][name]': description,
        client_reference_id: linkId as string,
        'metadata[link_id]': linkId as string,
        'payment_intent_data[metadata][link_id]': linkId as string,
        success_url: `${appUrl}/?paiement=ok`,
        cancel_url: `${appUrl}/?paiement=annule`,
      });
      if (c.guest?.email) form.set('customer_email', c.guest.email);
      const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Idempotency-Key': linkId as string,
        },
        body: form,
      });
      const session = await res.json();
      if (!res.ok) throw new Error(session?.error?.message ?? `Stripe ${res.status}`);
      url = session.url;
      ref = session.id;
    } else {
      const res = await fetch(`${paydunyaBase()}/checkout-invoice/create`, {
        method: 'POST',
        headers: paydunyaHeaders(),
        body: JSON.stringify({
          invoice: { total_amount: amount, description },
          store: { name: c.property.name },
          custom_data: { link_id: linkId },
          actions: {
            cancel_url: `${appUrl}/?paiement=annule`,
            return_url: `${appUrl}/?paiement=ok`,
            callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/paydunya-ipn`,
          },
        }),
      });
      const out = await res.json();
      if (out?.response_code !== '00') throw new Error(out?.response_text ?? `PayDunya ${res.status}`);
      url = out.response_text;
      ref = out.token;
    }
    await db.from('payment_links').update({ status: 'open', checkout_url: url, provider_ref: ref }).eq('id', linkId);
    return json({ id: linkId, url });
  } catch (e) {
    await db.from('payment_links').update({ status: 'failed', last_error: (e as Error).message }).eq('id', linkId);
    return json({ error: (e as Error).message }, 502);
  }
});
