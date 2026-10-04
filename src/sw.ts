/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { CacheExpiration, ExpirationPlugin } from 'workbox-expiration';
import { PrecacheController, PrecacheRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision?: string | null; integrity?: string }> };

// Separate generations keep an installing worker from changing a playing tab's pack/manifest cache.
const prefix = `godisbus-v1:${new URL(self.registration.scope).pathname}:`;
const generation = `${prefix}${__BUILD_VERSION__}:`;
const runtimeName = `${generation}packs`;
const precache = new PrecacheController({ cacheName: `${generation}shell` });
precache.precache(self.__WB_MANIFEST);
registerRoute(new PrecacheRoute(precache));
// Query flags (?dev, ?course=…) select game content, not a different HTML shell. Only our root is a route.
const root = new URL(self.registration.scope).pathname;
registerRoute(new NavigationRoute(precache.createHandlerBoundToURL(`${root}index.html`), {
  allowlist: [new RegExp(`^${root.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:index\\.html)?(?:\\?.*)?$`)],
}));

function isPack(url: URL): boolean {
  return url.origin === self.location.origin && url.pathname.startsWith(`${root}packs/`)
    && /\.(glb|ktx2|m4a|webp|woff2)$/.test(url.pathname) && /^[a-f0-9]{64}$/.test(url.searchParams.get('v') ?? '');
}
const packs = new CacheFirst({
  cacheName: runtimeName,
  plugins: [
    {
      async fetchDidSucceed({ request, response }) {
        // An old page must not mistake a newly deployed, same-name file for its old asset.
        if (!response.ok) throw new Error('Pack not available');
        const digest = await crypto.subtle.digest('SHA-256', await response.clone().arrayBuffer());
        const actual = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
        if (actual !== new URL(request.url).searchParams.get('v')) throw new Error('Pack revision changed');
        return response;
      },
    },
    new ExpirationPlugin({ maxEntries: 96, maxAgeSeconds: 30 * 24 * 60 * 60, purgeOnQuotaError: true }),
  ],
});
registerRoute(({ url }) => isPack(url), packs);
// Audio is synthesized/decoded, never streamed through <audio>; no RangeRequestsPlugin is needed (§6.8).

async function windows(): Promise<WindowClient[]> {
  return (await self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
    .filter((client) => new URL(client.url).pathname.startsWith(root));
}
function ask<T>(client: WindowClient, type: string, token?: string): Promise<T | null> {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const finish = (answer: T | null) => { clearTimeout(timeout); channel.port1.close(); resolve(answer); };
    const timeout = setTimeout(() => finish(null), 1500);
    channel.port1.onmessage = (event) => finish(event.data as T);
    client.postMessage({ type, token }, [channel.port2]);
  });
}
let attempting: Promise<void> | undefined;
let requested = false;
async function attemptUpdate(): Promise<void> {
  if (!self.registration.waiting) return;
  const started = Date.now();
  const token = crypto.randomUUID();
  const clients = await windows();
  const votes = await Promise.all(clients.map((client) => ask<{ ready: boolean }>(client, 'PREPARE_UPDATE', token)));
  const now = await windows();
  const sameClients = now.length === clients.length && now.every((client) => clients.some((before) => before.id === client.id));
  // Unknown/loading/suspended tabs veto the update. Recheck membership to catch a tab opened mid-vote.
  if (clients.length > 0 && votes.every((vote) => vote?.ready)
    && sameClients
    && Date.now() - started < 2000) {
    await self.skipWaiting();
  } else {
    // A loading/suspended tab can miss one vote. An explicit active-chapter veto must never retry.
    const retry = !votes.some((vote) => vote?.ready === false)
      && (votes.some((vote) => vote === null) || !sameClients || Date.now() - started >= 2000);
    for (const client of now) client.postMessage({ type: 'ABORT_UPDATE', token, retry });
  }
}

/** Remove obsolete generations only after every live game page identifies the build it still needs. */
async function cleanup(): Promise<void> {
  // The old active worker must never delete the next worker's partly installed shell.
  if (self.registration.installing || self.registration.waiting) return;
  const clients = await windows();
  const versions = await Promise.all(clients.map((client) => ask<{ version: string }>(client, 'CURRENT_BUILD')));
  if (versions.some((answer) => !answer?.version)) return;
  const keep = new Set([__BUILD_VERSION__, ...versions.map((answer) => answer!.version)]);
  const names = await caches.keys();
  // CacheStorage keys are in creation order. A finishing old-worker event must never delete a newer
  // shell, even if activation begins while the event is awaiting a client's reply.
  const current = names.indexOf(`${generation}shell`);
  if (current < 0) return;
  for (const name of names.slice(0, current)) {
    if (self.registration.installing || self.registration.waiting) return;
    if (!name.startsWith(prefix) || [...keep].some((version) => name.startsWith(`${prefix}${version}:`))) continue;
    await caches.delete(name);
    if (name.endsWith(':packs')) await new CacheExpiration(name, { maxEntries: 96 }).delete();
  }
}
self.addEventListener('message', (event) => {
  if (event.data?.type === 'TRY_UPDATE') {
    // Returning to the title can request an update while an earlier vote is still expiring.
    // Keep that newer request instead of silently losing the only safe-title transition.
    requested = true;
    attempting ??= (async () => {
      do { requested = false; await attemptUpdate(); }
      while (requested && self.registration.waiting);
    })().finally(() => { attempting = undefined; });
    event.waitUntil(attempting);
  } else if (event.data?.type === 'CLIENT_READY') {
    const urls: unknown[] = Array.isArray(event.data.urls) ? event.data.urls : [];
    event.waitUntil(Promise.allSettled(urls.filter((value): value is string => typeof value === 'string' && isPack(new URL(value)) && !precache.getCacheKeyForURL(value))
      .map((url) => packs.handle({ request: new Request(url), event }))).then(cleanup));
  }
});
// First visit becomes offline-ready without a reload. Updates only reach here after every tab's title vote.
clientsClaim();
self.addEventListener('activate', (event) => { event.waitUntil(cleanup()); });
