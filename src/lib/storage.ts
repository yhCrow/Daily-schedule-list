import type { LearningItem, Revision, Settings, Snapshot, Todo } from './types'

// All data lives in this browser's localStorage. Nothing is sent anywhere, so
// nobody else can see or change it; other visitors get their own empty planner.

export const STORAGE_KEY = 'study-planner-data'
const LAST_BACKUP_KEY = 'study-planner-last-backup'

export const DEFAULT_SETTINGS: Settings = { long_term_review: false }
export const EMPTY: Snapshot = { items: [], revisions: [], todos: [], settings: DEFAULT_SETTINGS }

const isDate = (x: unknown) => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x)
const isStr = (x: unknown) => typeof x === 'string' && x.length > 0

/** Drops any malformed rows so one bad entry can't break the whole app. */
export function sanitize(s: Partial<Snapshot>): Snapshot {
  const arr = <T,>(x: unknown) => (Array.isArray(x) ? (x as T[]) : [])
  const items = arr<LearningItem>(s.items)
    .filter((i) => i && isStr(i.id) && isStr(i.title) && isDate(i.learned_on))
    .map((i) => ({ ...i, subject: i.subject || null, notes: i.notes || null, created_at: i.created_at || '' }))
  const ids = new Set(items.map((i) => i.id))
  const revisions = arr<Revision>(s.revisions)
    .filter((r) => r && isStr(r.id) && ids.has(r.item_id) && Number.isInteger(r.round) && isDate(r.due_on))
    .map((r) => ({ ...r, done_at: r.done_at || null }))
  const todos = arr<Todo>(s.todos)
    .filter((t) => t && isStr(t.id) && isStr(t.title) && isDate(t.due_on))
    .map((t) => ({ ...t, done_at: t.done_at || null, position: Number(t.position) || 0, created_at: t.created_at || '' }))
  const settings = { long_term_review: Boolean(s.settings?.long_term_review) }
  return { items, revisions, todos, settings }
}

export function loadSnapshot(): Snapshot {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return sanitize(JSON.parse(raw) as Partial<Snapshot>)
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
  incoming = sanitize(incoming)
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
