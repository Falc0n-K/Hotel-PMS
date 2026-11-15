import { test, expect } from './support/mockSupabase';

// Réception sur tablette : rail de navigation en paysage, tiroir en portrait,
// zones tactiles de 44 px, colonnes secondaires de la liste masquées.
test.use({ role: 'front_desk', isMobile: true, hasTouch: true });

test.describe('Tablette en paysage (1180 × 820)', () => {
  test.use({ viewport: { width: 1180, height: 820 } });

  test('rail de navigation, check-in tactile et liste allégée', async ({ page, pageErrors }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Navigation principale' });
    // Rail : visible en permanence, étroit, libellés sous les icônes.
    await expect(nav.getByRole('button', { name: 'Console Réception', exact: true })).toBeInViewport();
    const rail = await page.locator('#main-menu').boundingBox();
    expect(rail!.width).toBeLessThanOrEqual(100);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);

    const checkIn = page.getByRole('button', { name: 'Check-In' }).first();
    expect((await checkIn.boundingBox())!.height).toBeGreaterThanOrEqual(44);

    // « CRM Clients » mène bien à l'écran Clients.
    await page.getByRole('button', { name: 'CRM Clients' }).click();
    await expect(nav.getByRole('button', { name: 'Clients', exact: true })).toHaveAttribute('aria-current', 'page');

    await nav.getByRole('button', { name: 'Réservations', exact: true }).click();
    const table = page.getByRole('table');
    await expect(table.getByRole('columnheader', { name: 'Solde' })).toBeVisible();
    await expect(table.getByRole('columnheader', { name: 'Provenance' })).toBeHidden();
    await expect(table.getByRole('columnheader', { name: 'Montant' })).toBeHidden();

    // Le rail s'ouvre en menu complet par-dessus la page.
    await page.getByRole('button', { name: 'Ouvrir le menu' }).first().click();
    expect((await page.locator('#main-menu').boundingBox())!.width).toBeGreaterThan(250);
    await expect(page.getByText('Établissement actif')).toBeVisible();
    await page.keyboard.press('Escape');
    expect((await page.locator('#main-menu').boundingBox())!.width).toBeLessThanOrEqual(100);
    expect(pageErrors).toEqual([]);
  });
});

test.describe('Tablette en portrait (820 × 1180)', () => {
  test.use({ viewport: { width: 820, height: 1180 } });

  test('menu en tiroir, sans barre d’onglets, consigne du planning adaptée au tactile', async ({ page, pageErrors }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Navigation principale' });
    await expect(nav).not.toBeInViewport();
    await expect(page.getByRole('navigation', { name: 'Navigation rapide' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
    await nav.getByRole('button', { name: 'Planning chambres', exact: true }).click();
    await expect(nav).not.toBeInViewport();
    await expect(page.getByText(/Touchez une case libre pour réserver/)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
    expect(pageErrors).toEqual([]);
  });
});
