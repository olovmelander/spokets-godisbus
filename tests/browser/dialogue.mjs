/** Read one actual story bubble. General traversal tests use the same button as a player. */
export async function continueDialogue(page) {
  const next = page.locator('#sceneNext');
  if (!await next.isVisible()) return false;
  // More than the 250 ms guard in game time, including software-rendered frames capped at 100 ms.
  await page.evaluate(() => new Promise((resolve) => {
    let first;
    const frame = (time) => {
      first ??= time;
      if (time - first >= 450) resolve();
      else requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }));
  if (!await next.isVisible()) return false;
  await next.click();
  return true;
}
