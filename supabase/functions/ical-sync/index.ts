// Importe les calendriers iCal des plateformes (Airbnb, Booking.com…)
// dans les chambres associées. Appelée toutes les 30 minutes par pg_cron.
import { json, safeEqual, serviceClient } from '../_shared/supabase.ts';
import { fetchText, isPublicHttpsUrl } from '../_shared/net.ts';
import { parseIcs } from '../_shared/ical.ts';

Deno.serve(async (req) => {
  const expected = Deno.env.get('CRON_SECRET') ?? '';
  if (!expected || !safeEqual(req.headers.get('x-cron-secret') ?? '', expected)) return json({ error: 'Non autorisé' }, 401);

  const db = serviceClient();
  const { data: feeds, error } = await db.from('ical_feeds').select('id, url').eq('direction', 'import').eq('active', true);
  if (error) return json({ error: error.message }, 500);

  const results: Record<string, unknown> = {};
  for (const f of feeds ?? []) {
    try {
      if (!isPublicHttpsUrl(f.url)) throw new Error('URL refusée (destination interne ou non HTTPS)');
      const events = parseIcs(await fetchText(f.url));
      const { data, error: importError } = await db.rpc('ical_import', { p_feed: f.id, p_events: events });
      if (importError) throw new Error(importError.message);
      results[f.id] = data;
    } catch (e) {
      // Calendrier injoignable : on ne touche à aucun séjour, on signale l'erreur.
      await db.rpc('ical_feed_error', { p_feed: f.id, p_error: (e as Error).message });
      results[f.id] = { error: (e as Error).message };
    }
  }
  return json(results);
});
