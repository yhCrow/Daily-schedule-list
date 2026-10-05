import { useMemo, useState } from 'react'
import { ItemForm } from '../components/ItemForm'
import { Notes } from '../components/Notes'
import { useData } from '../hooks/useData'
import { useToday } from '../hooks/useToday'
import { formatDay, timestampToISODate } from '../lib/dates'
import { nextDue } from '../lib/schedule'
import type { LearningItem, Revision } from '../lib/types'

type Filter = 'all' | 'active' | 'finished'

export function LearnPage() {
  const { items, revisions } = useData()
  const [query, setQuery] = useState('')
  const [subject, setSubject] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [adding, setAdding] = useState(false)

  const revsByItem = useMemo(() => {
    const map = new Map<string, Revision[]>()
    for (const r of revisions) map.set(r.item_id, [...(map.get(r.item_id) ?? []), r])
    for (const list of map.values()) list.sort((a, b) => a.round - b.round)
    return map
  }, [revisions])

  const subjects = [...new Set(items.map((i) => i.subject).filter(Boolean))].sort() as string[]
  const q = query.trim().toLowerCase()
  const shown = items
    .filter((i) => !subject || i.subject === subject)
    .filter((i) => !q || `${i.title} ${i.subject ?? ''} ${i.notes ?? ''}`.toLowerCase().includes(q))
    .filter((i) => {
      if (filter === 'all') return true
      const finished = (revsByItem.get(i.id) ?? []).every((r) => r.done_at)
      return filter === 'finished' ? finished : !finished
    })
    .sort((a, b) => b.learned_on.localeCompare(a.learned_on) || b.created_at.localeCompare(a.created_at))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Everything I've learned</h1>
        <button className="btn-primary" onClick={() => setAdding(true)}>
          + Add learning
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          className="input max-w-xs flex-1"
          type="search"
          placeholder="Search titles, notes…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className="input w-auto" value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Filter by subject">
          <option value="">All subjects</option>
          {subjects.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select className="input w-auto" value={filter} onChange={(e) => setFilter(e.target.value as Filter)} aria-label="Filter by progress">
          <option value="all">All</option>
          <option value="active">In progress</option>
          <option value="finished">Finished</option>
        </select>
      </div>

      {shown.length === 0 ? (
        <p className="card text-sm text-slate-400">
          {items.length === 0 ? 'Nothing logged yet. Press N or "+ Add learning" to start.' : 'No items match.'}
        </p>
      ) : (
        <ul className="space-y-3">
          {shown.map((item) => (
            <ItemCard key={item.id} item={item} revisions={revsByItem.get(item.id) ?? []} />
          ))}
        </ul>
      )}

      {adding && <ItemForm onClose={() => setAdding(false)} />}
    </div>
  )
}

function ItemCard({ item, revisions }: { item: LearningItem; revisions: Revision[] }) {
  const { toggleRevision, restartItem, deleteItem } = useData()
  const today = useToday()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const done = revisions.filter((r) => r.done_at).length
  const next = nextDue(revisions)

  return (
    <li className="card">
      <div className="flex flex-wrap items-start gap-2">
        <button className="min-w-0 flex-1 text-left" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{item.title}</span>
            {item.subject && <span className="chip">{item.subject}</span>}
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Learned {formatDay(item.learned_on)} ·{' '}
            {next ? (
              <>
                next: R{next.round} on{' '}
                <span className={next.due_on < today ? 'font-semibold text-red-600' : ''}>{formatDay(next.due_on)}</span>
              </>
            ) : (
              'all revisions done ✓'
            )}
          </p>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium tabular-nums">
            {done}/{revisions.length}
          </span>
          <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div className="h-full bg-indigo-500" style={{ width: `${revisions.length ? (done / revisions.length) * 100 : 0}%` }} />
          </div>
        </div>
      </div>

      {open && (
        <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
          {item.notes && <Notes text={item.notes} />}
          <ul className="my-2 grid gap-1 sm:grid-cols-2">
            {revisions.map((r) => (
              <li key={r.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="check"
                  checked={Boolean(r.done_at)}
                  onChange={() => toggleRevision(r, today)}
                  aria-label={`Revision R${r.round}`}
                />
                <span className="font-medium">R{r.round}</span>
                <span className={!r.done_at && r.due_on < today ? 'text-red-600' : 'text-slate-500'}>
                  {formatDay(r.due_on)}
                </span>
                {r.done_at && <span className="text-xs text-green-600">done {formatDay(timestampToISODate(r.done_at))}</span>}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost" onClick={() => setEditing(true)}>
              ✎ Edit
            </button>
            <button className="btn-ghost" onClick={() => restartItem(item.id, today)} title="Restart the schedule from today">
              ↺ Didn't remember it
            </button>
            <button
              className="btn-ghost text-red-600"
              onClick={() => {
                if (confirm(`Delete "${item.title}" and all of its revisions?`)) deleteItem(item.id)
              }}
            >
              🗑 Delete
            </button>
          </div>
        </div>
      )}

      {editing && <ItemForm item={item} onClose={() => setEditing(false)} />}
    </li>
  )
}
