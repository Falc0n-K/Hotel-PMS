import { test, expect, addDays, TODAY } from './support/mockSupabase';

test.describe('Page publique de réservation', () => {
  test.use({ signedIn: false });

  test('un visiteur cherche des dates et voit une offre de chambre', async ({ page, pms, pageErrors }) => {
    pms.onFunction('public-booking', (body) => {
      if (body.action === 'property') {
        return {
          json: {
            property: {
              name: 'Hôtel Teranga Test', city: 'Dakar', address: 'Corniche Ouest', phone: '+221 33 000 00 00', email: 'contact@teranga.test',
              public_description: 'Face à l’océan.', check_in_time: '14:00:00', check_out_time: '12:00:00', booking_hold_minutes: 30,
              timezone: 'Africa/Dakar', currency: 'XOF',
            },
          },
        };
      }
      if (body.action === 'availability') {
        return {
          json: {
            rooms: [
              { room_type_id: 'rt-suite', name: 'Suite Océan', capacity: 3, available: 2, total: 180000, nightly_avg: 90000, breakfast_included: true },
            ],
          },
        };
      }
      return { status: 400, json: { error: 'action inconnue' } };
    });

    await page.goto('/reserver/demo');
    await expect(page.getByRole('heading', { level: 1, name: 'Hôtel Teranga Test' })).toBeVisible();
    await expect(page.getByText('Face à l’océan.')).toBeVisible();

    await page.getByRole('button', { name: 'Voir les disponibilités' }).click();

    await expect(page.getByRole('heading', { name: 'Suite Océan' })).toBeVisible();
    await expect(page.getByText('Petit-déjeuner inclus')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Choisir' })).toBeVisible();

    const availability = pms.functionCalls.filter((c) => c.name === 'public-booking' && c.body.action === 'availability');
    expect(availability).toEqual([
      expect.objectContaining({
        body: expect.objectContaining({ slug: 'demo', check_in: addDays(TODAY, 1), check_out: addDays(TODAY, 3), adults: 2, children: 0 }),
      }),
    ]);
    // Aucune session ni lecture de données internes sur la page publique.
    expect(pms.calls).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
