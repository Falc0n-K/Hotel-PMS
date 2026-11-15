// Notification de paiement PayDunya (IPN). On ne fait pas confiance au corps
// reçu : le hash est vérifié, puis l'état est relu auprès de PayDunya.
import { json, paydunyaBase, paydunyaHeaders, safeEqual, serviceClient, sha512Hex } from '../_shared/supabase.ts';

type Method = 'wave' | 'orange_money' | 'card' | 'other';

function methodFrom(confirmation: Record<string, unknown>): Method {
  const text = JSON.stringify(confirmation).toLowerCase();
  if (text.includes('wave')) return 'wave';
  if (text.includes('orange')) return 'orange_money';
  if (text.includes('card') || text.includes('carte')) return 'card';
  return 'other';
}

Deno.serve(async (req) => {
  const master = Deno.env.get('PAYDUNYA_MASTER_KEY');
  if (!master) return json({ error: 'PayDunya non configuré' }, 503);

  const form = await req.formData().catch(() => null);
  const hash = String(form?.get('data[hash]') ?? '');
  const token = String(form?.get('data[invoice][token]') ?? '');
  if (!hash || !token || !safeEqual(hash, await sha512Hex(master))) {
    return json({ error: 'Notification non authentifiée' }, 401);
  }

  const res = await fetch(`${paydunyaBase()}/checkout-invoice/confirm/${encodeURIComponent(token)}`, {
    headers: paydunyaHeaders(),
  });
  const confirmation = await res.json();
  if (confirmation?.status !== 'completed') return json({ received: true, status: confirmation?.status ?? 'inconnu' });

  const linkId = confirmation?.custom_data?.link_id;
  const amount = Math.round(Number(confirmation?.invoice?.total_amount));
  if (!linkId || !Number.isFinite(amount)) return json({ error: 'Données de paiement incomplètes' }, 400);

  const db = serviceClient();
  const { error } = await db.rpc('confirm_payment_link', {
    p_link: linkId,
    p_provider_ref: token,
    p_amount: amount,
    p_method: methodFrom(confirmation),
  });
  if (error) return json({ error: error.message }, 500);
  return json({ received: true });
});
