// Moteur de réservation public (site de l'hôtel, sans compte).
//   POST { action: 'property', slug }                     → présentation
//   POST { action: 'availability', slug, check_in, … }    → types disponibles et prix
//   POST { action: 'book', slug, room_type_id, …, captcha } → option + lien de paiement
// Protections : captcha Turnstile pour réserver, limitation de débit par IP,
// option bloquée seulement le temps du paiement (expire automatiquement).
import { json, serviceClient } from '../_shared/supabase.ts';
import { clientKey } from '../_shared/net.ts';
import { verifyTurnstile } from '../_shared/turnstile.ts';
import { createCheckout, providerConfigured } from '../_shared/payments.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const int = (v: unknown, min: number, max: number) => (Number.isInteger(v) && (v as number) >= min && (v as number) <= max ? (v as number) : null);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply({ error: 'Méthode non autorisée' }, 405);

  // deno-lint-ignore no-explicit-any
  let body: any;
  try {
    body = await req.json();
  } catch {
    return reply({ error: 'Requête invalide' }, 400);
  }
  const db = serviceClient();

  if (!(await db.rpc('rate_limit_hit', { p_key: await clientKey(req, 'booking-read'), p_limit: 60, p_window_seconds: 600 })).data) {
    return reply({ error: 'Trop de requêtes, réessayez dans quelques minutes.' }, 429);
  }

  const slug = typeof body.slug === 'string' ? body.slug.toLowerCase() : '';
  const { data: property } = await db
    .from('properties')
    .select('id, name, city, address, phone, email, public_description, check_in_time, check_out_time, booking_hold_minutes, booking_provider, breakfast_price, timezone')
    .eq('booking_slug', slug)
    .eq('booking_enabled', true)
    .maybeSingle();
  if (!property) return reply({ error: 'Établissement introuvable ou réservation en ligne fermée' }, 404);

  if (body.action === 'property') {
    const { booking_provider: _p, ...publicFields } = property;
    return reply({ property: publicFields });
  }

  const adults = int(body.adults, 1, 20);
  const children = int(body.children ?? 0, 0, 20);
  if (!isDate(body.check_in) || !isDate(body.check_out) || adults === null || children === null) {
    return reply({ error: 'Dates ou nombre de personnes invalides' }, 400);
  }

  if (body.action === 'availability') {
    const { data, error } = await db.rpc('availability_for', {
      p_property: property.id, p_check_in: body.check_in, p_check_out: body.check_out, p_adults: adults, p_children: children,
    });
    if (error) return reply({ error: error.message }, 400);
    return reply({ rooms: data });
  }

  if (body.action === 'book') {
    if (!(await db.rpc('rate_limit_hit', { p_key: await clientKey(req, 'booking-write'), p_limit: 5, p_window_seconds: 3600 })).data) {
      return reply({ error: 'Trop de réservations depuis cette connexion. Contactez l’hôtel.' }, 429);
    }
    const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || null;
    if (!(await verifyTurnstile(body.captcha, ip))) return reply({ error: 'Vérification anti-robot échouée' }, 400);
    if (!providerConfigured(property.booking_provider)) return reply({ error: 'Paiement en ligne indisponible : contactez l’hôtel.' }, 503);
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (name.length < 2 || !email) return reply({ error: 'Nom et e-mail requis' }, 400);

    const { data: booked, error } = await db.rpc('book_room_type', {
      p_property: property.id,
      p_room_type: body.room_type_id,
      p_check_in: body.check_in,
      p_check_out: body.check_out,
      p_adults: adults,
      p_children: children,
      p_guest_name: name.slice(0, 120),
      p_guest_email: email.slice(0, 200),
      p_guest_phone: typeof body.phone === 'string' ? body.phone.slice(0, 30) : null,
      p_notes: typeof body.notes === 'string' ? body.notes.slice(0, 500) : null,
      p_source: 'website',
      p_status: 'option',
    });
    if (error) return reply({ error: error.message }, 409);
    const b = (booked as { reservation_id: string; code: string; total: number; hold_expires_at: string }[])[0];

    const { data: link, error: linkError } = await db
      .from('payment_links')
      .insert({ property_id: property.id, reservation_id: b.reservation_id, provider: property.booking_provider, amount: b.total })
      .select('id')
      .single();
    if (linkError) return reply({ error: 'Impossible de préparer le paiement' }, 500);

    const origin = req.headers.get('origin') ?? Deno.env.get('APP_URL') ?? '';
    try {
      const { url, ref } = await createCheckout({
        linkId: link.id,
        amount: b.total,
        provider: property.booking_provider,
        description: `${property.name} · réservation ${b.code}`,
        storeName: property.name,
        customerEmail: email,
        returnUrl: `${origin}/reserver/${slug}?confirmation=${b.code}`,
        cancelUrl: `${origin}/reserver/${slug}?annule=${b.code}`,
      });
      await db.from('payment_links').update({ status: 'open', checkout_url: url, provider_ref: ref }).eq('id', link.id);
      return reply({ code: b.code, total: b.total, hold_expires_at: b.hold_expires_at, payment_url: url });
    } catch (e) {
      await db.from('payment_links').update({ status: 'failed', last_error: (e as Error).message }).eq('id', link.id);
      // L'option expirera d'elle-même ; le client est invité à réessayer.
      return reply({ error: 'Le service de paiement ne répond pas, réessayez.' }, 502);
    }
  }

  return reply({ error: 'Action inconnue' }, 400);
});
