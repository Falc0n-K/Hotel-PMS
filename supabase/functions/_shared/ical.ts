export interface IcalEvent {
  uid: string;
  start: string; // AAAA-MM-JJ
  end: string;   // AAAA-MM-JJ, exclu
  summary?: string;
}

// Les lignes longues sont repliées (RFC 5545 §3.1) : on les déplie d'abord.
function unfold(text: string): string[] {
  return text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '').split('\n');
}

function toDate(value: string): string | null {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

function addDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function parseIcs(text: string): IcalEvent[] {
  const events: IcalEvent[] = [];
  let cur: Partial<IcalEvent> | null = null;
  let cancelled = false;
  for (const line of unfold(text)) {
    if (line === 'BEGIN:VEVENT') {
      cur = {};
      cancelled = false;
    } else if (line === 'END:VEVENT') {
      if (cur?.uid && cur.start && !cancelled) {
        events.push({ uid: cur.uid, start: cur.start, end: cur.end ?? addDay(cur.start), summary: cur.summary });
      }
      cur = null;
    } else if (cur) {
      const idx = line.indexOf(':');
      if (idx < 0) continue;
      const name = line.slice(0, idx).split(';')[0].toUpperCase();
      const value = line.slice(idx + 1).trim();
      if (name === 'UID') cur.uid = value;
      else if (name === 'DTSTART') cur.start = toDate(value) ?? undefined;
      else if (name === 'DTEND') cur.end = toDate(value) ?? undefined;
      else if (name === 'SUMMARY') cur.summary = value.replace(/\\([,;\\])/g, '$1').replace(/\\n/gi, ' ').slice(0, 200);
      else if (name === 'STATUS' && value.toUpperCase() === 'CANCELLED') cancelled = true;
    }
  }
  return events;
}

const icsDate = (iso: string) => iso.replace(/-/g, '');
const escape = (s: string) => s.replace(/\\/g, '\\\\').replace(/[,;]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');

export function buildIcs(calendarName: string, events: IcalEvent[], now = new Date()): string {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Senegal Hotels PMS//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escape(calendarName)}`,
  ];
  for (const e of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDate(e.start)}`,
      `DTEND;VALUE=DATE:${icsDate(e.end)}`,
      `SUMMARY:${escape(e.summary ?? 'Indisponible')}`,
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}
