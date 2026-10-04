/** Initial request plus three retries (plan §6.6). Each request, including its body, has a deadline. */
export async function fetchAsset<T>(url: string, read: (response: Response) => Promise<T>): Promise<T> {
  let failure: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** (attempt - 1)));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`Asset request failed: ${response.status}`);
      return await read(response);
    } catch (error) {
      failure = error;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw failure;
}
