import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'
import type { ISODate } from './types'

// All schedule dates are plain local calendar dates, never timestamps, so a
// revision due "Tuesday" stays on Tuesday regardless of time of day or DST.

export function toISODate(d: Date): ISODate {
  return format(d, 'yyyy-MM-dd')
}

export function todayISO(now: Date = new Date()): ISODate {
  return toISODate(now)
}

export function addDaysISO(date: ISODate, days: number): ISODate {
  return toISODate(addDays(parseISO(date), days))
}

/** Whole calendar days from `b` to `a` (positive when `a` is later). */
export function diffDaysISO(a: ISODate, b: ISODate): number {
  return differenceInCalendarDays(parseISO(a), parseISO(b))
}

/** The local calendar date a timestamp (e.g. `done_at`) falls on. */
export function timestampToISODate(ts: string): ISODate {
  return toISODate(new Date(ts))
}

export function formatDay(date: ISODate, pattern = 'EEE d MMM'): string {
  return format(parseISO(date), pattern)
}
