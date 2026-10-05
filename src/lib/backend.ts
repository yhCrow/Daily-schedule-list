import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { LearningItem, Revision, Settings, Snapshot, Todo } from './types'

/** Everything the app needs from storage. All ids are generated client-side. */
export interface Backend {
  loadAll(): Promise<Snapshot>
  addItem(item: LearningItem, revisions: Revision[]): Promise<void>
  updateItem(item: LearningItem): Promise<void>
  deleteItem(id: string): Promise<void>
  upsertRevisions(revisions: Revision[]): Promise<void>
  restartItem(itemId: string, revisions: Revision[]): Promise<void>
  upsertTodos(todos: Todo[]): Promise<void>
  deleteTodo(id: string): Promise<void>
  saveSettings(settings: Settings): Promise<void>
  importSnapshot(snapshot: Snapshot): Promise<void>
}

export const DEFAULT_SETTINGS: Settings = { long_term_review: false }

export const isDemo = import.meta.env.VITE_DEMO === 'true'
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const isConfigured = isDemo || Boolean(url && anonKey)

export const supabase: SupabaseClient | null = !isDemo && url && anonKey ? createClient(url, anonKey) : null

// ---------------------------------------------------------------------------
// Supabase (production). Row Level Security on the server is what keeps the
// data owner-only; this client just uses the logged-in session.
// ---------------------------------------------------------------------------

function check<T extends { error: { message: string } | null }>(res: T): T {
  if (res.error) throw new Error(res.error.message)
  return res
}

const itemColumns = 'id,title,subject,notes,learned_on,created_at'
const revisionColumns = 'id,item_id,round,due_on,done_at'
const todoColumns = 'id,title,due_on,done_at,position,created_at'

const pickRevision = ({ id, item_id, round, due_on, done_at }: Revision) => ({ id, item_id, round, due_on, done_at })
const pickTodo = ({ id, title, due_on, done_at, position }: Todo) => ({ id, title, due_on, done_at, position })

function supabaseBackend(db: SupabaseClient): Backend {
  return {
    async loadAll() {
      const [items, revisions, todos, settings] = await Promise.all([
        db.from('learning_items').select(itemColumns).order('learned_on', { ascending: false }),
        db.from('revisions').select(revisionColumns),
        db.from('todos').select(todoColumns).order('position'),
        db.from('settings').select('long_term_review').maybeSingle(),
      ])
      return {
        items: check(items).data as LearningItem[],
        revisions: check(revisions).data as Revision[],
        todos: check(todos).data as Todo[],
        settings: (check(settings).data as Settings | null) ?? DEFAULT_SETTINGS,
      }
    },
    async addItem(item, revisions) {
      check(
        await db.rpc('add_learning_item', {
          p_item: item,
          p_revisions: revisions.map(({ id, round, due_on }) => ({ id, round, due_on })),
        }),
      )
    },
    async updateItem({ id, title, subject, notes, learned_on }) {
      check(await db.from('learning_items').update({ title, subject, notes, learned_on }).eq('id', id))
    },
    async deleteItem(id) {
      check(await db.from('learning_items').delete().eq('id', id))
    },
    async upsertRevisions(revisions) {
      if (revisions.length) check(await db.from('revisions').upsert(revisions.map(pickRevision)))
    },
    async restartItem(itemId, revisions) {
      check(
        await db.rpc('restart_item', {
          p_item_id: itemId,
          p_revisions: revisions.map(({ id, round, due_on }) => ({ id, round, due_on })),
        }),
      )
    },
    async upsertTodos(todos) {
      if (todos.length) check(await db.from('todos').upsert(todos.map(pickTodo)))
    },
    async deleteTodo(id) {
      check(await db.from('todos').delete().eq('id', id))
    },
    async saveSettings(settings) {
      check(await db.from('settings').upsert({ long_term_review: settings.long_term_review }))
    },
    async importSnapshot(s) {
      const items = s.items.map(({ id, title, subject, notes, learned_on }) => ({ id, title, subject, notes, learned_on }))
      if (items.length) check(await db.from('learning_items').upsert(items))
      await this.upsertRevisions(s.revisions)
      await this.upsertTodos(s.todos)
      await this.saveSettings(s.settings ?? DEFAULT_SETTINGS)
    },
  }
}

// ---------------------------------------------------------------------------
// Demo mode: data lives in this browser's localStorage only. Enabled with
// VITE_DEMO=true (`npm run dev:demo`) for trying the app without Supabase.
// ---------------------------------------------------------------------------

const DEMO_KEY = 'study-planner-demo'

function localBackend(): Backend {
  const read = (): Snapshot => {
    try {
      const raw = localStorage.getItem(DEMO_KEY)
      if (raw) return JSON.parse(raw) as Snapshot
    } catch {
      /* fall through to empty */
    }
    return { items: [], revisions: [], todos: [], settings: DEFAULT_SETTINGS }
  }
  const write = (s: Snapshot) => localStorage.setItem(DEMO_KEY, JSON.stringify(s))
  const mutate = async (fn: (s: Snapshot) => void) => {
    const s = read()
    fn(s)
    write(s)
  }
  const upsert = <T extends { id: string }>(list: T[], rows: T[]) => {
    for (const row of rows) {
      const i = list.findIndex((x) => x.id === row.id)
      if (i >= 0) list[i] = row
      else list.push(row)
    }
  }

  return {
    async loadAll() {
      return read()
    },
    addItem: (item, revisions) =>
      mutate((s) => {
        s.items.push(item)
        s.revisions.push(...revisions)
      }),
    updateItem: (item) => mutate((s) => upsert(s.items, [item])),
    deleteItem: (id) =>
      mutate((s) => {
        s.items = s.items.filter((i) => i.id !== id)
        s.revisions = s.revisions.filter((r) => r.item_id !== id)
      }),
    upsertRevisions: (revisions) => mutate((s) => upsert(s.revisions, revisions)),
    restartItem: (itemId, revisions) =>
      mutate((s) => {
        s.revisions = s.revisions.filter((r) => r.item_id !== itemId).concat(revisions)
      }),
    upsertTodos: (todos) => mutate((s) => upsert(s.todos, todos)),
    deleteTodo: (id) =>
      mutate((s) => {
        s.todos = s.todos.filter((t) => t.id !== id)
      }),
    saveSettings: (settings) =>
      mutate((s) => {
        s.settings = settings
      }),
    importSnapshot: (incoming) =>
      mutate((s) => {
        upsert(s.items, incoming.items)
        upsert(s.revisions, incoming.revisions)
        upsert(s.todos, incoming.todos)
        s.settings = incoming.settings ?? DEFAULT_SETTINGS
      }),
  }
}

export const backend: Backend | null = isDemo ? localBackend() : supabase ? supabaseBackend(supabase) : null
