import { hmacSha256Hex, safeEqual } from './supabase.ts';

// En-tête Stripe-Signature : « t=horodatage,v1=signature[,v1=…] ».
// Signature = HMAC-SHA256(secret, `${t}.${corps brut}`), tolérance de 5 minutes.
export async function verifyStripeSignature(
  payload: string,
  header: string,
  secret: string,
  nowSeconds = Date.now() / 1000,
  toleranceSeconds = 300,
): Promise<boolean> {
  const fields = header.split(',').map((kv) => kv.trim());
  const t = Number(fields.find((f) => f.startsWith('t='))?.slice(2));
  const signatures = fields.filter((f) => f.startsWith('v1=')).map((f) => f.slice(3));
  if (!t || signatures.length === 0 || Math.abs(nowSeconds - t) > toleranceSeconds) return false;
  const expected = await hmacSha256Hex(secret, `${t}.${payload}`);
  return signatures.some((s) => safeEqual(s, expected));
}
