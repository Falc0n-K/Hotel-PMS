import { assertEquals } from 'jsr:@std/assert@1';
import { buildIcs, parseIcs } from './ical.ts';

const airbnb = [
  'BEGIN:VCALENDAR',
  'BEGIN:VEVENT',
  'DTSTART;VALUE=DATE:20261010',
  'DTEND;VALUE=DATE:20261013',
  'UID:1418fb94e984-abc@airbnb.com',
  'SUMMARY:Reserved',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'DTSTART:20261020T140000Z',
  'UID:sans-fin',
  'SUMMARY:Une nuit',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'DTSTART;VALUE=DATE:20261101',
  'DTEND;VALUE=DATE:20261102',
  'UID:annule',
  'STATUS:CANCELLED',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

Deno.test('lecture d’un calendrier Airbnb', () => {
  assertEquals(parseIcs(airbnb), [
    { uid: '1418fb94e984-abc@airbnb.com', start: '2026-10-10', end: '2026-10-13', summary: 'Reserved' },
    { uid: 'sans-fin', start: '2026-10-20', end: '2026-10-21', summary: 'Une nuit' },
  ]);
});

Deno.test('lignes repliées', () => {
  const ics = 'BEGIN:VEVENT\r\nUID:long-\r\n uid\r\nDTSTART;VALUE=DATE:20261010\r\nEND:VEVENT';
  assertEquals(parseIcs(ics)[0].uid, 'long-uid');
});

Deno.test('export relu à l’identique', () => {
  const events = [{ uid: 'a@hotel-pms', start: '2026-12-24', end: '2026-12-26', summary: 'Indisponible' }];
  assertEquals(parseIcs(buildIcs('Chambre 101', events)), events);
});
