import type { GridLayoutSnapshot } from './BaseAgGridTreeTable.types';

/**
 * Read a persisted grid layout snapshot from localStorage.
 *
 * @param key - The storage key. When empty/undefined, nothing is read.
 * @returns The parsed snapshot, or `null` when missing or invalid.
 */
export function loadGridLayout(key: string | undefined): GridLayoutSnapshot | null {
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GridLayoutSnapshot;
    if (parsed?.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Persist a grid layout snapshot to localStorage.
 *
 * @param key - The storage key. When empty/undefined, nothing is written.
 * @param snapshot - The layout data (version is injected automatically).
 */
export function saveGridLayout(
  key: string | undefined,
  snapshot: Omit<GridLayoutSnapshot, 'version'>,
): void {
  if (!key) return;
  try {
    const payload: GridLayoutSnapshot = { version: 1, ...snapshot };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    /* localStorage may be unavailable (private mode / quota). Ignore. */
  }
}

/**
 * Remove a persisted grid layout snapshot from localStorage.
 *
 * @param key - The storage key. When empty/undefined, nothing is removed.
 */
export function clearGridLayout(key: string | undefined): void {
  if (!key) return;
  try {
    localStorage.removeItem(key);
  } catch {
    /* Ignore storage errors. */
  }
}
