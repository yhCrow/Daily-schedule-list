import { describe, expect, it } from 'vitest'
import { addDaysISO, diffDaysISO, todayISO } from './dates'
import {
  buildSchedule,
  completeRevision,
  getOffsets,
  nextDue,
  recalcForLearnedDate,
  REVISION_OFFSETS,
} from './schedule'
import { computeStats, computeStreak } from './stats'
import type { LearningItem, Revision } from './types'

function revs(start: string, offsets = REVISION_OFFSETS): Revision[] {
  return buildSchedule(start, offsets).map((p) => ({
    id: `r${p.round}`,
    item_id: 'i1',
    round: p.round,
    due_on: p.due_on,
    done_at: null,
  }))
}

// Noon local time on a given date, used as a done_at timestamp.
const at = (date: string) => new Date(`${date}T12:00:00`).toISOString()

describe('buildSchedule', () => {
  it('schedules revisions 1, 3, 7 and 10 days after learning', () => {
    expect(buildSchedule('2026-10-05', REVISION_OFFSETS)).toEqual([
      { round: 1, due_on: '2026-10-06' },
      { round: 2, due_on: '2026-10-08' },
      { round: 3, due_on: '2026-10-12' },
      { round: 4, due_on: '2026-10-15' },
    ])
  })

  it('adds the optional 30-day review', () => {
    expect(getOffsets(true)).toEqual([1, 3, 7, 10, 30])
    expect(buildSchedule('2026-10-05', getOffsets(true))[4]).toEqual({ round: 5, due_on: '2026-11-04' })
  })

  it('crosses month boundaries', () => {
    expect(buildSchedule('2026-01-28', REVISION_OFFSETS).map((r) => r.due_on)).toEqual([
      '2026-01-29',
      '2026-01-31',
      '2026-02-04',
      '2026-02-07',
    ])
  })

  it('handles February in a leap year', () => {
    expect(buildSchedule('2028-02-27', REVISION_OFFSETS).map((r) => r.due_on)).toEqual([
      '2028-02-28',
      '2028-03-01',
      '2028-03-05',
      '2028-03-08',
    ])
  })

  it('crosses year boundaries', () => {
    expect(buildSchedule('2026-12-29', REVISION_OFFSETS).map((r) => r.due_on)).toEqual([
      '2026-12-30',
      '2027-01-01',
      '2027-01-05',
      '2027-01-08',
    ])
  })
})

describe('dates', () => {
  it('uses the local calendar date around midnight', () => {
    expect(todayISO(new Date(2026, 9, 5, 23, 59, 59))).toBe('2026-10-05')
    expect(todayISO(new Date(2026, 9, 6, 0, 0, 1))).toBe('2026-10-06')
  })

  it('is not thrown off by daylight saving changes', () => {
    // Covers both northern (Mar/Oct-Nov) and southern hemisphere DST switches.
    expect(addDaysISO('2026-03-28', 1)).toBe('2026-03-29')
    expect(addDaysISO('2026-03-29', 1)).toBe('2026-03-30')
    expect(addDaysISO('2026-10-24', 10)).toBe('2026-11-03')
    expect(diffDaysISO('2026-11-03', '2026-10-24')).toBe(10)
  })
})

describe('recalcForLearnedDate', () => {
  it('moves only unfinished revisions to the new offsets', () => {
    const r = revs('2026-10-05')
    r[0].done_at = at('2026-10-06')
    const changed = recalcForLearnedDate(r, '2026-10-07')
    expect(changed.map((c) => [c.round, c.due_on])).toEqual([
      [2, '2026-10-10'],
      [3, '2026-10-14'],
      [4, '2026-10-17'],
    ])
  })

  it('returns nothing when the date did not change', () => {
    expect(recalcForLearnedDate(revs('2026-10-05'), '2026-10-05')).toEqual([])
  })
})

describe('completeRevision', () => {
  it('marks an on-time revision done without moving the others', () => {
    const changed = completeRevision(revs('2026-10-05'), 'r1', at('2026-10-06'), '2026-10-06')
    expect(changed).toHaveLength(1)
    expect(changed[0].done_at).toBe(at('2026-10-06'))
  })

  it('completing early does not move the others', () => {
    expect(completeRevision(revs('2026-10-05'), 'r2', at('2026-10-06'), '2026-10-06')).toHaveLength(1)
  })

  it('shifts later unfinished revisions when completed late', () => {
    const r = revs('2026-10-05')
    r[3].done_at = at('2026-10-05') // already done somehow; must not move
    const changed = completeRevision(r, 'r1', at('2026-10-09'), '2026-10-09') // 3 days late
    expect(changed.map((c) => [c.round, c.due_on])).toEqual([
      [1, '2026-10-06'],
      [2, '2026-10-11'],
      [3, '2026-10-15'],
    ])
  })

  it('ignores revisions that are already done', () => {
    const r = revs('2026-10-05')
    r[0].done_at = at('2026-10-06')
    expect(completeRevision(r, 'r1', at('2026-10-09'), '2026-10-09')).toEqual([])
  })
})

describe('nextDue', () => {
  it('returns the lowest unfinished round', () => {
    const r = revs('2026-10-05')
    r[0].done_at = at('2026-10-06')
    expect(nextDue(r)?.round).toBe(2)
  })
})

describe('stats', () => {
  const items: LearningItem[] = [
    { id: 'i1', title: 'x', subject: null, notes: null, learned_on: '2026-10-05', created_at: '' },
  ]

  it('counts a streak of clean days and skips an unfinished today', () => {
    const r = revs('2026-10-05')
    r[0].done_at = at('2026-10-06')
    r[1].done_at = at('2026-10-08')
    // Today is the 12th: R3 is due today and not done, so count back from the 11th.
    expect(computeStreak(items, r, '2026-10-12')).toBe(7) // 5th..11th
    r[2].done_at = at('2026-10-12')
    expect(computeStreak(items, r, '2026-10-12')).toBe(8)
  })

  it('breaks the streak on a missed day', () => {
    const r = revs('2026-10-05')
    r[0].done_at = at('2026-10-07') // done a day late
    expect(computeStreak(items, r, '2026-10-08')).toBe(1) // 8th has R2 open, 7th is clean, 6th's R1 was done late
  })

  it('computes completion and on-time rates', () => {
    const r = revs('2026-10-05')
    r[0].done_at = at('2026-10-06')
    r[1].done_at = at('2026-10-09')
    const s = computeStats(items, r, '2026-10-09')
    expect(s.revisionsDueSoFar).toBe(2)
    expect(s.completionRate).toBe(1)
    expect(s.onTimeRate).toBe(0.5)
  })
})
