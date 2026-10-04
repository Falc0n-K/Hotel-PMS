import { paydunyaBase, paydunyaHeaders } from './supabase.ts';

export interface CheckoutInput {
  linkId: string;
  amount: number;
  provider: 'stripe' | 'paydunya';
  description: string;
  storeName: string;
  customerEmail?: string | null;
  returnUrl: string;
  cancelUrl: string;
}

export function providerConfigured(provider: 'stripe' | 'paydunya'): boolean {
  return provider === 'stripe' ? !!Deno.env.get('STRIPE_SECRET_KEY') : !!Deno.env.get('PAYDUNYA_MASTER_KEY');
}

// Crée la page de paiement chez le prestataire ; renvoie son URL et sa référence.
export async function createCheckout(c: CheckoutInput): Promise<{ url: string; ref: string }> {
  if (c.provider === 'stripe') {
    const form = new URLSearchParams({
      mode: 'payment',
      'line_items[0][quantity]': '1',
      'line_items[0][price_data][currency]': 'xof', // devise sans décimales chez Stripe
      'line_items[0][price_data][unit_amount]': String(c.amount),
      'line_items[0][price_data][product_data][name]': c.description,
      client_reference_id: c.linkId,
      'metadata[link_id]': c.linkId,
      'payment_intent_data[metadata][link_id]': c.linkId,
      success_url: c.returnUrl,
      cancel_url: c.cancelUrl,
    });
    if (c.customerEmail) form.set('customer_email', c.customerEmail);
    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Idempotency-Key': c.linkId,
      },
      body: form,
    });
    const session = await res.json();
    if (!res.ok) throw new Error(session?.error?.message ?? `Stripe ${res.status}`);
    return { url: session.url, ref: session.id };
  }
  const res = await fetch(`${paydunyaBase()}/checkout-invoice/create`, {
    method: 'POST',
    headers: paydunyaHeaders(),
    body: JSON.stringify({
      invoice: { total_amount: c.amount, description: c.description },
      store: { name: c.storeName },
      custom_data: { link_id: c.linkId },
      actions: {
        cancel_url: c.cancelUrl,
        return_url: c.returnUrl,
        callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/paydunya-ipn`,
      },
    }),
  });
  const out = await res.json();
  if (out?.response_code !== '00') throw new Error(out?.response_text ?? `PayDunya ${res.status}`);
  return { url: out.response_text, ref: out.token };
}
