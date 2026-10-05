import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useToast } from '../components/Toast'
import { backend, DEFAULT_SETTINGS, isDemo } from '../lib/backend'
import { buildSchedule, completeRevision, getOffsets, recalcForLearnedDate } from '../lib/schedule'
import type { ISODate, LearningItem, Revision, Settings, Snapshot, Todo } from '../lib/types'

const CACHE_KEY = 'study-planner-cache'
const EMPTY: Snapshot = { items: [], revisions: [], todos: [], settings: DEFAULT_SETTINGS }

export interface NewItem {
  title: string
  subject: string | null
  notes: string | null
  learned_on: ISODate
}

interface DataState extends Snapshot {
  loading: boolean
  offline: boolean
  addItem(input: NewItem): void
  updateItem(item: LearningItem): void
  deleteItem(id: string): void
  toggleRevision(revision: Revision, today: ISODate): void
  restartItem(itemId: string, today: ISODate): void
  addTodo(title: string, dueOn: ISODate): void
  updateTodo(todo: Todo): void
  toggleTodo(todo: Todo): void
  deleteTodo(todo: Todo): void
  reorderTodos(ordered: Todo[]): void
  moveTodos(todos: Todo[], dueOn: ISODate): void
  saveSettings(settings: Settings): void
  importSnapshot(snapshot: Snapshot): Promise<void>
}

const DataContext = createContext<DataState | null>(null)

function readCache(): Snapshot | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as Snapshot) : null
  } catch {
    return null
  }
}

function writeCache(s: Snapshot) {
  if (isDemo) return
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(s))
  } catch {
    /* storage full or blocked: the cache is only a convenience */
  }
}

const upsert = <T extends { id: string }>(list: T[], rows: T[]): T[] => {
  const byId = new Map(rows.map((r) => [r.id, r]))
  const next = list.map((x) => byId.get(x.id) ?? x)
  for (const r of rows) if (!list.some((x) => x.id === r.id)) next.push(r)
  return next
}

export function DataProvider({ children }: { children: ReactNode }) {
  const toast = useToast()
  const [data, setData] = useState<Snapshot>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(false)
  const current = useRef(data)
  current.current = data

  const reload = useCallback(async () => {
    if (!backend) return
    try {
      const s = await backend.loadAll()
      setData(s)
      writeCache(s)
      setOffline(false)
    } catch (e) {
      const cached = readCache()
      if (cached) {
        setData(cached)
        setOffline(true)
      } else {
        toast(`Could not load your data: ${(e as Error).message}`, { error: true })
      }
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    reload()
    window.addEventListener('online', reload)
    return () => window.removeEventListener('online', reload)
  }, [reload])

  /** Optimistic update: apply locally now, save in the background, roll back on failure. */
  const run = useCallback(
    (next: Snapshot, save: () => Promise<void>) => {
      const prev = current.current
      current.current = next
      setData(next)
      save()
        .then(() => writeCache(current.current))
        .catch((e: Error) => {
          current.current = prev
          setData(prev)
          toast(`Not saved: ${e.message}`, { error: true })
        })
    },
    [toast],
  )

  const value = useMemo<DataState>(() => {
    const be = backend!
    const s = () => current.current

    return {
      ...data,
      loading,
      offline,

      addItem(input) {
        const item: LearningItem = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...input }
        const revisions: Revision[] = buildSchedule(input.learned_on, getOffsets(s().settings.long_term_review)).map(
          (p) => ({ id: crypto.randomUUID(), item_id: item.id, round: p.round, due_on: p.due_on, done_at: null }),
        )
        run({ ...s(), items: [item, ...s().items], revisions: [...s().revisions, ...revisions] }, () =>
          be.addItem(item, revisions),
        )
      },

      updateItem(item) {
        const old = s().items.find((i) => i.id === item.id)
        const moved =
          old && old.learned_on !== item.learned_on
            ? recalcForLearnedDate(
                s().revisions.filter((r) => r.item_id === item.id),
                item.learned_on,
              )
            : []
        run({ ...s(), items: upsert(s().items, [item]), revisions: upsert(s().revisions, moved) }, async () => {
          await be.updateItem(item)
          await be.upsertRevisions(moved)
        })
      },

      deleteItem(id) {
        run(
          { ...s(), items: s().items.filter((i) => i.id !== id), revisions: s().revisions.filter((r) => r.item_id !== id) },
          () => be.deleteItem(id),
        )
      },

      toggleRevision(revision, today) {
        const itemRevs = s().revisions.filter((r) => r.item_id === revision.item_id)
        if (revision.done_at) {
          const undone = { ...revision, done_at: null }
          run({ ...s(), revisions: upsert(s().revisions, [undone]) }, () => be.upsertRevisions([undone]))
          return
        }
        const changed = completeRevision(itemRevs, revision.id, new Date().toISOString(), today)
        const before = itemRevs.filter((r) => changed.some((c) => c.id === r.id))
        run({ ...s(), revisions: upsert(s().revisions, changed) }, () => be.upsertRevisions(changed))
        const shifted = changed.length - 1
        toast(
          shifted > 0
            ? `Revision R${revision.round} done (${shifted} later revision${shifted > 1 ? 's' : ''} moved back)`
            : `Revision R${revision.round} done`,
          {
            undo: () => run({ ...s(), revisions: upsert(s().revisions, before) }, () => be.upsertRevisions(before)),
          },
        )
      },

      restartItem(itemId, today) {
        const before = s().revisions.filter((r) => r.item_id === itemId)
        const fresh: Revision[] = buildSchedule(today, getOffsets(s().settings.long_term_review)).map((p) => ({
          id: crypto.randomUUID(),
          item_id: itemId,
          round: p.round,
          due_on: p.due_on,
          done_at: null,
        }))
        const swap = (from: Revision[], to: Revision[]) => ({
          ...s(),
          revisions: s()
            .revisions.filter((r) => !from.some((f) => f.id === r.id))
            .concat(to),
        })
        run(swap(before, fresh), () => be.restartItem(itemId, fresh))
        toast('Schedule restarted from today', {
          undo: () => run(swap(fresh, before), () => be.restartItem(itemId, before)),
        })
      },

      addTodo(title, dueOn) {
        const sameDay = s().todos.filter((t) => t.due_on === dueOn)
        const todo: Todo = {
          id: crypto.randomUUID(),
          title,
          due_on: dueOn,
          done_at: null,
          position: sameDay.reduce((max, t) => Math.max(max, t.position + 1), 0),
          created_at: new Date().toISOString(),
        }
        run({ ...s(), todos: [...s().todos, todo] }, () => be.upsertTodos([todo]))
      },

      updateTodo(todo) {
        run({ ...s(), todos: upsert(s().todos, [todo]) }, () => be.upsertTodos([todo]))
      },

      toggleTodo(todo) {
        const next = { ...todo, done_at: todo.done_at ? null : new Date().toISOString() }
        run({ ...s(), todos: upsert(s().todos, [next]) }, () => be.upsertTodos([next]))
        if (next.done_at) {
          toast('Task done', {
            undo: () => run({ ...s(), todos: upsert(s().todos, [todo]) }, () => be.upsertTodos([todo])),
          })
        }
      },

      deleteTodo(todo) {
        run({ ...s(), todos: s().todos.filter((t) => t.id !== todo.id) }, () => be.deleteTodo(todo.id))
        toast('Task deleted', {
          undo: () => run({ ...s(), todos: [...s().todos, todo] }, () => be.upsertTodos([todo])),
        })
      },

      reorderTodos(ordered) {
        const changed = ordered.map((t, i) => ({ ...t, position: i })).filter((t, i) => t.position !== ordered[i].position)
        run({ ...s(), todos: upsert(s().todos, changed) }, () => be.upsertTodos(changed))
      },

      moveTodos(todos, dueOn) {
        let pos = s()
          .todos.filter((t) => t.due_on === dueOn)
          .reduce((max, t) => Math.max(max, t.position + 1), 0)
        const moved = todos.map((t) => ({ ...t, due_on: dueOn, position: pos++ }))
        run({ ...s(), todos: upsert(s().todos, moved) }, () => be.upsertTodos(moved))
      },

      saveSettings(settings) {
        run({ ...s(), settings }, () => be.saveSettings(settings))
      },

      async importSnapshot(snapshot) {
        await be.importSnapshot(snapshot)
        await reload()
      },
    }
  }, [data, loading, offline, run, toast, reload])

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData(): DataState {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used inside DataProvider')
  return ctx
}

/** Lookup helper: item by id. */
export function useItemMap(): Map<string, LearningItem> {
  const { items } = useData()
  return useMemo(() => new Map(items.map((i) => [i.id, i])), [items])
}
