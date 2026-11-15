import { test, expect, PROPERTY_ID, TODAY } from './support/mockSupabase';

// Back-office sur téléphone : menu en tiroir, barre d'onglets pour les rôles de terrain.
test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test.describe('Femme de chambre sur téléphone', () => {
  test.use({ role: 'housekeeper' });

  test('arrive sur le ménage, termine une tâche et navigue par les onglets', async ({ page, pms, pageErrors }) => {
    pms.store.housekeeping_tasks.push({
      id: 'hk-1', property_id: PROPERTY_ID, room_id: 'room-102', status: 'todo', priority: 'high', notes: 'Départ', assigned_to: null,
      created_at: `${TODAY}T08:00:00Z`, completed_at: null,
    });
    pms.onRpc('set_housekeeping_task_status', (a, store) => {
      const t = store.housekeeping_tasks.find((x) => x.id === a.p_task)!;
      t.status = a.p_status;
      return null;
    });

    await page.goto('/');
    const tabs = page.getByRole('navigation', { name: 'Navigation rapide' });
    await expect(tabs).toBeVisible();
    await expect(tabs.getByRole('button', { name: 'Ménage' })).toHaveAttribute('aria-current', 'page');
    // Le menu latéral est replié et la page ne déborde pas.
    await expect(page.getByRole('navigation', { name: 'Navigation principale' })).not.toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);

    await page.getByRole('button', { name: 'Terminée', exact: true }).click();
    await expect.poll(() => pms.rpcCalls('set_housekeeping_task_status')).toEqual([{ p_task: 'hk-1', p_status: 'done' }]);

    await tabs.getByRole('button', { name: 'Chambres' }).click();
    await expect(page.getByRole('list', { name: 'Chambres' }).getByText('Standard').first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);

    // Le tiroir s'ouvre depuis l'onglet Menu et se ferme après un choix.
    await tabs.getByRole('button', { name: 'Menu' }).click();
    const nav = page.getByRole('navigation', { name: 'Navigation principale' });
    await expect(nav).toBeInViewport();
    await nav.getByRole('button', { name: 'Mon compte', exact: true }).click();
    await expect(nav).not.toBeInViewport();
    await expect(page.getByRole('heading', { name: 'Mon compte' }).first()).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
});

test.describe('Propriétaire sur téléphone', () => {
  test('menu en tiroir, sans barre d’onglets', async ({ page, pageErrors }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Tableau de bord' }).first()).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Navigation rapide' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
    const nav = page.getByRole('navigation', { name: 'Navigation principale' });
    await expect(nav).toBeInViewport();
    await page.keyboard.press('Escape');
    await expect(nav).not.toBeInViewport();
    expect(pageErrors).toEqual([]);
  });
});
