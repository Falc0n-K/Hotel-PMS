import { assert, assertFalse } from 'jsr:@std/assert@1';
import { verifyStripeSignature } from './stripe.ts';
import { hmacSha256Hex } from './supabase.ts';

const secret = 'whsec_test';
const body = '{"id":"evt_1"}';

Deno.test('signature valide acceptée', async () => {
  const t = 1_800_000_000;
  const sig = await hmacSha256Hex(secret, `${t}.${body}`);
  assert(await verifyStripeSignature(body, `t=${t},v1=${sig}`, secret, t));
});

Deno.test('corps modifié refusé', async () => {
  const t = 1_800_000_000;
  const sig = await hmacSha256Hex(secret, `${t}.${body}`);
  assertFalse(await verifyStripeSignature('{"id":"evt_2"}', `t=${t},v1=${sig}`, secret, t));
});

Deno.test('signature trop ancienne refusée', async () => {
  const t = 1_800_000_000;
  const sig = await hmacSha256Hex(secret, `${t}.${body}`);
  assertFalse(await verifyStripeSignature(body, `t=${t},v1=${sig}`, secret, t + 3600));
});

Deno.test('en-tête absent refusé', async () => {
  assertFalse(await verifyStripeSignature(body, '', secret));
});
