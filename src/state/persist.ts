/**
 * Storage key for the Colony persistence. Bump the /vN stripe when the
 * persisted shape (Unit fields, top-level state) changes in an
 * incompatible way. Persist middleware in colony.ts handles migration.
 */
export const STORAGE_KEY = 'morulium/colony/v1' as const;
