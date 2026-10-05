import { addDaysISO, diffDaysISO, timestampToISODate } from './dates'
import type { ISODate, LearningItem, Revision } from './types'

export interface Stats {
  streak: number
  totalItems: number
  revisionsDone: number
  revisionsDueSoFar: number
  completionRate: number | null
  onTimeRate: number | null
}

/** Days with at least this many revisions get a "busy day" warning. */
export const BUSY_DAY_THRESHOLD = 6

/**
 * Streak = consecutive days, ending today, on which every revision due that
 * day was completed on or before that day. Days with nothing due keep the
 * streak going. Today only counts once everything due today is done; if not,
 * the streak counts back from yesterday.
 */
export function computeStreak(items: LearningItem[], revisions: Revision[], today: ISODate): number {
  if (items.length === 0) return 0
  const firstDay = items.reduce((min, i) => (i.learned_on < min ? i.learned_on : min), items[0].learned_on)

  const byDay = new Map<ISODate, Revision[]>()
  for (const r of revisions) {
    const list = byDay.get(r.due_on) ?? []
    list.push(r)
    byDay.set(r.due_on, list)
  }
  const dayIsClean = (day: ISODate) =>
    (byDay.get(day) ?? []).every((r) => r.done_at && timestampToISODate(r.done_at) <= day)

  let day = dayIsClean(today) ? today : addDaysISO(today, -1)
  let streak = 0
  while (diffDaysISO(day, firstDay) >= 0 && dayIsClean(day)) {
    streak++
    day = addDaysISO(day, -1)
  }
  return streak
}

export function computeStats(items: LearningItem[], revisions: Revision[], today: ISODate): Stats {
  const dueSoFar = revisions.filter((r) => r.due_on <= today)
  const done = revisions.filter((r) => r.done_at)
  const doneOfDue = dueSoFar.filter((r) => r.done_at)
  const onTime = done.filter((r) => timestampToISODate(r.done_at!) <= r.due_on)
  return {
    streak: computeStreak(items, revisions, today),
    totalItems: items.length,
    revisionsDone: done.length,
    revisionsDueSoFar: dueSoFar.length,
    completionRate: dueSoFar.length ? doneOfDue.length / dueSoFar.length : null,
    onTimeRate: done.length ? onTime.length / done.length : null,
  }
}
