// Pause's own pages (src/ui/pause.ts; docs/ux-audit/menus.md row 1): the settings and the candy bag are a tap
// away from the panel's first page. The suites that change a setting or look in the album turn to that page first.

/** Opens Pause's settings page, if it isn't open already. Pause itself must be open. */
export async function settingsPage(page) {
  if (await page.locator('#pauseSettingsPage').isVisible()) return;
  await page.locator('#pauseSettingsBtn').click();
  await page.locator('#pauseSettingsPage').waitFor({ state: 'visible' });
}

/** Opens Pause's candy bag page (the album and the photos), if it isn't open already. Pause itself must be open. */
export async function bagPage(page) {
  if (await page.locator('#pauseBagPage').isVisible()) return;
  await page.locator('#pauseBagBtn').click();
  await page.locator('#pauseBagPage').waitFor({ state: 'visible' });
}
