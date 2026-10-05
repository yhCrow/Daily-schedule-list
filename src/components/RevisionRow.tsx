import { useData, useItemMap } from '../hooks/useData'
import { useToday } from '../hooks/useToday'
import { diffDaysISO } from '../lib/dates'
import type { Revision } from '../lib/types'
import { Notes } from './Notes'

interface Props {
  revision: Revision
  /** Read-only preview (e.g. tomorrow's revisions). */
  preview?: boolean
}

export function RevisionRow({ revision, preview }: Props) {
  const { toggleRevision, restartItem, revisions } = useData()
  const item = useItemMap().get(revision.item_id)
  const today = useToday()
  if (!item) return null

  const late = revision.done_at ? 0 : diffDaysISO(today, revision.due_on)
  const total = revisions.filter((r) => r.item_id === item.id).length
  const done = Boolean(revision.done_at)

  return (
    <li className="flex items-start gap-3 py-2">
      {!preview && (
        <input
          type="checkbox"
          className="check mt-0.5"
          checked={done}
          onChange={() => toggleRevision(revision, today)}
          aria-label={`Mark revision R${revision.round} of ${item.title} as done`}
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`font-medium ${done ? 'text-slate-400 line-through' : ''}`}>{item.title}</span>
          <span className="chip bg-indigo-100 font-semibold text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
            R{revision.round}/{total}
          </span>
          {item.subject && <span className="chip">{item.subject}</span>}
          {late > 0 && (
            <span className="chip bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300">
              {late} day{late > 1 ? 's' : ''} late
            </span>
          )}
        </div>
        {item.notes && !preview && <Notes text={item.notes} />}
      </div>
      {!preview && !done && (
        <button
          className="icon-btn text-xs whitespace-nowrap"
          title="Didn't remember it: restart this item's schedule from today"
          onClick={() => restartItem(item.id, today)}
        >
          ↺ Forgot
        </button>
      )}
    </li>
  )
}
