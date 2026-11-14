// Messages envoyés aux clients. Les variables viennent de
// notification_outbox.payload, rempli par la base ; `language` ('fr' | 'en')
// est la langue du client (choisie sur la page de réservation ou à la réception).
type Payload = Record<string, string | number | null>;

// Devises sans décimales ; « FCFA » pour les deux francs CFA.
const symbol = (c: unknown) => (!c || c === 'XOF' || c === 'XAF' ? 'FCFA' : String(c));
const money = (v: unknown, c: unknown, en: boolean) =>
  `${Number(v ?? 0).toLocaleString(en ? 'en-GB' : 'fr-FR')} ${symbol(c)}`;
const isEn = (p: Payload) => p.language === 'en';

export function render(template: string, p: Payload): { subject: string; text: string } {
  const en = isEn(p);
  switch (template) {
    case 'reservation_confirmed':
      return en
        ? {
            subject: `Booking confirmation ${p.code} · ${p.property_name}`,
            text:
              `Dear ${p.guest_name},\n\n` +
              `Your booking ${p.code} at ${p.property_name} is confirmed: ` +
              `arrival on ${p.check_in} from ${p.check_in_time}, departure on ${p.check_out}.\n` +
              `Stay total: ${money(p.total, p.currency, true)}.\n\n` +
              (p.property_phone ? `Any question: ${p.property_phone}.\n\n` : '') +
              `See you soon,\n${p.property_name}`,
          }
        : {
            subject: `Confirmation de réservation ${p.code} · ${p.property_name}`,
            text:
              `Bonjour ${p.guest_name},\n\n` +
              `Votre réservation ${p.code} à ${p.property_name} est confirmée : ` +
              `arrivée le ${p.check_in} à partir de ${p.check_in_time}, départ le ${p.check_out}.\n` +
              `Montant du séjour : ${money(p.total, p.currency, false)}.\n\n` +
              (p.property_phone ? `Pour toute question : ${p.property_phone}.\n\n` : '') +
              `À bientôt,\n${p.property_name}`,
          };
    case 'reservation_cancelled':
      return en
        ? {
            subject: `Booking ${p.code} cancelled · ${p.property_name}`,
            text:
              `Dear ${p.guest_name},\n\nYour booking ${p.code} from ${p.check_in} to ${p.check_out} ` +
              `at ${p.property_name} has been cancelled.\n\n${p.property_name}`,
          }
        : {
            subject: `Annulation de la réservation ${p.code} · ${p.property_name}`,
            text:
              `Bonjour ${p.guest_name},\n\nVotre réservation ${p.code} du ${p.check_in} au ${p.check_out} ` +
              `à ${p.property_name} est annulée.\n\n${p.property_name}`,
          };
    case 'arrival_reminder':
      return en
        ? {
            subject: `Your arrival tomorrow · ${p.property_name}`,
            text:
              `Dear ${p.guest_name},\n\nWe look forward to welcoming you tomorrow (${p.check_in}) from ${p.check_in_time} ` +
              `at ${p.property_name}. Booking ${p.code}.\n\n${p.property_name}`,
          }
        : {
            subject: `Votre arrivée demain · ${p.property_name}`,
            text:
              `Bonjour ${p.guest_name},\n\nNous vous attendons demain (${p.check_in}) à partir de ${p.check_in_time} ` +
              `à ${p.property_name}. Réservation ${p.code}.\n\n${p.property_name}`,
          };
    default:
      return { subject: `${p.property_name}`, text: `${en ? 'Booking' : 'Réservation'} ${p.code}` };
  }
}

// Version courte pour SMS et WhatsApp.
export function short(template: string, p: Payload): string {
  const en = isEn(p);
  switch (template) {
    case 'reservation_confirmed':
      return en
        ? `${p.property_name}: booking ${p.code} confirmed from ${p.check_in} to ${p.check_out}. Total ${money(p.total, p.currency, true)}.`
        : `${p.property_name} : réservation ${p.code} confirmée du ${p.check_in} au ${p.check_out}. Total ${money(p.total, p.currency, false)}.`;
    case 'reservation_cancelled':
      return en ? `${p.property_name}: booking ${p.code} cancelled.` : `${p.property_name} : réservation ${p.code} annulée.`;
    case 'arrival_reminder':
      return en
        ? `${p.property_name}: we look forward to seeing you tomorrow (${p.check_in}) from ${p.check_in_time}. Ref. ${p.code}.`
        : `${p.property_name} : nous vous attendons demain (${p.check_in}) dès ${p.check_in_time}. Réf. ${p.code}.`;
    default:
      return en ? `${p.property_name}: booking ${p.code}.` : `${p.property_name} : réservation ${p.code}.`;
  }
}
