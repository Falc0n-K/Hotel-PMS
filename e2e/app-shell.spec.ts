import { test, expect, openApp, goTo, screenHeading, PROPERTY_NAME, USER } from './support/mockSupabase';

test.describe('Ossature de l’application', () => {
  test('un propriétaire connecté voit son établissement et tout le menu', async ({ page, pms, pageErrors }) => {
    await openApp(page);

    await expect(page.getByLabel('Établissement actif')).toContainText(PROPERTY_NAME);
    await expect(page.getByText('Propriétaire', { exact: true })).toBeVisible();
    await expect(page.getByText(USER.fullName).first()).toBeVisible();

    const nav = page.getByRole('navigation', { name: 'Navigation principale' });
    for (const label of [
      'Console Réception', 'Tableau de bord', 'Planning chambres', 'Réservations', 'Clients', 'Chambres', 'Ménage',
      'Caisse & Finance', 'Statistiques', 'Établissements', 'Équipe & Accès', 'Paramètres & Tarifs', 'Journal d’audit', 'Mon compte',
    ]) {
      await expect(nav.getByRole('button', { name: label, exact: true })).toBeVisible();
    }
    // Le propriétaire arrive sur le tableau de bord.
    await expect(nav.getByRole('button', { name: 'Tableau de bord', exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(page).toHaveTitle(`Tableau de bord · ${PROPERTY_NAME}`);

    // Les données viennent bien de l'API simulée (aucune bannière d'erreur).
    await expect(page.getByText('Impossible de charger les données')).toHaveCount(0);
    expect(pms.rpcCalls('support_properties')).toHaveLength(1);
    expect(pageErrors).toEqual([]);
  });
});

test.describe('Rôle réception', () => {
  test.use({ role: 'front_desk' });

  test('le menu se limite aux écrans de la réception', async ({ page, pageErrors }) => {
    await openApp(page);
    const nav = page.getByRole('navigation', { name: 'Navigation principale' });
    await expect(nav.getByRole('button', { name: 'Console Réception', exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(nav.getByRole('button', { name: 'Réservations', exact: true })).toBeVisible();
    await expect(nav.getByRole('button', { name: 'Paramètres & Tarifs', exact: true })).toHaveCount(0);
    await expect(nav.getByRole('button', { name: 'Équipe & Accès', exact: true })).toHaveCount(0);
    await goTo(page, 'Réservations');
    await expect(screenHeading(page, 'Réservations')).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
});
