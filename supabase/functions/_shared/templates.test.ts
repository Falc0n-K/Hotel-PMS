import { assertStringIncludes } from 'jsr:@std/assert@1';
import { render, short } from './templates.ts';

const payload = {
  guest_name: 'Awa Ndiaye', property_name: 'Royal Saly', code: 'R261004-ABCDE',
  check_in: '10/10/2026', check_out: '12/10/2026', check_in_time: '14:00', total: 150000,
  room_number: '101', property_phone: '+221 33 000 00 00',
};

Deno.test('confirmation complète', () => {
  const { subject, text } = render('reservation_confirmed', payload);
  assertStringIncludes(subject, 'R261004-ABCDE');
  assertStringIncludes(text, '150');
  assertStringIncludes(text, 'FCFA');
});

Deno.test('SMS court', () => {
  assertStringIncludes(short('arrival_reminder', payload), 'demain');
});

Deno.test('message en anglais pour un client anglophone', () => {
  const { subject, text } = render('reservation_confirmed', { ...payload, language: 'en' });
  assertStringIncludes(subject, 'Booking confirmation');
  assertStringIncludes(text, 'Dear Awa Ndiaye');
  assertStringIncludes(short('arrival_reminder', { ...payload, language: 'en' }), 'tomorrow');
});

Deno.test('français par défaut', () => {
  assertStringIncludes(render('reservation_cancelled', payload).text, 'est annulée');
});
