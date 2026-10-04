import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Property } from '../../lib/auth';
import { CHARGE_LABELS, type ChargeCategory } from '../../lib/pmsData';
import { formatDate, formatMoney } from '../../lib/dates';

export interface InvoiceDoc {
  id: string;
  display_number: string;
  issued_at: string;
  subtotal: number;
  vat_amount: number;
  tourist_tax: number;
  total: number;
  lines: { category: ChargeCategory; description: string; quantity: number; unit_price: number; amount: number }[];
  credit_note?: { display_number: string; issued_at: string; reason: string } | null;
}

interface Props {
  invoice: InvoiceDoc;
  property: Property;
  guest: { full_name: string; address?: string | null; email?: string | null } | null;
  reservationCode: string;
  onDone: () => void;
}

// Facture imprimable (ou enregistrable en PDF depuis la boîte d'impression
// du navigateur). Le contenu vient de la facture figée en base.
export default function InvoicePrint({ invoice, property, guest, reservationCode, onDone }: Props) {
  useEffect(() => {
    const after = () => onDone();
    window.addEventListener('afterprint', after);
    const timer = setTimeout(() => window.print(), 150);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('afterprint', after);
    };
  }, [onDone]);

  const vatRate = property.vat_rate_bp / 100;

  return createPortal(
    <div className="print-root fixed inset-0 z-[60] bg-white overflow-auto p-10 text-slate-900 text-[12px]">
      <button onClick={onDone} className="no-print absolute top-4 right-4 text-xs font-bold border border-slate-200 rounded-lg px-3 py-1.5 cursor-pointer">
        Fermer l’aperçu
      </button>
      <div className="max-w-[720px] mx-auto">
        <header className="flex justify-between gap-8 border-b border-slate-200 pb-6">
          <div>
            <p className="text-lg font-black">{property.legal_name || property.name}</p>
            {property.address && <p>{property.address}</p>}
            {property.city && <p>{property.city}, Sénégal</p>}
            {property.phone && <p>Tél. {property.phone}</p>}
            {property.email && <p>{property.email}</p>}
            {property.ninea && <p>NINEA : {property.ninea}</p>}
            {property.rccm && <p>RCCM : {property.rccm}</p>}
          </div>
          <div className="text-right">
            <p className="text-2xl font-black">FACTURE</p>
            <p className="font-mono font-bold">{invoice.display_number}</p>
            <p>Émise le {formatDate(invoice.issued_at.slice(0, 10))}</p>
            <p>Réservation {reservationCode}</p>
          </div>
        </header>

        <section className="py-6">
          <p className="text-[10px] uppercase font-bold text-slate-500">Facturé à</p>
          <p className="font-bold">{guest?.full_name ?? 'Client'}</p>
          {guest?.address && <p>{guest.address}</p>}
          {guest?.email && <p>{guest.email}</p>}
        </section>

        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-800 text-left">
              <th className="py-2">Désignation</th>
              <th className="py-2 text-right">Qté</th>
              <th className="py-2 text-right">P.U. TTC</th>
              <th className="py-2 text-right">Montant TTC</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((l, i) => (
              <tr key={i} className="border-b border-slate-200">
                <td className="py-2">
                  <span className="text-slate-500">{CHARGE_LABELS[l.category] ?? l.category} · </span>
                  {l.description}
                </td>
                <td className="py-2 text-right">{Number(l.quantity).toLocaleString('fr-FR')}</td>
                <td className="py-2 text-right">{formatMoney(l.unit_price)}</td>
                <td className="py-2 text-right">{formatMoney(l.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end mt-6">
          <table className="min-w-[280px]">
            <tbody>
              <tr><td className="py-1">Total HT</td><td className="py-1 text-right">{formatMoney(invoice.subtotal)}</td></tr>
              <tr><td className="py-1">TVA {vatRate.toLocaleString('fr-FR')} %</td><td className="py-1 text-right">{formatMoney(invoice.vat_amount)}</td></tr>
              {invoice.tourist_tax > 0 && (
                <tr><td className="py-1">Taxe de séjour (hors TVA)</td><td className="py-1 text-right">{formatMoney(invoice.tourist_tax)}</td></tr>
              )}
              <tr className="border-t-2 border-slate-800 font-black text-[14px]">
                <td className="py-2">Total à payer</td><td className="py-2 text-right">{formatMoney(invoice.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {invoice.credit_note && (
          <p className="mt-8 p-3 border-2 border-red-700 text-red-700 font-bold">
            Facture annulée par l’avoir {invoice.credit_note.display_number} du{' '}
            {formatDate(invoice.credit_note.issued_at.slice(0, 10))} : {invoice.credit_note.reason}
          </p>
        )}

        <footer className="mt-12 pt-4 border-t border-slate-200 text-[10px] text-slate-500">
          Montants en francs CFA (XOF). Facture numérotée de façon continue, non modifiable ; toute correction fait
          l’objet d’un avoir.
        </footer>
      </div>
    </div>,
    document.body,
  );
}
