// Envoie les événements en attente aux URL des partenaires, signés :
//   X-PMS-Signature: t=<horodatage>,v1=<HMAC-SHA256(secret, "t.corps")>
// Appelée toutes les 2 minutes par pg_cron (en-tête x-cron-secret).
import { hmacSha256Hex, json, safeEqual, serviceClient } from '../_shared/supabase.ts';
import { isPublicHttpsUrl } from '../_shared/net.ts';

Deno.serve(async (req) => {
  const expected = Deno.env.get('CRON_SECRET') ?? '';
  if (!expected || !safeEqual(req.headers.get('x-cron-secret') ?? '', expected)) return json({ error: 'Non autorisé' }, 401);

  const db = serviceClient();
  const { data, error } = await db.rpc('webhook_deliveries_due', { p_limit: 50 });
  if (error) return json({ error: error.message }, 500);

  let delivered = 0;
  let failed = 0;
  for (const d of (data ?? []) as { id: string; url: string; secret: string; payload: { event: string; id: string } }[]) {
    let ok = false;
    let status: number | null = null;
    let message: string | null = null;
    if (!isPublicHttpsUrl(d.url)) {
      message = 'URL refusée (destination interne ou non HTTPS)';
    } else {
      const body = JSON.stringify(d.payload);
      const t = Math.floor(Date.now() / 1000);
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10_000);
      try {
        const res = await fetch(d.url, {
          method: 'POST',
          redirect: 'manual',
          signal: ctrl.signal,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'HotelPMS-Webhooks/1.0',
            'X-PMS-Event': d.payload.event,
            'X-PMS-Delivery': d.payload.id,
            'X-PMS-Signature': `t=${t},v1=${await hmacSha256Hex(d.secret, `${t}.${body}`)}`,
          },
          body,
        });
        status = res.status;
        ok = res.status >= 200 && res.status < 300;
        if (!ok) message = `HTTP ${res.status}`;
        await res.body?.cancel();
      } catch (e) {
        message = (e as Error).name === 'AbortError' ? 'Délai dépassé (10 s)' : (e as Error).message;
      } finally {
        clearTimeout(timer);
      }
    }
    await db.rpc('webhook_delivery_result', { p_id: d.id, p_ok: ok, p_status: status, p_error: message });
    ok ? delivered++ : failed++;
  }
  return json({ delivered, failed });
});
