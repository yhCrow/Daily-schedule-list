import type { Settings, Snapshot } from './types'

// All data lives in this browser's localStorage. Nothing is sent anywhere, so
// nobody else can see or change it; other visitors get their own empty planner.

export const STORAGE_KEY = 'study-planner-data'
const LAST_BACKUP_KEY = 'study-planner-last-backup'

export const DEFAULT_SETTINGS: Settings = { long_term_review: false }
export const EMPTY: Snapshot = { items: [], revisions: [], todos: [], settings: DEFAULT_SETTINGS }

export function loadSnapshot(): Snapshot {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...EMPTY, ...(JSON.parse(raw) as Snapshot) }
  } catch {
    /* blocked or corrupt storage: start empty */
  }
  return EMPTY
}

/** Throws if the browser refuses to save (storage full or blocked). */
export function saveSnapshot(s: Snapshot): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
}

export function isSnapshot(x: unknown): x is Snapshot {
  const s = x as Snapshot
  return Boolean(s && Array.isArray(s.items) && Array.isArray(s.revisions) && Array.isArray(s.todos))
}

/** Merges a backup into the current data; rows with the same id are replaced. */
export function mergeSnapshot(current: Snapshot, incoming: Snapshot): Snapshot {
  const merge = <T extends { id: string }>(a: T[], b: T[]) => {
    const byId = new Map(a.map((x) => [x.id, x]))
    for (const x of b) byId.set(x.id, x)
    return [...byId.values()]
  }
  return {
    items: merge(current.items, incoming.items),
    revisions: merge(current.revisions, incoming.revisions),
    todos: merge(current.todos, incoming.todos),
    settings: incoming.settings ?? current.settings,
  }
}

export function getLastBackup(): string | null {
  try {
    return localStorage.getItem(LAST_BACKUP_KEY)
  } catch {
    return null
  }
}

export function setLastBackup(iso: string): void {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, iso)
  } catch {
    /* ignore */
  }
}

/** Asks the browser not to clear this site's data when space runs low. */
export function requestPersistentStorage(): void {
  navigator.storage?.persist?.().catch(() => {})
}
