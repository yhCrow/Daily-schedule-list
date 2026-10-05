import { addDaysISO, diffDaysISO } from './dates'
import type { ISODate, Revision } from './types'

/** Days after the learned date that each revision round is due. Change here only. */
export const REVISION_OFFSETS = [1, 3, 7, 10]

/** Optional extra long-term review (toggle in Settings). */
export const LONG_TERM_OFFSET = 30

export function getOffsets(longTermReview: boolean): number[] {
  return longTermReview ? [...REVISION_OFFSETS, LONG_TERM_OFFSET] : [...REVISION_OFFSETS]
}

/** Offset for a round number, used when recalculating existing revisions. */
export function offsetForRound(round: number): number {
  return [...REVISION_OFFSETS, LONG_TERM_OFFSET][round - 1] ?? LONG_TERM_OFFSET
}

export interface PlannedRevision {
  round: number
  due_on: ISODate
}

export function buildSchedule(start: ISODate, offsets: number[]): PlannedRevision[] {
  return offsets.map((offset, i) => ({ round: i + 1, due_on: addDaysISO(start, offset) }))
}

/**
 * The learned date was edited: move every revision that isn't done yet so it
 * sits at its usual offset from the new date. Completed revisions are kept.
 * Returns only the revisions that changed.
 */
export function recalcForLearnedDate(revisions: Revision[], learnedOn: ISODate): Revision[] {
  const changed: Revision[] = []
  for (const r of revisions) {
    if (r.done_at) continue
    const due_on = addDaysISO(learnedOn, offsetForRound(r.round))
    if (due_on !== r.due_on) changed.push({ ...r, due_on })
  }
  return changed
}

/**
 * Mark a revision done. If it was completed late, push the item's later,
 * unfinished revisions back by the same number of days so the spacing between
 * reviews still makes sense. Returns every revision that changed.
 */
export function completeRevision(
  itemRevisions: Revision[],
  revisionId: string,
  doneAt: string,
  today: ISODate,
): Revision[] {
  const target = itemRevisions.find((r) => r.id === revisionId)
  if (!target || target.done_at) return []

  const changed: Revision[] = [{ ...target, done_at: doneAt }]
  const lateDays = diffDaysISO(today, target.due_on)
  if (lateDays > 0) {
    for (const r of itemRevisions) {
      if (r.round > target.round && !r.done_at) {
        changed.push({ ...r, due_on: addDaysISO(r.due_on, lateDays) })
      }
    }
  }
  return changed
}

export function nextDue(itemRevisions: Revision[]): Revision | undefined {
  return itemRevisions
    .filter((r) => !r.done_at)
    .sort((a, b) => a.round - b.round)[0]
}
