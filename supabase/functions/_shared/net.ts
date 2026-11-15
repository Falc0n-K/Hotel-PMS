import { sha512Hex } from './supabase.ts';

// Adresse du client derrière le proxy Supabase, réduite à une empreinte
// (on ne conserve pas d'adresse IP en clair dans la table de limitation).
export async function clientKey(req: Request, scope: string): Promise<string> {
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'inconnu';
  return `${scope}:${(await sha512Hex(`${ip}|${Deno.env.get('CRON_SECRET') ?? ''}`)).slice(0, 32)}`;
}

// Refuse les destinations internes (localhost, adresses privées, métadonnées
// cloud) pour les URL saisies par les utilisateurs (webhooks, iCal).
export function isPublicHttpsUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' || url.username || url.password) return false;
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal') || host.endsWith('.local')) return false;
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224) return false;
  }
  if (host.includes(':')) {
    if (host === '::1' || host === '::' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80') || host.startsWith('::ffff:')) return false;
  }
  return true;
}

// Lecture d'une réponse avec délai et taille maximale.
export async function fetchText(url: string, timeoutMs = 15000, maxBytes = 2_000_000): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: 'error', headers: { 'User-Agent': 'HotelPMS-iCal/1.0' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const reader = res.body?.getReader();
    if (!reader) return '';
    const chunks: BlobPart[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw new Error('Calendrier trop volumineux');
      chunks.push(new Uint8Array(value));
    }
    return await new Blob(chunks).text();
  } finally {
    clearTimeout(timer);
  }
}
