import { OPEN_ITEM_FORM, TODAY_TODO_INPUT } from '../components/Layout'
import { RevisionRow } from '../components/RevisionRow'
import { TodoList } from '../components/TodoList'
import { useData } from '../hooks/useData'
import { useToday } from '../hooks/useToday'
import { addDaysISO, formatDay } from '../lib/dates'
import { BUSY_DAY_THRESHOLD, computeStreak } from '../lib/stats'
import type { Revision } from '../lib/types'

const byDueThenRound = (a: Revision, b: Revision) => a.due_on.localeCompare(b.due_on) || a.round - b.round

export function TodayPage() {
  const { revisions, todos, items, moveTodos, deleteTodo } = useData()
  const today = useToday()
  const tomorrow = addDaysISO(today, 1)

  const overdue = revisions.filter((r) => !r.done_at && r.due_on < today).sort(byDueThenRound)
  const dueToday = revisions.filter((r) => r.due_on === today).sort(byDueThenRound)
  const dueTomorrow = revisions.filter((r) => r.due_on === tomorrow && !r.done_at).sort(byDueThenRound)
  const todayTodos = todos.filter((t) => t.due_on === today)
  const tomorrowTodos = todos.filter((t) => t.due_on === tomorrow)
  const carried = todos.filter((t) => t.due_on < today && !t.done_at).sort((a, b) => a.due_on.localeCompare(b.due_on))
  const learnedToday = items.filter((i) => i.learned_on === today)
  const openToday = dueToday.filter((r) => !r.done_at).length + todayTodos.filter((t) => !t.done_at).length
  const streak = computeStreak(items, revisions, today)

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="space-y-4 md:col-span-2">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">{formatDay(today, 'EEEE, d MMMM')}</h1>
            <p className="text-sm text-slate-500">
              {openToday === 0 && overdue.length === 0
                ? 'All clear for today 🎉'
                : `${openToday} thing${openToday === 1 ? '' : 's'} left today${overdue.length ? `, ${overdue.length} overdue` : ''}`}
            </p>
          </div>
          {streak > 0 && <span className="chip bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">🔥 {streak}-day streak</span>}
        </div>

        {overdue.length > 0 && (
          <section className="card border-red-200 dark:border-red-900">
            <h2 className="card-title text-red-600 dark:text-red-400">⚠ Overdue revisions ({overdue.length})</h2>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {overdue.map((r) => (
                <RevisionRow key={r.id} revision={r} />
              ))}
            </ul>
          </section>
        )}

        <section className="card">
          <h2 className="card-title">
            🔁 Revise today
            <span className="ml-auto font-normal normal-case">
              {dueToday.filter((r) => r.done_at).length}/{dueToday.length} done
            </span>
          </h2>
          {dueToday.length === 0 ? (
            <p className="py-2 text-sm text-slate-400">No revisions due today.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {dueToday.map((r) => (
                <RevisionRow key={r.id} revision={r} />
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2 className="card-title">✅ Today's to-do list</h2>
          {carried.length > 0 && (
            <div className="mb-3 rounded-lg bg-amber-50 p-3 dark:bg-amber-950/40">
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Carried over from earlier ({carried.length})
                </p>
                <button className="text-xs font-semibold text-amber-800 hover:underline dark:text-amber-200" onClick={() => moveTodos(carried, today)}>
                  Move all to today
                </button>
              </div>
              <ul className="space-y-1">
                {carried.map((t) => (
                  <li key={t.id} className="flex items-center gap-2 text-sm">
                    <span className="flex-1 break-words">{t.title}</span>
                    <span className="text-xs text-slate-500">{formatDay(t.due_on)}</span>
                    <button className="icon-btn text-xs" onClick={() => moveTodos([t], today)}>
                      → Today
                    </button>
                    <button className="icon-btn hover:text-red-600" aria-label="Delete task" onClick={() => deleteTodo(t)}>
                      🗑
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <TodoList todos={todayTodos} dueOn={today} inputId={TODAY_TODO_INPUT} placeholder="Add a task for today… (T)" />
        </section>

        <section className="card">
          <h2 className="card-title">
            📝 Learned today
            <button className="ml-auto text-xs font-semibold text-indigo-600 normal-case hover:underline dark:text-indigo-400" onClick={() => window.dispatchEvent(new Event(OPEN_ITEM_FORM))}>
              + Add what I learned (N)
            </button>
          </h2>
          {learnedToday.length === 0 ? (
            <p className="py-2 text-sm text-slate-400">Nothing logged yet today.</p>
          ) : (
            <ul className="space-y-1">
              {learnedToday.map((i) => (
                <li key={i.id} className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{i.title}</span>
                  {i.subject && <span className="chip">{i.subject}</span>}
                  <span className="ml-auto text-xs text-slate-500">first revision {formatDay(addDaysISO(today, 1))}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <aside className="space-y-4">
        <section className="card">
          <h2 className="card-title">🌙 Tomorrow · {formatDay(tomorrow)}</h2>
          <TodoList todos={tomorrowTodos} dueOn={tomorrow} placeholder="Add for tomorrow…" sortable={false} />
          <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
            <p className="mb-1 flex items-center text-xs font-semibold text-slate-500 uppercase">
              Revisions due tomorrow
              <span
                className={`chip ml-auto ${dueTomorrow.length >= BUSY_DAY_THRESHOLD ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' : ''}`}
              >
                {dueTomorrow.length}
                {dueTomorrow.length >= BUSY_DAY_THRESHOLD && ' · busy day'}
              </span>
            </p>
            {dueTomorrow.length === 0 ? (
              <p className="text-sm text-slate-400">None</p>
            ) : (
              <ul className="text-sm">
                {dueTomorrow.map((r) => (
                  <RevisionRow key={r.id} revision={r} preview />
                ))}
              </ul>
            )}
          </div>
        </section>
      </aside>
    </div>
  )
}
