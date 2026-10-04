import React, { useEffect, useRef, useState } from 'react';
import { BedDouble, CalendarDays, CheckCircle2, Loader2, MapPin, Users, XCircle } from 'lucide-react';
import { useI18n, type Lang } from '../lib/i18n';
import { addDays, formatDate, formatMoney, nightsBetween, todayIn } from '../lib/dates';
import { Button, ErrorNote, Field, Input, Textarea } from './ui';

// Moteur de réservation public : /reserver/<adresse-de-l-hotel>.
// Aucune session : tout passe par la fonction public-booking (captcha,
// limitation de débit, option bloquée le temps du paiement).

const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL ?? ''}/functions/v1/public-booking`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '';

const TEXT = {
  search: { fr: 'Voir les disponibilités', en: 'Check availability' },
  arrival: { fr: 'Arrivée', en: 'Check-in' },
  departure: { fr: 'Départ', en: 'Check-out' },
  adults: { fr: 'Adultes', en: 'Adults' },
  children: { fr: 'Enfants', en: 'Children' },
  nights: { fr: 'nuit(s)', en: 'night(s)' },
  none: { fr: 'Aucune chambre disponible pour ces dates et ce nombre de personnes.', en: 'No room available for these dates and party size.' },
  perNight: { fr: 'par nuit en moyenne', en: 'per night on average' },
  left: { fr: 'restante(s)', en: 'left' },
  upTo: { fr: 'jusqu’à', en: 'up to' },
  people: { fr: 'pers.', en: 'guests' },
  breakfast: { fr: 'Petit-déjeuner inclus', en: 'Breakfast included' },
  choose: { fr: 'Choisir', en: 'Select' },
  yourDetails: { fr: 'Vos coordonnées', en: 'Your details' },
  name: { fr: 'Nom complet', en: 'Full name' },
  email: { fr: 'E-mail', en: 'Email' },
  phone: { fr: 'Téléphone (WhatsApp)', en: 'Phone (WhatsApp)' },
  notes: { fr: 'Demande particulière', en: 'Special request' },
  consent: {
    fr: 'J’accepte que l’hôtel traite ces données pour gérer mon séjour (loi sénégalaise 2008-12 sur les données personnelles). Elles ne sont ni vendues ni cédées.',
    en: 'I agree that the hotel processes this data to manage my stay (Senegalese data protection law 2008-12). It is never sold or shared.',
  },
  pay: { fr: 'Réserver et payer', en: 'Book and pay' },
  back: { fr: 'Retour', en: 'Back' },
  total: { fr: 'Total du séjour', en: 'Stay total' },
  hold: {
    fr: 'La chambre vous est réservée pendant le paiement. Sans paiement, elle est libérée automatiquement.',
    en: 'The room is held for you during payment. Without payment it is released automatically.',
  },
  captcha: { fr: 'Merci de valider la vérification anti-robot.', en: 'Please complete the anti-bot check.' },
  paidTitle: { fr: 'Merci, votre paiement est en cours de validation', en: 'Thank you, your payment is being validated' },
  paidBody: {
    fr: 'Vous recevrez la confirmation par e-mail dès que le paiement est validé. Référence :',
    en: 'You will receive a confirmation email as soon as payment is validated. Reference:',
  },
  cancelTitle: { fr: 'Paiement annulé', en: 'Payment cancelled' },
  cancelBody: {
    fr: 'Aucun montant n’a été débité. Votre option sera libérée ; vous pouvez refaire une réservation.',
    en: 'Nothing was charged. Your hold will be released; you can book again.',
  },
  closed: { fr: 'Cette page de réservation n’existe pas ou est fermée.', en: 'This booking page does not exist or is closed.' },
  times: { fr: 'Arrivée à partir de {in}, départ avant {out}', en: 'Check-in from {in}, check-out by {out}' },
} satisfies Record<string, Record<Lang, string>>;

interface PublicProperty {
  name: string;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  public_description: string | null;
  check_in_time: string;
  check_out_time: string;
  booking_hold_minutes: number;
  timezone: string;
}

interface Offer {
  room_type_id: string;
  name: string;
  capacity: number;
  available: number;
  total: number;
  nightly_avg: number;
  breakfast_included: boolean;
}

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
    body: JSON.stringify(body),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(out.error ?? `Erreur ${res.status}`);
  return out as T;
}

export default function PublicBooking({ slug }: { slug: string }) {
  const { lang, setLang } = useI18n();
  const t = (k: keyof typeof TEXT) => TEXT[k][lang];
  const params = new URLSearchParams(window.location.search);
  const confirmed = params.get('confirmation');
  const cancelled = params.get('annule');

  const [property, setProperty] = useState<PublicProperty | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [chosen, setChosen] = useState<Offer | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    call<{ property: PublicProperty }>({ action: 'property', slug })
      .then(({ property: p }) => {
        setProperty(p);
        document.title = p.name;
        const today = todayIn(p.timezone);
        setCheckIn(addDays(today, 1));
        setCheckOut(addDays(today, 3));
      })
      .catch(() => setNotFound(true));
  }, [slug]);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setChosen(null);
    try {
      const { rooms } = await call<{ rooms: Offer[] }>({ action: 'availability', slug, check_in: checkIn, check_out: checkOut, adults, children });
      setOffers(rooms);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const nights = nightsBetween(checkIn, checkOut);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <header className="bg-[#09153D] text-white">
        <div className="max-w-3xl mx-auto px-4 py-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight">{property?.name ?? '…'}</h1>
            {property?.city && (
              <p className="text-xs text-white/70 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> {[property.address, property.city].filter(Boolean).join(', ')}</p>
            )}
          </div>
          <div className="flex gap-1 text-[11px] font-bold">
            {(['fr', 'en'] as Lang[]).map((l) => (
              <button key={l} onClick={() => setLang(l)} className={`px-2 py-1 rounded-md cursor-pointer ${lang === l ? 'bg-white text-[#09153D]' : 'text-white/70'}`}>{l.toUpperCase()}</button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {confirmed && (
          <Notice ok title={t('paidTitle')}>{t('paidBody')} <span className="font-mono font-bold">{confirmed}</span></Notice>
        )}
        {cancelled && <Notice title={t('cancelTitle')}>{t('cancelBody')}</Notice>}

        {notFound ? (
          <p className="text-center text-sm text-slate-500 py-16">{t('closed')}</p>
        ) : !property ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : (
          <>
            {property.public_description && <p className="text-sm text-slate-600 whitespace-pre-line">{property.public_description}</p>}
            <p className="text-[11px] text-slate-400">
              {t('times').replace('{in}', property.check_in_time.slice(0, 5)).replace('{out}', property.check_out_time.slice(0, 5))}
            </p>

            <form onSubmit={search} className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
              <Field label={t('arrival')}>
                <Input type="date" required min={todayIn(property.timezone)} value={checkIn} onChange={(e) => { setCheckIn(e.target.value); if (e.target.value >= checkOut) setCheckOut(addDays(e.target.value, 1)); }} />
              </Field>
              <Field label={t('departure')}>
                <Input type="date" required min={addDays(checkIn || todayIn(property.timezone), 1)} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
              </Field>
              <Field label={t('adults')}><Input type="number" min={1} max={20} value={adults} onChange={(e) => setAdults(Math.max(1, Math.trunc(Number(e.target.value))))} /></Field>
              <Field label={t('children')}><Input type="number" min={0} max={20} value={children} onChange={(e) => setChildren(Math.max(0, Math.trunc(Number(e.target.value))))} /></Field>
              <Button type="submit" busy={busy} icon={CalendarDays} className="col-span-2 md:col-span-1">{t('search')}</Button>
            </form>

            <ErrorNote message={chosen ? null : error} />

            {offers && !chosen && (
              offers.length === 0 ? (
                <p className="text-center text-sm text-slate-500 py-8">{t('none')}</p>
              ) : (
                <div className="space-y-3">
                  {offers.map((o) => (
                    <div key={o.room_type_id} className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <h3 className="font-extrabold text-[#09153D] flex items-center gap-2"><BedDouble className="w-4 h-4 text-orange-600" /> {o.name}</h3>
                        <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-3">
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {t('upTo')} {o.capacity} {t('people')}</span>
                          {o.available <= 3 && <span className="text-amber-600 font-semibold">{o.available} {t('left')}</span>}
                          {o.breakfast_included && <span className="text-emerald-600 font-semibold">{t('breakfast')}</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-mono font-extrabold text-lg text-[#09153D]">{formatMoney(o.nightly_avg)}</p>
                          <p className="text-[10px] text-slate-400">{t('perNight')} · {nights} {t('nights')}</p>
                        </div>
                        <Button onClick={() => { setError(null); setChosen(o); }}>{t('choose')}</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {chosen && (
              <GuestForm
                slug={slug}
                offer={chosen}
                checkIn={checkIn}
                checkOut={checkOut}
                adults={adults}
                children={children}
                holdMinutes={property.booking_hold_minutes}
                t={t}
                onBack={() => setChosen(null)}
              />
            )}

            {(property.phone || property.email) && (
              <p className="text-[11px] text-slate-400 text-center pt-4">{[property.phone, property.email].filter(Boolean).join(' · ')}</p>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Notice({ ok, title, children }: { ok?: boolean; title: string; children: React.ReactNode }) {
  const Icon = ok ? CheckCircle2 : XCircle;
  return (
    <div role="status" className={`p-4 rounded-2xl border flex gap-3 ${ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
      <Icon className="w-5 h-5 shrink-0" />
      <div>
        <p className="font-bold text-sm">{title}</p>
        <p className="text-xs mt-1">{children}</p>
      </div>
    </div>
  );
}

function GuestForm({
  slug, offer, checkIn, checkOut, adults, children, holdMinutes, t, onBack,
}: {
  slug: string;
  offer: Offer;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  holdMinutes: number;
  t: (k: keyof typeof TEXT) => string;
  onBack: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [consent, setConsent] = useState(false);
  const captcha = useTurnstile();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nights = nightsBetween(checkIn, checkOut);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captcha.token) {
      setError(t('captcha'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const out = await call<{ payment_url: string }>({
        action: 'book', slug, room_type_id: offer.room_type_id, check_in: checkIn, check_out: checkOut, adults, children,
        name, email, phone: phone || undefined, notes: notes || undefined, captcha: captcha.token,
      });
      window.location.assign(out.payment_url);
    } catch (err) {
      setError((err as Error).message);
      captcha.reset();
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-extrabold text-[#09153D]">{offer.name}</h3>
          <p className="text-[11px] text-slate-500">{formatDate(checkIn)} → {formatDate(checkOut)} · {nights} {t('nights')} · {adults + children} {t('people')}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-400 uppercase font-bold">{t('total')}</p>
          <p className="font-mono font-extrabold text-lg text-[#09153D]">≈ {formatMoney(offer.nightly_avg * nights)}</p>
        </div>
      </div>
      <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">{t('yourDetails')}</h4>
      <div className="grid md:grid-cols-3 gap-3">
        <Field label={t('name')}><Input required minLength={2} maxLength={120} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label={t('email')}><Input type="email" required maxLength={200} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label={t('phone')}><Input type="tel" maxLength={30} autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
      </div>
      <Field label={t('notes')}><Textarea rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      <label className="flex gap-2 text-[11px] text-slate-600 cursor-pointer">
        <input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} className="accent-orange-600 w-4 h-4 shrink-0 mt-0.5" />
        <span>{t('consent')}</span>
      </label>
      <div ref={captcha.ref} />
      <p className="text-[11px] text-slate-500">{t('hold')} ({holdMinutes} min)</p>
      <ErrorNote message={error} />
      <div className="flex justify-between gap-2">
        <Button type="button" variant="secondary" onClick={onBack}>{t('back')}</Button>
        <Button type="submit" busy={busy} disabled={!consent}>{t('pay')}</Button>
      </div>
    </form>
  );
}

// ── Cloudflare Turnstile ───────────────────────────────────────────────────

interface TurnstileApi {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id: string) => void;
}
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<void> | null = null;
function loadTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  scriptPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Turnstile indisponible'));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

function useTurnstile() {
  const ref = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    let cancelled = false;
    loadTurnstile()
      .then(() => {
        if (cancelled || !ref.current || !window.turnstile) return;
        widget.current = window.turnstile.render(ref.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (tok: string) => setToken(tok),
          'expired-callback': () => setToken(null),
          'error-callback': () => setToken(null),
        });
      })
      .catch(() => setToken(null));
    return () => {
      cancelled = true;
      if (widget.current && window.turnstile) window.turnstile.remove(widget.current);
      widget.current = null;
    };
  }, []);

  return {
    ref,
    token,
    reset: () => {
      setToken(null);
      if (widget.current && window.turnstile) window.turnstile.reset(widget.current);
    },
  };
}
