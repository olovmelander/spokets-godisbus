/** Offline boot and title-only updates. No network is required for the game to keep playing. */
export interface Offline {
  /** A chapter must not start while all tabs are preparing a title-screen update. */
  canStart(): boolean;
  /** Call when the title is shown. Visibility changes are handled here too. */
  check(): void;
}

export function createOffline(options: { isTitle(): boolean; setUpdateLock(locked: boolean): void }): Offline {
  let registration: ServiceWorkerRegistration | undefined;
  let locked: ServiceWorker | null = null;
  let lockToken = '';
  let updating = false;
  let hadController = 'serviceWorker' in navigator && !!navigator.serviceWorker.controller;
  let checking = false;
  let transientRetries = 0;
  const unlock = () => {
    locked = null;
    lockToken = '';
    updating = false;
    options.setUpdateLock(false);
  };
  const reload = () => {
    if (!updating && options.isTitle()) { updating = true; location.reload(); }
  };
  const tryUpdate = () => {
    const waiting = registration?.waiting;
    // The first install activates by itself. Its fleeting waiting state is not an update vote.
    if (waiting && navigator.serviceWorker.controller && waiting !== navigator.serviceWorker.controller
      && waiting.state === 'installed' && options.isTitle() && !document.hidden && !locked) {
      waiting.postMessage({ type: 'TRY_UPDATE' });
    }
  };
  const check = async () => {
    if (!registration || checking) return;
    transientRetries = 0;
    checking = true;
    try { await registration.update(); } catch { /* Offline or denied storage: play normally. */ }
    finally { checking = false; tryUpdate(); }
  };
  const visited = () => {
    // The first page can finish loading packs before the first worker claims it. Cache those too.
    const urls = performance.getEntriesByType('resource').map((entry) => entry.name)
      .filter((url) => url.startsWith(`${location.origin}${import.meta.env.BASE_URL}packs/`));
    navigator.serviceWorker.controller?.postMessage({ type: 'CLIENT_READY', urls });
  };

  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
      const message = event.data;
      if (message?.type === 'CURRENT_BUILD') {
        event.ports[0]?.postMessage({ version: __BUILD_VERSION__ });
      } else if (message?.type === 'PREPARE_UPDATE') {
        // Another title tab may ask while this one is playing. Decline without pausing or reloading it.
        const ready = (event.source as ServiceWorker | null)?.state === 'installed'
          && options.isTitle() && (!locked || locked === event.source);
        if (ready) {
          locked = event.source as ServiceWorker;
          lockToken = message.token;
          options.setUpdateLock(true);
          const worker = locked;
          const token = lockToken;
          const settle = () => {
            if (locked !== worker || lockToken !== token) return;
            if (worker.state === 'activated') {
              if (options.isTitle()) reload();
              else unlock();
            } else if (worker.state === 'redundant') unlock();
          };
          worker.addEventListener('statechange', settle);
          settle();
          // The worker's vote expires well before this. Recover if it is killed while asking tabs.
          setTimeout(() => {
            if (locked === worker && lockToken === token && worker.state === 'installed') unlock();
          }, 4000);
        }
        event.ports[0]?.postMessage({ ready });
      } else if (message?.type === 'ABORT_UPDATE' && locked === event.source && lockToken === message.token) {
        unlock();
        // A short, bounded retry handles startup/background scheduling delays. Every attempt still
        // requires a new all-tab vote and a visible, idle title. Active-chapter vetoes never retry.
        if (message.retry === true && transientRetries < 2) {
          transientRetries++;
          setTimeout(tryUpdate, 300);
        }
      }
    });
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadController && options.isTitle() && locked && !updating) {
        reload();
      } else {
        hadController = !!navigator.serviceWorker.controller;
        visited();
      }
    });
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
      scope: import.meta.env.BASE_URL, updateViaCache: 'none',
    }).then((value) => {
      registration = value;
      const watch = (worker: ServiceWorker | null) => worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed') tryUpdate();
      });
      watch(value.installing);
      value.addEventListener('updatefound', () => watch(value.installing));
      void navigator.serviceWorker.ready.then(visited);
      void check();
    }).catch(() => { /* Private mode, insecure LAN and storage failures do not block play. */ });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) void check(); });
  }
  return { canStart: () => !locked, check: () => { void check(); } };
}
