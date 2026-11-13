// Export iCal d'une chambre : https://…/functions/v1/ical?token=<jeton>
// À coller dans Airbnb, Booking.com (hébergements indépendants), Google Agenda…
// Ne contient que des dates d'indisponibilité, aucune donnée personnelle.
import { serviceClient } from '../_shared/supabase.ts';
import { buildIcs } from '../_shared/ical.ts';

Deno.serve(async (req) => {
  const token = new URL(req.url).searchParams.get('token') ?? '';
  if (!/^[a-f0-9]{48}$/.test(token)) return new Response('Jeton invalide', { status: 400 });
  const db = serviceClient();
  const { data, error } = await db.rpc('ical_export_events', { p_token: token });
  if (error) return new Response('Erreur', { status: 500 });
  const events = ((data ?? []) as { uid: string; starts: string; ends: string; summary: string }[]).map((e) => ({
    uid: e.uid, start: e.starts, end: e.ends, summary: e.summary,
  }));
  return new Response(buildIcs('Disponibilités', events), {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
  });
});
