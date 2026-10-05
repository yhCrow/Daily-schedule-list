import { useRef, useState } from 'react'
import { useToast } from '../components/Toast'
import { useData } from '../hooks/useData'
import { useToday } from '../hooks/useToday'
import { downloadBackup } from '../lib/backup'
import { formatDay, timestampToISODate } from '../lib/dates'
import { LONG_TERM_OFFSET, REVISION_OFFSETS } from '../lib/schedule'
import { getLastBackup, isSnapshot } from '../lib/storage'

export function SettingsPage() {
  const data = useData()
  const toast = useToast()
  const today = useToday()
  const fileRef = useRef<HTMLInputElement>(null)
  const [lastBackup, setLastBackupState] = useState(getLastBackup)

  function exportJson() {
    downloadBackup({ items: data.items, revisions: data.revisions, todos: data.todos, settings: data.settings }, today)
    setLastBackupState(getLastBackup())
  }

  async function importJson(file: File) {
    try {
      const parsed: unknown = JSON.parse(await file.text())
      if (!isSnapshot(parsed)) throw new Error('This file is not a Study Planner backup.')
      const n = parsed.items.length + parsed.revisions.length + parsed.todos.length
      if (!confirm(`Import ${parsed.items.length} items, ${parsed.revisions.length} revisions and ${parsed.todos.length} to-dos? Rows with the same id are overwritten.`))
        return
      data.importSnapshot(parsed)
      toast(`Imported ${n} rows`)
    } catch (e) {
      toast(`Import failed: ${(e as Error).message}`, { error: true })
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>

      <section className="card space-y-3">
        <h2 className="card-title">Revision schedule</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          New items are revised <strong>{REVISION_OFFSETS.join(', ')}</strong> days after the day you learned them.
        </p>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            className="check mt-0.5"
            checked={data.settings.long_term_review}
            onChange={(e) => data.saveSettings({ ...data.settings, long_term_review: e.target.checked })}
          />
          <span className="text-sm">
            Add a long-term review at <strong>{LONG_TERM_OFFSET} days</strong>
            <span className="block text-xs text-slate-500">Applies to items you add from now on.</span>
          </span>
        </label>
        <ul className="list-disc space-y-1 pl-5 text-xs text-slate-500">
          <li>Finish a revision late and the later revisions of that item move back by the same number of days.</li>
          <li>"Didn't remember it" restarts an item's revisions from today.</li>
          <li>Editing the learned date moves any revisions you haven't done yet.</li>
        </ul>
      </section>

      <section className="card space-y-3">
        <h2 className="card-title">Your data &amp; backup</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Everything is saved <strong>only in this browser</strong> on this device. Nothing is uploaded, so nobody else
          can see or change your planner. Anyone else who opens this site gets their own empty one.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-xs text-slate-500">
          <li>Clearing your browser's site data, or using a private window, wipes or hides it. Download a backup regularly.</li>
          <li>To move to another device or browser: download a backup here, then import it there.</li>
        </ul>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn-primary" onClick={exportJson}>
            ⬇ Download backup
          </button>
          <button className="btn-ghost border border-slate-300 dark:border-slate-700" onClick={() => fileRef.current?.click()}>
            ⬆ Import backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])}
          />
          <span className="text-xs text-slate-500">
            Last backup: {lastBackup ? formatDay(timestampToISODate(lastBackup), 'd MMM yyyy') : 'never'}
          </span>
        </div>
      </section>

      <section className="card text-sm text-slate-500">
        <h2 className="card-title">Keyboard shortcuts</h2>
        <p>
          <kbd className="chip font-mono">N</kbd> add what you learned · <kbd className="chip font-mono">T</kbd> add a to-do for today ·{' '}
          <kbd className="chip font-mono">Esc</kbd> close dialog
        </p>
      </section>
    </div>
  )
}
