import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useState, type FormEvent } from 'react'
import { useData } from '../hooks/useData'
import type { ISODate, Todo } from '../lib/types'

interface Props {
  todos: Todo[]
  dueOn: ISODate
  inputId?: string
  placeholder?: string
  /** Drag-to-reorder handles. */
  sortable?: boolean
}

export function TodoList({ todos, dueOn, inputId, placeholder = 'Add a task…', sortable = true }: Props) {
  const { addTodo, reorderTodos } = useData()
  const [title, setTitle] = useState('')
  const sorted = [...todos].sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at))

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    addTodo(title.trim(), dueOn)
    setTitle('')
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    const from = sorted.findIndex((t) => t.id === active.id)
    const to = sorted.findIndex((t) => t.id === over.id)
    reorderTodos(arrayMove(sorted, from, to))
  }

  return (
    <div>
      <form onSubmit={submit} className="mb-2 flex gap-2">
        <input
          id={inputId}
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
        />
        <button className="btn-primary" type="submit" aria-label="Add task">
          +
        </button>
      </form>
      {sorted.length === 0 ? (
        <p className="py-2 text-sm text-slate-400">Nothing here yet.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={sorted.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {sorted.map((t) => (
                <TodoRow key={t.id} todo={t} sortable={sortable} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}

export function TodoRow({ todo, sortable = false }: { todo: Todo; sortable?: boolean }) {
  const { toggleTodo, updateTodo, deleteTodo } = useData()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(todo.title)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: todo.id,
    disabled: !sortable,
  })

  function save() {
    setEditing(false)
    if (draft.trim() && draft.trim() !== todo.title) updateTodo({ ...todo, title: draft.trim() })
    else setDraft(todo.title)
  }

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group flex items-center gap-2 bg-white py-2 dark:bg-slate-900 ${isDragging ? 'relative z-10 shadow-lg' : ''}`}
    >
      {sortable && (
        <button
          className="cursor-grab touch-none px-0.5 text-slate-300 hover:text-slate-500 dark:text-slate-600"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          ⋮⋮
        </button>
      )}
      <input
        type="checkbox"
        className="check"
        checked={Boolean(todo.done_at)}
        onChange={() => toggleTodo(todo)}
        aria-label={`Mark ${todo.title} as done`}
      />
      {editing ? (
        <input
          className="input py-1"
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save()
            if (e.key === 'Escape') {
              setDraft(todo.title)
              setEditing(false)
            }
          }}
        />
      ) : (
        <span
          className={`flex-1 text-sm break-words ${todo.done_at ? 'text-slate-400 line-through' : ''}`}
          onDoubleClick={() => setEditing(true)}
        >
          {todo.title}
        </span>
      )}
      {!editing && (
        <span className="flex opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          <button className="icon-btn" aria-label="Edit task" onClick={() => setEditing(true)}>
            ✎
          </button>
          <button className="icon-btn hover:text-red-600" aria-label="Delete task" onClick={() => deleteTodo(todo)}>
            🗑
          </button>
        </span>
      )}
    </li>
  )
}
