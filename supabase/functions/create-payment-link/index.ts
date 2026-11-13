// Crée un lien de paiement Stripe (carte) ou PayDunya (Wave, Orange Money…)
// pour tout ou partie du solde d'une réservation.
// Le contrôle des droits et du montant est fait par prepare_payment_link(),
// exécutée avec le jeton de l'utilisateur appelant.
import { cors, json, serviceClient, userClient } from '../_shared/supabase.ts';
import { createCheckout, providerConfigured } from '../_shared/payments.ts';

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
  if (!providerConfigured(provider)) return json({ error: `${provider === 'stripe' ? 'Stripe' : 'PayDunya'} n’est pas configuré` }, 503);

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
    const { url, ref } = await createCheckout({
      linkId: linkId as string,
      amount: amount!,
      provider,
      description,
      storeName: c.property.name,
      customerEmail: c.guest?.email,
      returnUrl: `${appUrl}/?paiement=ok`,
      cancelUrl: `${appUrl}/?paiement=annule`,
    });
    await db.from('payment_links').update({ status: 'open', checkout_url: url, provider_ref: ref }).eq('id', linkId);
    return json({ id: linkId, url });
  } catch (e) {
    await db.from('payment_links').update({ status: 'failed', last_error: (e as Error).message }).eq('id', linkId);
    return json({ error: (e as Error).message }, 502);
  }
});
