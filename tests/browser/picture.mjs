/**
 * An iteration picture, for looking at: never a check. On GitHub the game is drawn in software, and there a
 * capture can take longer than Playwright's thirty seconds. A picture that did not come must not fail a suite:
 * on 4 October 2026 one did, on a pull request that changed only HANDOVER.md.
 */
export async function picture(page, path) {
  try {
    await page.screenshot({ path, timeout: 120000 });
  } catch (error) {
    console.log(`  --   no picture at ${path}: ${error?.name ?? error}`);
  }
}
