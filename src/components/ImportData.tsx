import React, { useRef, useState } from 'react';
import { Download, FileUp, Upload } from 'lucide-react';
import type { Property } from '../lib/auth';
import { run, SOURCE_LABELS, type BookingSource } from '../lib/pmsData';
import { supabase } from '../lib/supabase';
import { downloadCsv, parseCsv, toCsv } from '../lib/csv';
import { Badge, Button, Card, Empty, ErrorNote, Field, Select, Table, useAction } from './ui';
import { useI18n } from '../lib/i18n';

type Kind = 'rooms' | 'guests' | 'reservations';
type Tr = (fr: string, en: string) => string;
type Outcome = 'imported' | 'skipped' | 'failed';

interface Parsed<V> {
  line: number;
  cells: string[];
  raw: Record<string, string>;
  value: V | null;
  errors: string[];
}

interface ReportRow {
  line: number;
  outcome: Outcome;
  message: string;
  raw: string;
}

interface RoomValue { number: string; type: string; floor: number; baseRate: number | null; capacity: number }
interface GuestValue { name: string; email: string | null; phone: string | null; nationality: string | null; notes: string | null }
type ImportStatus = 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
interface ReservationValue {
  room: string; name: string; email: string | null; phone: string | null; checkIn: string; checkOut: string;
  adults: number; children: number; total: number; status: ImportStatus; source: BookingSource; notes: string | null;
}
type Value = RoomValue | GuestValue | ReservationValue;

const COLUMNS: Record<Kind, string[]> = {
  rooms: ['numero', 'type', 'etage', 'tarif_base', 'capacite'],
  guests: ['nom', 'email', 'telephone', 'nationalite', 'notes'],
  reservations: ['chambre', 'client', 'email', 'telephone', 'arrivee', 'depart', 'adultes', 'enfants', 'montant_total', 'statut', 'provenance', 'notes'],
};

const FILE_NAMES: Record<Kind, string> = { rooms: 'chambres', guests: 'clients', reservations: 'reservations' };

const EXAMPLES: Record<Kind, Record<string, string>[]> = {
  rooms: [
    { numero: '101', type: 'Standard', etage: '1', tarif_base: '45000', capacite: '2' },
    { numero: '201', type: 'Suite Océan', etage: '2', tarif_base: '90000', capacite: '3' },
  ],
  guests: [
    { nom: 'Awa Diop', email: 'awa.diop@example.com', telephone: '+221 77 000 00 00', nationalite: 'SN', notes: 'Client fidèle' },
  ],
  reservations: [
    {
      chambre: '101', client: 'Awa Diop', email: 'awa.diop@example.com', telephone: '+221 77 000 00 00', arrivee: '2026-11-02', depart: '05/11/2026',
      adultes: '2', enfants: '0', montant_total: '135000', statut: 'confirmee', provenance: 'booking_com', notes: '',
    },
  ],
};

// Minuscules, sans accents, espaces et ponctuation remplacés par « _ ».
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const ROOM_RE = /^[A-Za-z0-9-]{1,10}$/;

function int(s: string, min: number, max: number, fallback: number | null, label: string, errors: string[], tr: Tr): number | null {
  const v = s.replace(/[\s  ]/g, '');
  if (v === '') {
    if (fallback === null) errors.push(tr(`${label} manquant`, `${label} missing`));
    return fallback;
  }
  if (!/^-?\d+([.,]\d+)?$/.test(v)) {
    errors.push(tr(`${label} : nombre attendu`, `${label}: number expected`));
    return null;
  }
  const n = Math.round(Number(v.replace(',', '.')));
  if (n < min || n > max) {
    errors.push(tr(`${label} hors limites (${min} à ${max})`, `${label} out of range (${min} to ${max})`));
    return null;
  }
  return n;
}

// AAAA-MM-JJ ou JJ/MM/AAAA, vérifiée comme date réelle.
function parseDate(s: string, label: string, errors: string[], tr: Tr): string | null {
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  let y: number, mo: number, d: number;
  if (m) [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  else if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s))) [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  else {
    errors.push(s ? tr(`${label} : date invalide (AAAA-MM-JJ ou JJ/MM/AAAA)`, `${label}: invalid date (YYYY-MM-DD or DD/MM/YYYY)`) : tr(`${label} manquante`, `${label} missing`));
    return null;
  }
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) {
    errors.push(tr(`${label} : date inexistante`, `${label}: no such date`));
    return null;
  }
  return dt.toISOString().slice(0, 10);
}

const STATUS_ALIASES: Record<string, ImportStatus> = {
  confirmed: 'confirmed', confirmee: 'confirmed', confirme: 'confirmed',
  checked_in: 'checked_in', en_sejour: 'checked_in',
  checked_out: 'checked_out', partie: 'checked_out', parti: 'checked_out',
  cancelled: 'cancelled', canceled: 'cancelled', annulee: 'cancelled', annule: 'cancelled',
};

const opt = (s: string) => (s === '' ? null : s);

function validate(kind: Kind, r: Record<string, string>, tr: Tr): { value: Value | null; errors: string[] } {
  const errors: string[] = [];
  if (kind === 'rooms') {
    if (!ROOM_RE.test(r.numero)) errors.push(tr('Numéro de chambre invalide (lettres, chiffres, tiret ; 10 caractères max.)', 'Invalid room number (letters, digits, hyphen; 10 characters max.)'));
    if (r.type.length < 2 || r.type.length > 80) errors.push(tr('Type de chambre manquant (2 à 80 caractères)', 'Room type missing (2 to 80 characters)'));
    const floor = int(r.etage, -5, 200, 0, tr('Étage', 'Floor'), errors, tr);
    const baseRate = r.tarif_base === '' ? null : int(r.tarif_base, 0, 100_000_000, null, tr('Tarif de base', 'Base rate'), errors, tr);
    const capacity = int(r.capacite, 1, 20, 2, tr('Capacité', 'Capacity'), errors, tr);
    if (errors.length) return { value: null, errors };
    return { value: { number: r.numero, type: r.type, floor: floor!, baseRate, capacity: capacity! }, errors };
  }
  if (kind === 'guests') {
    if (r.nom.length < 2 || r.nom.length > 120) errors.push(tr('Nom manquant (2 à 120 caractères)', 'Name missing (2 to 120 characters)'));
    if (r.email && !EMAIL_RE.test(r.email)) errors.push(tr('E-mail invalide', 'Invalid email'));
    if (r.telephone.length > 30) errors.push(tr('Téléphone trop long (30 caractères max.)', 'Phone too long (30 characters max.)'));
    if (errors.length) return { value: null, errors };
    return { value: { name: r.nom, email: opt(r.email.toLowerCase()), phone: opt(r.telephone), nationality: opt(r.nationalite), notes: opt(r.notes) }, errors };
  }
  if (!r.chambre) errors.push(tr('Chambre manquante', 'Room missing'));
  if (r.client.length < 2 || r.client.length > 120) errors.push(tr('Nom du client manquant (2 à 120 caractères)', 'Guest name missing (2 to 120 characters)'));
  if (r.email && !EMAIL_RE.test(r.email)) errors.push(tr('E-mail invalide', 'Invalid email'));
  if (r.telephone.length > 30) errors.push(tr('Téléphone trop long (30 caractères max.)', 'Phone too long (30 characters max.)'));
  const checkIn = parseDate(r.arrivee, tr('Arrivée', 'Arrival'), errors, tr);
  const checkOut = parseDate(r.depart, tr('Départ', 'Departure'), errors, tr);
  if (checkIn && checkOut) {
    const nights = (Date.parse(checkOut) - Date.parse(checkIn)) / 86_400_000;
    if (nights < 1) errors.push(tr('Le départ doit être postérieur à l’arrivée', 'Departure must be after arrival'));
    else if (nights > 365) errors.push(tr('Séjour de plus de 365 nuits', 'Stay longer than 365 nights'));
  }
  const adults = int(r.adultes, 1, 20, 2, tr('Adultes', 'Adults'), errors, tr);
  const children = int(r.enfants, 0, 20, 0, tr('Enfants', 'Children'), errors, tr);
  const total = int(r.montant_total, 0, 1_000_000_000, null, tr('Montant total', 'Total amount'), errors, tr);
  const status = r.statut === '' ? 'confirmed' : STATUS_ALIASES[norm(r.statut)];
  if (!status) errors.push(tr(`Statut inconnu « ${r.statut} » (confirmee, en_sejour, partie, annulee)`, `Unknown status “${r.statut}” (confirmed, checked_in, checked_out, cancelled)`));
  const source = (r.provenance === '' ? 'direct' : norm(r.provenance)) as BookingSource;
  if (!(source in SOURCE_LABELS)) errors.push(tr(`Provenance inconnue « ${r.provenance} »`, `Unknown source “${r.provenance}”`));
  if (errors.length) return { value: null, errors };
  return {
    value: {
      room: r.chambre, name: r.client, email: opt(r.email.toLowerCase()), phone: opt(r.telephone), checkIn: checkIn!, checkOut: checkOut!,
      adults: adults!, children: children!, total: total!, status: status!, source, notes: opt(r.notes),
    },
    errors,
  };
}

export default function ImportData({ property, onChanged }: { property: Property; onChanged: () => Promise<void> | void }) {
  const { tr } = useI18n();
  const [kind, setKind] = useState<Kind>('rooms');
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<Parsed<Value>[] | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [report, setReport] = useState<ReportRow[] | null>(null);
  const { busy, error, setError, run: act } = useAction();
  const fileRef = useRef<HTMLInputElement>(null);
  const columns = COLUMNS[kind];
  const valid = rows?.filter((r) => r.value) ?? [];
  const invalid = (rows?.length ?? 0) - valid.length;

  const KIND_LABELS: Record<Kind, string> = {
    rooms: tr('Chambres', 'Rooms'),
    guests: tr('Clients', 'Guests'),
    reservations: tr('Réservations', 'Reservations'),
  };

  const reset = (k: Kind = kind) => {
    setKind(k);
    setRows(null);
    setReport(null);
    setProgress(null);
    setFileName('');
    setError(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const template = () =>
    downloadCsv(`modele-${FILE_NAMES[kind]}.csv`, toCsv(EXAMPLES[kind], columns.map((c) => ({ key: c, label: c }))));

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setRows(null);
    setReport(null);
    setError(null);
    if (!file) return;
    setFileName(file.name);
    const { records } = parseCsv(await file.text());
    if (records.length < 2) {
      setError(tr('Fichier vide : il faut une ligne d’en-tête et au moins une ligne de données.', 'Empty file: a header line and at least one data line are required.'));
      return;
    }
    const header = records[0].cells.map(norm);
    const missing = columns.filter((c) => !header.includes(c));
    if (missing.length) {
      setError(tr(`Colonnes manquantes dans l’en-tête : ${missing.join(', ')}. Partez du modèle.`, `Missing header columns: ${missing.join(', ')}. Start from the template.`));
      return;
    }
    setRows(
      records.slice(1).map((rec) => {
        const raw = Object.fromEntries(columns.map((c) => [c, rec.cells[header.indexOf(c)] ?? '']));
        const { value, errors } = validate(kind, raw, tr);
        return { line: rec.line, cells: rec.cells, raw, value, errors };
      }),
    );
  };

  const importAll = () =>
    act(async () => {
      if (!rows) return;
      const out: ReportRow[] = rows
        .filter((r) => !r.value)
        .map((r) => ({ line: r.line, outcome: 'failed' as const, message: r.errors.join(' ; '), raw: r.cells.join(';') }));
      const todo = rows.filter((r) => r.value);
      setProgress({ done: 0, total: todo.length });

      // Données de référence chargées une fois pour les chambres.
      const types = new Map<string, string>();
      const numbers = new Set<string>();
      const emails = new Set<string>();
      if (kind === 'rooms') {
        const t = (await run(supabase.from('room_types').select('id, name').eq('property_id', property.id).is('deleted_at', null))) as { id: string; name: string }[];
        t.forEach((x) => types.set(x.name.trim().toLowerCase(), x.id));
        const r = (await run(supabase.from('rooms').select('number').eq('property_id', property.id).is('deleted_at', null))) as { number: string }[];
        r.forEach((x) => numbers.add(x.number.toLowerCase()));
      }

      for (const [i, row] of todo.entries()) {
        const base = { line: row.line, raw: row.cells.join(';') };
        try {
          if (kind === 'rooms') {
            const v = row.value as RoomValue;
            if (numbers.has(v.number.toLowerCase())) {
              out.push({ ...base, outcome: 'skipped', message: tr(`Chambre ${v.number} déjà existante`, `Room ${v.number} already exists`) });
            } else {
              let typeId = types.get(v.type.toLowerCase());
              if (!typeId) {
                if (v.baseRate === null) throw new Error(tr(`Type « ${v.type} » inconnu : indiquez tarif_base pour le créer`, `Unknown type “${v.type}”: give tarif_base to create it`));
                const created = (await run(
                  supabase.from('room_types').insert({ property_id: property.id, name: v.type, base_rate: v.baseRate, capacity: v.capacity }).select('id').single(),
                )) as { id: string };
                typeId = created.id;
                types.set(v.type.toLowerCase(), typeId);
              }
              await run(supabase.from('rooms').insert({ property_id: property.id, room_type_id: typeId, number: v.number, floor: v.floor }).select('id').single());
              numbers.add(v.number.toLowerCase());
              out.push({ ...base, outcome: 'imported', message: '' });
            }
          } else if (kind === 'guests') {
            const v = row.value as GuestValue;
            let exists = v.email !== null && emails.has(v.email);
            if (v.email && !exists) {
              const found = (await run(
                supabase.from('guests').select('id').eq('property_id', property.id).ilike('email', v.email.replace(/[\\%_]/g, '\\$&')).limit(1),
              )) as { id: string }[];
              exists = found.length > 0;
            }
            if (exists) {
              out.push({ ...base, outcome: 'skipped', message: tr(`Client déjà enregistré avec l’e-mail ${v.email}`, `Guest already on file with email ${v.email}`) });
            } else {
              await run(
                supabase.from('guests').insert({ property_id: property.id, full_name: v.name, email: v.email, phone: v.phone, nationality: v.nationality, notes: v.notes }).select('id').single(),
              );
              out.push({ ...base, outcome: 'imported', message: '' });
            }
            if (v.email) emails.add(v.email);
          } else {
            const v = row.value as ReservationValue;
            await run(
              supabase.rpc('import_reservation', {
                p_property: property.id, p_room_number: v.room, p_guest_name: v.name, p_check_in: v.checkIn, p_check_out: v.checkOut,
                p_total: v.total, p_guest_email: v.email, p_guest_phone: v.phone, p_adults: v.adults, p_children: v.children,
                p_status: v.status, p_source: v.source, p_notes: v.notes,
              }),
            );
            out.push({ ...base, outcome: 'imported', message: '' });
          }
        } catch (e) {
          out.push({ ...base, outcome: 'failed', message: (e as Error).message });
        }
        setProgress({ done: i + 1, total: todo.length });
      }
      out.sort((a, b) => a.line - b.line);
      setReport(out);
      setRows(null);
      await onChanged();
    });

  const counts = report && {
    imported: report.filter((r) => r.outcome === 'imported').length,
    skipped: report.filter((r) => r.outcome === 'skipped').length,
    failed: report.filter((r) => r.outcome === 'failed').length,
  };
  const OUTCOME: Record<Outcome, string> = {
    imported: tr('Importée', 'Imported'),
    skipped: tr('Ignorée', 'Skipped'),
    failed: tr('En échec', 'Failed'),
  };
  const downloadReport = () =>
    report &&
    downloadCsv(
      `rapport-import-${FILE_NAMES[kind]}.csv`,
      toCsv(
        report.filter((r) => r.outcome !== 'imported').map((r) => ({ ...r, outcome: OUTCOME[r.outcome] })),
        [
          { key: 'line', label: tr('Ligne', 'Line') },
          { key: 'outcome', label: tr('Résultat', 'Result') },
          { key: 'message', label: tr('Message', 'Message') },
          { key: 'raw', label: tr('Données', 'Data') },
        ],
      ),
    );

  return (
    <div className="space-y-4">
      <Card title={tr('Reprise des données d’un autre logiciel', 'Import data from another system')}>
        <p className="text-xs text-slate-500 mb-3">
          {tr(
            'Fichier CSV en UTF-8, séparateur « ; » ou « , » (détecté automatiquement), première ligne = noms des colonnes. Importez d’abord les chambres, puis les clients, puis les réservations. Chambres : direction uniquement ; clients et réservations : direction et responsable des réservations. Les réservations reprises gardent leur montant d’origine et aucun message n’est envoyé aux clients. Chaque création est journalisée.',
            'UTF-8 CSV file, “;” or “,” separator (auto-detected), first line = column names. Import rooms first, then guests, then reservations. Rooms: management only; guests and reservations: management and reservation manager. Imported reservations keep their original amount and no message is sent to guests. Every creation is logged.',
          )}
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <Field label={tr('Données à importer', 'Data to import')}>
            <Select value={kind} disabled={busy} onChange={(e) => reset(e.target.value as Kind)} className="w-48">
              {(Object.keys(KIND_LABELS) as Kind[]).map((k) => <option key={k} value={k}>{KIND_LABELS[k]}</option>)}
            </Select>
          </Field>
          <Button variant="secondary" icon={Download} onClick={template}>{tr('Télécharger le modèle', 'Download template')}</Button>
          <Button variant="secondary" icon={FileUp} disabled={busy} onClick={() => fileRef.current?.click()}>{tr('Choisir un fichier CSV', 'Choose a CSV file')}</Button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
          {fileName && <span className="text-xs text-slate-500 pb-2.5">{fileName}</span>}
        </div>
        <p className="text-[11px] text-slate-400 mt-3 font-mono">{columns.join(';')}</p>
        {kind === 'reservations' && (
          <p className="text-[11px] text-slate-400 mt-1">
            {tr(
              'Dates AAAA-MM-JJ ou JJ/MM/AAAA. Statut : confirmee, en_sejour, partie ou annulee (par défaut confirmee). Provenance (par défaut direct) : ',
              'Dates YYYY-MM-DD or DD/MM/YYYY. Status: confirmed, checked_in, checked_out or cancelled (default confirmed). Source (default direct): ',
            )}
            {Object.keys(SOURCE_LABELS).join(', ')}.
          </p>
        )}
        {kind === 'rooms' && (
          <p className="text-[11px] text-slate-400 mt-1">{tr('Les types absents sont créés avec tarif_base et capacite (2 par défaut). Les numéros déjà existants sont ignorés.', 'Missing types are created with tarif_base and capacite (default 2). Existing room numbers are skipped.')}</p>
        )}
        {kind === 'guests' && (
          <p className="text-[11px] text-slate-400 mt-1">{tr('Un client dont l’e-mail existe déjà dans l’établissement est ignoré.', 'A guest whose email already exists in the property is skipped.')}</p>
        )}
      </Card>

      <ErrorNote message={error} />

      {rows && (
        <Card
          title={tr(`Aperçu · ${rows.length} ligne(s)`, `Preview · ${rows.length} row(s)`)}
          actions={
            <Button icon={Upload} busy={busy} disabled={!valid.length} onClick={importAll}>
              {tr(`Importer ${valid.length} ligne(s)`, `Import ${valid.length} row(s)`)}
            </Button>
          }
        >
          {invalid > 0 && (
            <p className="text-xs font-semibold text-red-600 mb-3">
              {tr(`${invalid} ligne(s) en erreur ne seront pas importées (détail dans le rapport final).`, `${invalid} row(s) with errors will not be imported (details in the final report).`)}
            </p>
          )}
          {progress && busy && (
            <div className="mb-3">
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-orange-600 transition-all" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 100}%` }} />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">{tr(`${progress.done} / ${progress.total} traitée(s)…`, `${progress.done} / ${progress.total} processed…`)}</p>
            </div>
          )}
          <Table head={[tr('Ligne', 'Line'), ...columns, tr('Contrôle', 'Check')]}>
            {rows.slice(0, 20).map((r) => (
              <tr key={r.line} className={r.value ? '' : 'bg-red-50/50'}>
                <td className="p-2 font-mono text-slate-400">{r.line}</td>
                {columns.map((c) => <td key={c} className="p-2 whitespace-nowrap max-w-[180px] truncate">{r.raw[c]}</td>)}
                <td className="p-2">
                  {r.value ? <Badge tone="green">OK</Badge> : <span className="text-[11px] text-red-700">{r.errors.join(' ; ')}</span>}
                </td>
              </tr>
            ))}
          </Table>
          {rows.length > 20 && <p className="text-[11px] text-slate-400 mt-2">{tr(`Seules les 20 premières lignes sont affichées.`, 'Only the first 20 rows are shown.')}</p>}
        </Card>
      )}

      {report && counts && (
        <Card
          title={tr('Rapport d’import', 'Import report')}
          actions={
            <div className="flex gap-2">
              {counts.skipped + counts.failed > 0 && <Button variant="secondary" icon={Download} onClick={downloadReport}>{tr('Rapport des erreurs (CSV)', 'Error report (CSV)')}</Button>}
              <Button variant="secondary" onClick={() => reset()}>{tr('Nouvel import', 'New import')}</Button>
            </div>
          }
        >
          <div className="flex flex-wrap gap-2 mb-3">
            <Badge tone="green">{tr(`${counts.imported} importée(s)`, `${counts.imported} imported`)}</Badge>
            <Badge tone="amber">{tr(`${counts.skipped} ignorée(s)`, `${counts.skipped} skipped`)}</Badge>
            <Badge tone="red">{tr(`${counts.failed} en échec`, `${counts.failed} failed`)}</Badge>
          </div>
          {counts.skipped + counts.failed === 0 ? (
            <Empty>{tr('Toutes les lignes ont été importées.', 'All rows were imported.')}</Empty>
          ) : (
            <Table head={[tr('Ligne', 'Line'), tr('Résultat', 'Result'), tr('Message', 'Message')]}>
              {report.filter((r) => r.outcome !== 'imported').map((r) => (
                <tr key={r.line}>
                  <td className="p-2 font-mono text-slate-400">{r.line}</td>
                  <td className="p-2"><Badge tone={r.outcome === 'failed' ? 'red' : 'amber'}>{OUTCOME[r.outcome]}</Badge></td>
                  <td className="p-2">{r.message}</td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      )}
    </div>
  );
}
