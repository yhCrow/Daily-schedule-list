import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useToast } from '../components/Toast'
import { buildSchedule, completeRevision, getOffsets, recalcForLearnedDate } from '../lib/schedule'
import { loadSnapshot, mergeSnapshot, saveSnapshot, STORAGE_KEY } from '../lib/storage'
import type { ISODate, LearningItem, Revision, Settings, Snapshot, Todo } from '../lib/types'

export interface NewItem {
  title: string
  subject: string | null
  notes: string | null
  learned_on: ISODate
}

interface DataState extends Snapshot {
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
  importSnapshot(snapshot: Snapshot): void
}

const DataContext = createContext<DataState | null>(null)

const upsert = <T extends { id: string }>(list: T[], rows: T[]): T[] => {
  const byId = new Map(rows.map((r) => [r.id, r]))
  const next = list.map((x) => byId.get(x.id) ?? x)
  for (const r of rows) if (!list.some((x) => x.id === r.id)) next.push(r)
  return next
}

export function DataProvider({ children }: { children: ReactNode }) {
  const toast = useToast()
  const [data, setData] = useState<Snapshot>(loadSnapshot)
  const current = useRef(data)
  current.current = data

  // Keep several open tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setData(loadSnapshot())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  /** Save to the browser, then show it. If the browser refuses, nothing changes. */
  const commit = useCallback(
    (next: Snapshot) => {
      try {
        saveSnapshot(next)
      } catch (e) {
        toast(`Not saved: your browser refused to store it (${(e as Error).message})`, { error: true })
        return
      }
      current.current = next
      setData(next)
    },
    [toast],
  )

  const value = useMemo<DataState>(() => {
    const s = () => current.current

    return {
      ...data,

      addItem(input) {
        const item: LearningItem = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...input }
        const revisions: Revision[] = buildSchedule(input.learned_on, getOffsets(s().settings.long_term_review)).map(
          (p) => ({ id: crypto.randomUUID(), item_id: item.id, round: p.round, due_on: p.due_on, done_at: null }),
        )
        commit({ ...s(), items: [item, ...s().items], revisions: [...s().revisions, ...revisions] })
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
        commit({ ...s(), items: upsert(s().items, [item]), revisions: upsert(s().revisions, moved) })
      },

      deleteItem(id) {
        commit({
          ...s(),
          items: s().items.filter((i) => i.id !== id),
          revisions: s().revisions.filter((r) => r.item_id !== id),
        })
      },

      toggleRevision(revision, today) {
        const itemRevs = s().revisions.filter((r) => r.item_id === revision.item_id)
        if (revision.done_at) {
          commit({ ...s(), revisions: upsert(s().revisions, [{ ...revision, done_at: null }]) })
          return
        }
        const changed = completeRevision(itemRevs, revision.id, new Date().toISOString(), today)
        const before = itemRevs.filter((r) => changed.some((c) => c.id === r.id))
        commit({ ...s(), revisions: upsert(s().revisions, changed) })
        const shifted = changed.length - 1
        toast(
          shifted > 0
            ? `Revision R${revision.round} done (${shifted} later revision${shifted > 1 ? 's' : ''} moved back)`
            : `Revision R${revision.round} done`,
          { undo: () => commit({ ...s(), revisions: upsert(s().revisions, before) }) },
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
        const swap = (to: Revision[]) => ({
          ...s(),
          revisions: s()
            .revisions.filter((r) => r.item_id !== itemId)
            .concat(to),
        })
        commit(swap(fresh))
        toast('Schedule restarted from today', { undo: () => commit(swap(before)) })
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
        commit({ ...s(), todos: [...s().todos, todo] })
      },

      updateTodo(todo) {
        commit({ ...s(), todos: upsert(s().todos, [todo]) })
      },

      toggleTodo(todo) {
        const next = { ...todo, done_at: todo.done_at ? null : new Date().toISOString() }
        commit({ ...s(), todos: upsert(s().todos, [next]) })
        if (next.done_at) {
          toast('Task done', { undo: () => commit({ ...s(), todos: upsert(s().todos, [todo]) }) })
        }
      },

      deleteTodo(todo) {
        commit({ ...s(), todos: s().todos.filter((t) => t.id !== todo.id) })
        toast('Task deleted', { undo: () => commit({ ...s(), todos: [...s().todos, todo] }) })
      },

      reorderTodos(ordered) {
        commit({ ...s(), todos: upsert(s().todos, ordered.map((t, i) => ({ ...t, position: i }))) })
      },

      moveTodos(todos, dueOn) {
        let pos = s()
          .todos.filter((t) => t.due_on === dueOn)
          .reduce((max, t) => Math.max(max, t.position + 1), 0)
        commit({ ...s(), todos: upsert(s().todos, todos.map((t) => ({ ...t, due_on: dueOn, position: pos++ }))) })
      },

      saveSettings(settings) {
        commit({ ...s(), settings })
      },

      importSnapshot(snapshot) {
        commit(mergeSnapshot(s(), snapshot))
      },
    }
  }, [data, commit, toast])

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
