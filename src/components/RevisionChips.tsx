import { useData } from '../hooks/useData'
import { useToday } from '../hooks/useToday'
import { formatDay } from '../lib/dates'

/** The full revision schedule for one item: R1–R4 with date and status. */
export function RevisionChips({ itemId }: { itemId: string }) {
  const { revisions } = useData()
  const today = useToday()
  const list = revisions.filter((r) => r.item_id === itemId).sort((a, b) => a.round - b.round)

  return (
    <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label="Revision schedule">
      {list.map((r) => {
        const state = r.done_at ? 'done' : r.due_on < today ? 'overdue' : r.due_on === today ? 'today' : 'upcoming'
        const style = {
          done: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
          overdue: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
          today: 'bg-indigo-600 text-white',
          upcoming: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
        }[state]
        const label = { done: ' ✓', overdue: ' · late', today: ' · today', upcoming: '' }[state]
        return (
          <li key={r.id} className={`rounded-full px-2 py-0.5 text-xs whitespace-nowrap ${style}`}>
            <span className="font-semibold">R{r.round}</span> {formatDay(r.due_on, 'EEE d MMM')}
            {label}
          </li>
        )
      })}
    </ul>
  )
}
