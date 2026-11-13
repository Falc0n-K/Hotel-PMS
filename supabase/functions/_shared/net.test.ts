import { assert, assertFalse } from 'jsr:@std/assert@1';
import { isPublicHttpsUrl } from './net.ts';

Deno.test('URL publiques acceptées', () => {
  assert(isPublicHttpsUrl('https://www.airbnb.com/calendar/ical/1.ics'));
  assert(isPublicHttpsUrl('https://hooks.exemple.sn/pms'));
});

Deno.test('destinations internes refusées', () => {
  for (const u of [
    'http://exemple.sn', 'https://localhost/x', 'https://127.0.0.1/x', 'https://10.0.0.5/x', 'https://192.168.1.1/x',
    'https://172.20.0.1/x', 'https://169.254.169.254/latest/meta-data', 'https://[::1]/x', 'https://user:pass@exemple.sn',
    'https://db.internal/x', 'pas une url',
  ]) assertFalse(isPublicHttpsUrl(u), u);
});
