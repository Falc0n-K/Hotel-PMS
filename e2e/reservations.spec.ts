import type { Page } from '@playwright/test';
import { test, expect, openApp, goTo, screenHeading, addDays, TODAY, PROPERTY_ID } from './support/mockSupabase';

// Montants affichés par formatMoney : séparateur de milliers fr-FR (espace fine).
const money = (n: number) => new RegExp(`(?<!\\d)${n.toLocaleString('fr-FR').replace(/\s/g, '\\s')}\\sFCFA`);

async function openBookings(page: Page) {
  await openApp(page);
  await goTo(page, 'Réservations');
  await expect(screenHeading(page, 'Réservations')).toBeVisible();
}

const row = (page: Page, code: string) => page.getByRole('row').filter({ hasText: code });
const drawer = (page: Page, code: string) => page.getByRole('dialog', { name: `Réservation ${code}` });

test.describe('Guichet Réservations', () => {
  test('la liste affiche les réservations et la fiche montre client et solde', async ({ page, pageErrors }) => {
    await openBookings(page);

    await expect(row(page, 'R-1001')).toContainText('Awa Ndiaye');
    await expect(row(page, 'R-1002')).toContainText('Moussa Sarr');
    await expect(row(page, 'R-1003')).toContainText('Fatou Fall');
    await expect(row(page, 'R-1003')).toContainText('En séjour');

    await row(page, 'R-1003').click();
    const d = drawer(page, 'R-1003');
    await expect(d).toBeVisible();
    // Fiche client chargée depuis /rest/v1/guests.
    await expect(d.getByText('+221 77 333 33 33')).toBeVisible();
    // 180 000 de séjour - 50 000 déjà payés.
    await expect(d.getByText(/Solde :/)).toContainText(money(130000));
    await expect(d.getByText(/Paiement Carte \(TPE\)/)).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test('créer une réservation appelle book_stay et la nouvelle ligne apparaît', async ({ page, pms }) => {
    await openBookings(page);
    await page.getByRole('button', { name: 'Nouvelle réservation' }).click();
    const form = page.getByRole('dialog', { name: 'Nouvelle réservation' });

    const checkIn = addDays(TODAY, 10);
    const checkOut = addDays(TODAY, 12);
    await form.getByLabel('Nom complet').fill('Ibrahima Diallo');
    await form.getByRole('textbox', { name: 'Téléphone' }).fill('+221 77 444 44 44');
    await form.getByRole('combobox', { name: /^Chambre/ }).selectOption({ label: '201 · Suite Océan' });
    await form.getByLabel('Arrivée').fill(checkIn);
    await form.getByLabel('Départ').fill(checkOut);
    // Prix demandé au serveur (price_stay) : 2 nuits × 90 000.
    await expect(form.getByText(money(180000))).toBeVisible();
    await form.getByRole('button', { name: 'Enregistrer la réservation' }).click();

    await expect(form).toBeHidden();
    expect(pms.rpcCalls('book_stay')).toEqual([
      expect.objectContaining({
        p_property: PROPERTY_ID,
        p_room: 'room-201',
        p_check_in: checkIn,
        p_check_out: checkOut,
        p_guest_name: 'Ibrahima Diallo',
        p_guest_phone: '+221 77 444 44 44',
        p_status: 'confirmed',
        p_rate_plan: 'rp-1',
      }),
    ]);
    expect(pms.rpcCalls('price_stay').at(-1)).toMatchObject({ p_room_type: 'rt-suite', p_check_in: checkIn, p_check_out: checkOut });

    // La fiche de la nouvelle réservation s'ouvre.
    await expect(page.getByRole('dialog', { name: /^Réservation R-/ })).toContainText('Ibrahima Diallo');

    // Après rechargement complet, la ligne vient de l'API.
    await page.reload();
    await goTo(page, 'Réservations');
    await expect(page.getByRole('row').filter({ hasText: 'Ibrahima Diallo' })).toContainText('201');
  });

  test('annuler une réservation confirmée affiche les frais puis les facture', async ({ page, pms }) => {
    await openBookings(page);
    await row(page, 'R-1002').click();
    await drawer(page, 'R-1002').getByRole('button', { name: 'Annuler', exact: true }).click();

    const modal = page.getByRole('dialog', { name: 'Annuler la réservation R-1002' });
    await expect(modal.getByText('Frais d’annulation applicables')).toBeVisible();
    await expect(modal.locator('strong')).toHaveText(money(20000));
    expect(pms.rpcCalls('penalty_amount')).toContainEqual({ p_reservation: 'res-2', p_kind: 'cancellation' });

    await modal.getByLabel('Motif de l’annulation').fill('Vol annulé');
    await modal.getByRole('button', { name: 'Confirmer l’annulation' }).click();
    await expect(modal).toBeHidden();

    expect(pms.rpcCalls('cancel_reservation')).toEqual([{ p_reservation: 'res-2', p_reason: 'Vol annulé', p_waive_fee: false }]);
    const d = drawer(page, 'R-1002');
    await expect(d.getByText(/Frais facturés au folio/)).toContainText(money(20000));
    await expect(d.getByText('Annulée', { exact: true })).toBeVisible();
  });

  test('le propriétaire peut exonérer les frais d’annulation', async ({ page, pms }) => {
    await openBookings(page);
    await row(page, 'R-1002').click();
    await drawer(page, 'R-1002').getByRole('button', { name: 'Annuler', exact: true }).click();

    const modal = page.getByRole('dialog', { name: 'Annuler la réservation R-1002' });
    await expect(modal.locator('strong')).toHaveText(money(20000));
    await modal.getByLabel('Exonérer les frais').check();
    await expect(modal.locator('strong')).toHaveText(money(0));
    await modal.getByRole('button', { name: 'Confirmer l’annulation' }).click();
    await expect(modal).toBeHidden();

    expect(pms.rpcCalls('cancel_reservation')).toEqual([expect.objectContaining({ p_reservation: 'res-2', p_waive_fee: true })]);
    await expect(drawer(page, 'R-1002').getByText('Aucuns frais facturés.')).toBeVisible();
  });

  test('check-in puis encaissement Wave du solde', async ({ page, pms }) => {
    await openBookings(page);
    await row(page, 'R-1001').click();
    const d = drawer(page, 'R-1001');
    await expect(d.getByText(/Solde :/)).toContainText(money(80000));

    await d.getByRole('button', { name: 'Check-in' }).click();
    await expect(d.getByText('En séjour', { exact: true })).toBeVisible();
    expect(pms.rpcCalls('check_in_reservation')).toEqual([{ p_reservation: 'res-1' }]);
    await expect(d.getByRole('button', { name: 'Check-out' })).toBeVisible();

    await d.getByRole('button', { name: 'Encaisser' }).click();
    const pay = page.getByRole('dialog', { name: 'Encaissement' });
    await expect(pay.getByLabel(/Montant/)).toHaveValue('80000');
    await pay.getByLabel('Moyen de paiement').selectOption({ label: 'Wave' });
    await pay.getByLabel(/Référence/).fill('WAVE-123');
    await pay.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(pay).toBeHidden();

    expect(pms.rpcCalls('record_payment')).toEqual([{ p_reservation: 'res-1', p_amount: 80000, p_method: 'wave', p_reference: 'WAVE-123' }]);
    await expect(d.getByText(/Solde :/)).toContainText(money(0));
    await expect(d.getByText(/Paiement Wave \(WAVE-123\)/)).toBeVisible();
  });
});
