// Make Node's crypto available as a global for tests (needed for crypto.randomUUID())
import { webcrypto } from 'crypto';
if (typeof globalThis.crypto === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).crypto = webcrypto;
}
