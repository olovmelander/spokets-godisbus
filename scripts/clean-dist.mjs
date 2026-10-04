// Always measure and deploy exactly this build, including repeated local PWA builds.
import { rm } from 'node:fs/promises';
await rm(new URL('../dist/', import.meta.url), { recursive: true, force: true });
