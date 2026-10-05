import { useData } from '../hooks/useData'
import { useToday } from '../hooks/useToday'
import { addDaysISO, formatDay } from '../lib/dates'
import { BUSY_DAY_THRESHOLD, computeStats } from '../lib/stats'

const pct = (n: number | null) => (n === null ? '—' : `${Math.round(n * 100)}%`)

export function StatsPage() {
  const { items, revisions, todos } = useData()
  const today = useToday()
  const s = computeStats(items, revisions, today)
  const todosDone = todos.filter((t) => t.done_at).length

  const upcoming = Array.from({ length: 7 }, (_, i) => {
    const day = addDaysISO(today, i)
    return {
      day,
      revisions: revisions.filter((r) => r.due_on === day && !r.done_at).length,
      todos: todos.filter((t) => t.due_on === day && !t.done_at).length,
    }
  })

  const subjects = new Map<string, number>()
  for (const i of items) subjects.set(i.subject ?? 'No subject', (subjects.get(i.subject ?? 'No subject') ?? 0) + 1)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Stats</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Tile label="Current streak" value={`🔥 ${s.streak} day${s.streak === 1 ? '' : 's'}`} hint="Days with every revision done on time" />
        <Tile label="Items learned" value={s.totalItems} />
        <Tile label="Revisions done" value={s.revisionsDone} />
        <Tile label="Completion rate" value={pct(s.completionRate)} hint={`of ${s.revisionsDueSoFar} revisions due so far`} />
        <Tile label="On-time rate" value={pct(s.onTimeRate)} hint="done on or before the due day" />
        <Tile label="To-dos done" value={todosDone} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card">
          <h2 className="card-title">Next 7 days</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-slate-500">
              <tr>
                <th className="py-1 font-medium">Day</th>
                <th className="py-1 text-right font-medium">Revisions</th>
                <th className="py-1 text-right font-medium">To-dos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {upcoming.map((u) => (
                <tr key={u.day}>
                  <td className="py-1.5">{u.day === today ? 'Today' : formatDay(u.day)}</td>
                  <td className="py-1.5 text-right tabular-nums">
                    {u.revisions >= BUSY_DAY_THRESHOLD ? (
                      <span className="chip bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">{u.revisions} · busy</span>
                    ) : (
                      u.revisions
                    )}
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{u.todos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card">
          <h2 className="card-title">Items by subject</h2>
          {subjects.size === 0 ? (
            <p className="text-sm text-slate-400">Nothing yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
              {[...subjects.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([name, n]) => (
                  <li key={name} className="flex justify-between py-1.5">
                    <span>{name}</span>
                    <span className="tabular-nums">{n}</span>
                  </li>
                ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

function Tile({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="card">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
  )
}
