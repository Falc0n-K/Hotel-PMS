// Webhook Stripe : vérifie la signature puis enregistre le paiement.
// confirm_payment_link() est idempotente : un événement rejoué ne crée pas
// de second paiement.
import { json, serviceClient } from '../_shared/supabase.ts';
import { verifyStripeSignature } from '../_shared/stripe.ts';

Deno.serve(async (req) => {
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!secret) return json({ error: 'Webhook non configuré' }, 503);
  const payload = await req.text();
  if (!(await verifyStripeSignature(payload, req.headers.get('stripe-signature') ?? '', secret))) {
    return json({ error: 'Signature invalide' }, 400);
  }

  const event = JSON.parse(payload);
  if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.async_payment_succeeded') {
    return json({ received: true, ignored: event.type });
  }
  const session = event.data.object;
  if (session.payment_status !== 'paid') return json({ received: true, pending: true });
  const linkId = session.metadata?.link_id ?? session.client_reference_id;
  if (!linkId) return json({ error: 'link_id manquant' }, 400);

  const db = serviceClient();
  const { error } = await db.rpc('confirm_payment_link', {
    p_link: linkId,
    p_provider_ref: session.id,
    p_amount: session.amount_total,
    p_method: 'card',
  });
  // 500 : Stripe rejouera l'événement plus tard.
  if (error) return json({ error: error.message }, 500);
  return json({ received: true });
});
