/** A calendar date in the user's local timezone, formatted `yyyy-MM-dd`. */
export type ISODate = string

export interface LearningItem {
  id: string
  title: string
  subject: string | null
  notes: string | null
  learned_on: ISODate
  created_at: string
}

export interface Revision {
  id: string
  item_id: string
  round: number
  due_on: ISODate
  done_at: string | null
}

export interface Todo {
  id: string
  title: string
  due_on: ISODate
  done_at: string | null
  position: number
  created_at: string
}

export interface Settings {
  long_term_review: boolean
}

export interface Snapshot {
  items: LearningItem[]
  revisions: Revision[]
  todos: Todo[]
  settings: Settings
}
