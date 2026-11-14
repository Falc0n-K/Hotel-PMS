import { test, expect, openApp, goTo, addDays, TODAY, PROPERTY_ID } from './support/mockSupabase';

const CSV = [
  'chambre;client;email;telephone;arrivee;depart;adultes;enfants;montant_total;statut;provenance;notes',
  `101;Khady Sow;khady@example.com;+221 77 555 55 55;${addDays(TODAY, 20)};${addDays(TODAY, 23)};2;0;120000;confirmee;booking_com;`,
  // Format JJ/MM/AAAA accepté.
  `201;Omar Ba;;;25/12/2026;27/12/2026;1;0;180000;;direct;Lit bébé`,
  // Ligne invalide : départ avant l'arrivée et statut inconnu.
  `102;Erreur Test;pas-un-email;;2026-12-10;2026-12-08;2;0;50000;bizarre;direct;`,
].join('\n');

test.describe('Import de données', () => {
  test('import de réservations depuis un CSV : aperçu, contrôles et rapport', async ({ page, pms, pageErrors }) => {
    await openApp(page);
    await goTo(page, 'Paramètres & Tarifs');
    await page.getByRole('tab', { name: 'Import de données' }).click();

    await page.getByLabel('Données à importer').selectOption({ label: 'Réservations' });
    await expect(page.getByText('chambre;client;email;telephone;arrivee;depart')).toBeVisible();

    await page.locator('input[type="file"]').setInputFiles({ name: 'reprise.csv', mimeType: 'text/csv', buffer: Buffer.from(CSV, 'utf-8') });

    await expect(page.getByText('reprise.csv')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Aperçu · 3 ligne(s)' })).toBeVisible();
    await expect(page.getByText('1 ligne(s) en erreur ne seront pas importées')).toBeVisible();
    const invalidRow = page.getByRole('row').filter({ hasText: 'Erreur Test' });
    await expect(invalidRow).toContainText('E-mail invalide');
    await expect(invalidRow).toContainText('Le départ doit être postérieur à l’arrivée');
    await expect(invalidRow).toContainText('Statut inconnu');
    await expect(page.getByRole('row').filter({ hasText: 'Khady Sow' })).toContainText('OK');

    await page.getByRole('button', { name: 'Importer 2 ligne(s)' }).click();

    await expect(page.getByRole('heading', { name: 'Rapport d’import' })).toBeVisible();
    await expect(page.getByText('2 importée(s)')).toBeVisible();
    await expect(page.getByText('0 ignorée(s)')).toBeVisible();
    await expect(page.getByText('1 en échec')).toBeVisible();

    const calls = pms.rpcCalls('import_reservation');
    expect(calls).toHaveLength(2);
    expect(calls[0]).toMatchObject({
      p_property: PROPERTY_ID, p_room_number: '101', p_guest_name: 'Khady Sow', p_guest_email: 'khady@example.com',
      p_check_in: addDays(TODAY, 20), p_check_out: addDays(TODAY, 23), p_total: 120000, p_status: 'confirmed', p_source: 'booking_com', p_adults: 2,
    });
    expect(calls[1]).toMatchObject({
      p_room_number: '201', p_guest_name: 'Omar Ba', p_guest_email: null, p_check_in: '2026-12-25', p_check_out: '2026-12-27',
      p_status: 'confirmed', p_source: 'direct', p_notes: 'Lit bébé', p_adults: 1,
    });
    expect(pms.store.reservations.filter((r) => String(r.code).startsWith('IMP-'))).toHaveLength(2);
    expect(pageErrors).toEqual([]);
  });
});
