// Dates métier au format AAAA-MM-JJ, dans le fuseau de l'établissement.
// Dakar est en UTC+0 sans heure d'été, mais on passe toujours par le fuseau
// déclaré pour ne pas casser un futur établissement ailleurs.

export function todayIn(timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const ms = Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`);
  return Math.max(0, Math.round(ms / 86_400_000));
}

export function formatDate(isoDate: string | undefined): string {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

export function formatMoney(amount: number, currency = 'XOF'): string {
  const value = Math.round(amount).toLocaleString('fr-FR');
  return currency === 'XOF' ? `${value} FCFA` : `${value} ${currency}`;
}
