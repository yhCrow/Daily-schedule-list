import { setLastBackup } from './storage'
import type { Snapshot } from './types'

/** Downloads all planner data as a JSON file and remembers when. */
export function downloadBackup(snapshot: Snapshot, today: string): void {
  const now = new Date().toISOString()
  const blob = new Blob([JSON.stringify({ exported_at: now, ...snapshot }, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `study-planner-backup-${today}.json`
  a.click()
  URL.revokeObjectURL(a.href)
  setLastBackup(now)
}
