/** Deterministic content versions injected by vite.config.ts, shared by the page and service worker. */
declare const __BUILD_VERSION__: string;
declare const __ASSET_VERSION__: string;
/** Actual shipped recordings; populated from public/audio/voices at build/server start. */
declare const __VOICE_KEYS__: readonly string[];
