// Export CSV compatible Excel (séparateur « ; », BOM UTF-8 pour les accents).
export function toCsv(rows: Record<string, unknown>[], columns: { key: string; label: string }[]): string {
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = columns.map((c) => escape(c.label)).join(';');
  const lines = rows.map((r) => columns.map((c) => escape(r[c.key])).join(';'));
  return '﻿' + [header, ...lines].join('\r\n');
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface CsvRecord {
  line: number; // ligne physique du début de l'enregistrement (1 = en-tête)
  cells: string[];
}

// Séparateur le plus fréquent hors guillemets sur la première ligne (« ; » si égalité).
function detectSeparator(text: string): ';' | ',' {
  let semi = 0;
  let comma = 0;
  let quoted = false;
  for (const ch of text) {
    if (ch === '"') quoted = !quoted;
    else if (!quoted && (ch === '\n' || ch === '\r')) break;
    else if (!quoted && ch === ';') semi++;
    else if (!quoted && ch === ',') comma++;
  }
  return comma > semi ? ',' : ';';
}

// Lecture CSV (RFC 4180) : séparateur « ; » ou « , » détecté, champs entre
// guillemets (avec "" et retours à la ligne), BOM UTF-8 ignoré, lignes vides sautées.
export function parseCsv(input: string): { separator: ';' | ','; records: CsvRecord[] } {
  const text = input.replace(/^﻿/, '');
  const separator = detectSeparator(text);
  const records: CsvRecord[] = [];
  let cells: string[] = [];
  let cell = '';
  let quoted = false;
  let line = 1;
  let start = 1;
  const endRecord = () => {
    cells.push(cell);
    if (cells.some((c) => c.trim() !== '')) records.push({ line: start, cells: cells.map((c) => c.trim()) });
    cells = [];
    cell = '';
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else {
        if (ch === '\n') line++;
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === separator) {
      cells.push(cell);
      cell = '';
    } else if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      endRecord();
      line++;
      start = line;
    } else {
      cell += ch;
    }
  }
  if (cell !== '' || cells.length) endRecord();
  return { separator, records };
}
