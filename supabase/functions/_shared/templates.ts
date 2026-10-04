// Messages envoyés aux clients. Les variables viennent de
// notification_outbox.payload, rempli par la base.
type Payload = Record<string, string | number | null>;

const money = (v: unknown) => `${Number(v ?? 0).toLocaleString('fr-FR')} FCFA`;

export function render(template: string, p: Payload): { subject: string; text: string } {
  switch (template) {
    case 'reservation_confirmed':
      return {
        subject: `Confirmation de réservation ${p.code} · ${p.property_name}`,
        text:
          `Bonjour ${p.guest_name},\n\n` +
          `Votre réservation ${p.code} à ${p.property_name} est confirmée : ` +
          `arrivée le ${p.check_in} à partir de ${p.check_in_time}, départ le ${p.check_out}.\n` +
          `Montant du séjour : ${money(p.total)}.\n\n` +
          (p.property_phone ? `Pour toute question : ${p.property_phone}.\n\n` : '') +
          `À bientôt,\n${p.property_name}`,
      };
    case 'reservation_cancelled':
      return {
        subject: `Annulation de la réservation ${p.code} · ${p.property_name}`,
        text:
          `Bonjour ${p.guest_name},\n\nVotre réservation ${p.code} du ${p.check_in} au ${p.check_out} ` +
          `à ${p.property_name} est annulée.\n\n${p.property_name}`,
      };
    case 'arrival_reminder':
      return {
        subject: `Votre arrivée demain · ${p.property_name}`,
        text:
          `Bonjour ${p.guest_name},\n\nNous vous attendons demain (${p.check_in}) à partir de ${p.check_in_time} ` +
          `à ${p.property_name}. Réservation ${p.code}.\n\n${p.property_name}`,
      };
    default:
      return { subject: `${p.property_name}`, text: `Réservation ${p.code}` };
  }
}

// Version courte pour SMS et WhatsApp.
export function short(template: string, p: Payload): string {
  switch (template) {
    case 'reservation_confirmed':
      return `${p.property_name} : réservation ${p.code} confirmée du ${p.check_in} au ${p.check_out}. Total ${money(p.total)}.`;
    case 'reservation_cancelled':
      return `${p.property_name} : réservation ${p.code} annulée.`;
    case 'arrival_reminder':
      return `${p.property_name} : nous vous attendons demain (${p.check_in}) dès ${p.check_in_time}. Réf. ${p.code}.`;
    default:
      return `${p.property_name} : réservation ${p.code}.`;
  }
}
