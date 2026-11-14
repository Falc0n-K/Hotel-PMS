import { test, expect, openApp, goTo, screenHeading } from './support/mockSupabase';

test.describe('Recherche globale', () => {
  test('Ctrl+K trouve un client et ouvre sa réservation', async ({ page, pageErrors }) => {
    await openApp(page);
    await page.keyboard.press('Control+k');

    const palette = page.getByRole('dialog', { name: 'Recherche globale' });
    await expect(palette).toBeVisible();
    await palette.getByRole('combobox', { name: 'Recherche globale' }).fill('moussa');
    const option = palette.getByRole('option', { name: /R-1002 · Moussa Sarr/ });
    await expect(option).toBeVisible();
    await expect(option).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Enter');

    await expect(palette).toBeHidden();
    await expect(page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('button', { name: 'Réservations', exact: true }))
      .toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('dialog', { name: 'Réservation R-1002' })).toContainText('Moussa Sarr');
    expect(pageErrors).toEqual([]);
  });
});

test.describe('Langue de l’interface', () => {
  test('passer en anglais dans « Mon compte » traduit le menu', async ({ page, pageErrors }) => {
    await openApp(page);
    await goTo(page, 'Mon compte');
    await expect(screenHeading(page, 'Mon compte')).toBeVisible();

    await page.getByLabel('Langue', { exact: true }).selectOption('en');

    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav.getByRole('button', { name: 'Reservations', exact: true })).toBeVisible();
    await expect(nav.getByRole('button', { name: 'Dashboard', exact: true })).toBeVisible();
    await expect(screenHeading(page, 'My account')).toBeVisible();
    await expect(nav.getByRole('button', { name: 'Réservations', exact: true })).toHaveCount(0);

    // Le choix est mémorisé.
    await page.reload();
    await expect(page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Settings & rates', exact: true })).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
});
