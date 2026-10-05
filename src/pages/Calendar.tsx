import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, parseISO, startOfMonth, startOfWeek } from 'date-fns'
import { useState } from 'react'
import { RevisionRow } from '../components/RevisionRow'
import { TodoList } from '../components/TodoList'
import { useData } from '../hooks/useData'
import { useToday } from '../hooks/useToday'
import { formatDay, toISODate } from '../lib/dates'
import { BUSY_DAY_THRESHOLD } from '../lib/stats'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function CalendarPage() {
  const { revisions, todos } = useData()
  const today = useToday()
  const [month, setMonth] = useState(() => startOfMonth(parseISO(today)))
  const [selected, setSelected] = useState(today)

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  }).map(toISODate)

  const revCount = new Map<string, { total: number; open: number }>()
  for (const r of revisions) {
    const c = revCount.get(r.due_on) ?? { total: 0, open: 0 }
    c.total++
    if (!r.done_at) c.open++
    revCount.set(r.due_on, c)
  }
  const todoCount = new Map<string, number>()
  for (const t of todos) todoCount.set(t.due_on, (todoCount.get(t.due_on) ?? 0) + 1)

  const selectedRevs = revisions.filter((r) => r.due_on === selected).sort((a, b) => a.round - b.round)
  const selectedTodos = todos.filter((t) => t.due_on === selected)
  const monthKey = format(month, 'yyyy-MM')

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <section className="card lg:col-span-3">
        <div className="mb-3 flex items-center gap-2">
          <button className="icon-btn" onClick={() => setMonth((m) => addMonths(m, -1))} aria-label="Previous month">
            ◀
          </button>
          <h1 className="flex-1 text-center text-lg font-semibold">{format(month, 'MMMM yyyy')}</h1>
          <button className="icon-btn" onClick={() => setMonth((m) => addMonths(m, 1))} aria-label="Next month">
            ▶
          </button>
          <button
            className="btn-ghost text-xs"
            onClick={() => {
              setMonth(startOfMonth(parseISO(today)))
              setSelected(today)
            }}
          >
            Today
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-1 font-medium">
              {d}
            </div>
          ))}
          {days.map((d) => {
            const rc = revCount.get(d)
            const tc = todoCount.get(d) ?? 0
            const busy = (rc?.total ?? 0) >= BUSY_DAY_THRESHOLD
            const missed = d < today && (rc?.open ?? 0) > 0
            return (
              <button
                key={d}
                onClick={() => setSelected(d)}
                className={`flex aspect-square flex-col items-center justify-start gap-0.5 rounded-lg p-1 text-sm transition sm:aspect-[4/3] ${
                  d.startsWith(monthKey) ? 'text-slate-800 dark:text-slate-200' : 'text-slate-300 dark:text-slate-600'
                } ${selected === d ? 'bg-indigo-600 !text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'} ${
                  d === today && selected !== d ? 'ring-2 ring-indigo-500' : ''
                }`}
              >
                <span className="font-medium">{Number(d.slice(8))}</span>
                {rc && (
                  <span
                    className={`rounded-full px-1.5 text-[10px] leading-4 font-semibold ${
                      missed
                        ? 'bg-red-500 text-white'
                        : busy
                          ? 'bg-amber-400 text-amber-950'
                          : rc.open === 0
                            ? 'bg-green-500 text-white'
                            : 'bg-indigo-200 text-indigo-800 dark:bg-indigo-800 dark:text-indigo-100'
                    }`}
                    title={`${rc.total} revision(s), ${rc.open} open`}
                  >
                    {rc.total}
                  </span>
                )}
                {tc > 0 && (
                  <span className="flex gap-0.5">
                    {Array.from({ length: Math.min(tc, 3) }, (_, i) => (
                      <span key={i} className={`size-1 rounded-full ${selected === d ? 'bg-white' : 'bg-slate-400'}`} />
                    ))}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
          <Legend className="bg-indigo-200 dark:bg-indigo-800" label="Revisions due" />
          <Legend className="bg-green-500" label="All done" />
          <Legend className="bg-amber-400" label={`Busy (${BUSY_DAY_THRESHOLD}+)`} />
          <Legend className="bg-red-500" label="Missed" />
          <span className="flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-slate-400" /> To-dos
          </span>
        </div>
      </section>

      <section className="card space-y-4 lg:col-span-2">
        <h2 className="text-lg font-semibold">{formatDay(selected, 'EEEE, d MMMM yyyy')}</h2>
        <div>
          <h3 className="card-title">Revisions ({selectedRevs.length})</h3>
          {selectedRevs.length === 0 ? (
            <p className="text-sm text-slate-400">None due.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {selectedRevs.map((r) => (
                <RevisionRow key={r.id} revision={r} preview={selected > today} />
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="card-title">To-dos</h3>
          <TodoList key={selected} todos={selectedTodos} dueOn={selected} placeholder={`Add a task for ${formatDay(selected)}…`} />
        </div>
      </section>
    </div>
  )
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`size-2.5 rounded-full ${className}`} /> {label}
    </span>
  )
}
