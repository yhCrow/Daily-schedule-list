import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useData } from '../hooks/useData'
import { useToday } from '../hooks/useToday'
import { formatDay } from '../lib/dates'
import { buildSchedule, getOffsets } from '../lib/schedule'
import type { LearningItem } from '../lib/types'

interface Props {
  item?: LearningItem
  onClose(): void
}

/** Modal to log something learned (or edit an existing item). */
export function ItemForm({ item, onClose }: Props) {
  const { addItem, updateItem, items, settings } = useData()
  const today = useToday()
  const [title, setTitle] = useState(item?.title ?? '')
  const [subject, setSubject] = useState(item?.subject ?? '')
  const [notes, setNotes] = useState(item?.notes ?? '')
  const [learnedOn, setLearnedOn] = useState(item?.learned_on ?? today)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    titleRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const subjects = [...new Set(items.map((i) => i.subject).filter(Boolean))] as string[]
  const preview = buildSchedule(learnedOn || today, getOffsets(settings.long_term_review))

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || !learnedOn) return
    const fields = {
      title: title.trim(),
      subject: subject.trim() || null,
      notes: notes.trim() || null,
      learned_on: learnedOn,
    }
    if (item) updateItem({ ...item, ...fields })
    else addItem(fields)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={submit}
        role="dialog"
        aria-label={item ? 'Edit learning item' : 'Add what you learned'}
        className="card w-full max-w-lg space-y-3 rounded-b-none sm:rounded-2xl"
      >
        <h2 className="text-lg font-semibold">{item ? 'Edit learning item' : 'What did you learn?'}</h2>
        <label className="block space-y-1">
          <span className="text-sm text-slate-500">Title *</span>
          <input
            ref={titleRef}
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Integration by parts"
            required
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-sm text-slate-500">Subject / tag</span>
            <input
              className="input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              list="subjects"
              placeholder="e.g. Maths"
            />
            <datalist id="subjects">
              {subjects.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </label>
          <label className="block space-y-1">
            <span className="text-sm text-slate-500">Date learned</span>
            <input
              type="date"
              className="input"
              value={learnedOn}
              max={today}
              onChange={(e) => setLearnedOn(e.target.value)}
              required
            />
          </label>
        </div>
        <label className="block space-y-1">
          <span className="text-sm text-slate-500">Notes or link</span>
          <textarea
            className="input min-h-20"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Key points, page numbers, a URL…"
          />
        </label>

        <div className="rounded-lg bg-indigo-50 p-3 text-sm dark:bg-indigo-950/50">
          <p className="mb-1 font-medium text-indigo-700 dark:text-indigo-300">
            {item ? 'Unfinished revisions will move to:' : 'Revisions will be scheduled on:'}
          </p>
          <ul className="flex flex-wrap gap-2">
            {preview.map((p) => (
              <li key={p.round} className="chip bg-white dark:bg-slate-900">
                R{p.round} · {formatDay(p.due_on)}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            {item ? 'Save' : 'Add & schedule'}
          </button>
        </div>
      </form>
    </div>
  )
}
