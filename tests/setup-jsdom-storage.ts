/**
 * Vitest setup file for jsdom environments.
 *
 * Node 25 exposes a partial native `localStorage` global that conflicts with
 * jsdom's Web Storage implementation. The native object lacks `setItem`,
 * `getItem`, `removeItem`, and `clear`, which breaks Zustand's persist
 * middleware (it calls these synchronously during store creation).
 *
 * This file replaces `globalThis.localStorage` with a spec-compliant
 * in-memory implementation BEFORE any test module is imported, so Zustand
 * captures the correct storage object at store-creation time.
 */

class InMemoryStorage implements Storage {
  private readonly store: Map<string, string> = new Map();

  get length(): number {
    return this.store.size;
  }

  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null;
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

Object.defineProperty(globalThis, 'localStorage', {
  value: new InMemoryStorage(),
  writable: true,
  configurable: true,
});
