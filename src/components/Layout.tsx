import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useData } from '../hooks/useData'
import { isDemo } from '../lib/backend'
import { ItemForm } from './ItemForm'

const links = [
  { to: '/', label: 'Today', icon: '☀' },
  { to: '/learn', label: 'Learn', icon: '📚' },
  { to: '/calendar', label: 'Calendar', icon: '📅' },
  { to: '/stats', label: 'Stats', icon: '📈' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
]

export const TODAY_TODO_INPUT = 'add-todo-today'
export const OPEN_ITEM_FORM = 'open-item-form'

function useTheme() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])
  const toggle = () => {
    setDark((d) => {
      try {
        localStorage.setItem('theme', d ? 'light' : 'dark')
      } catch {
        /* ignore */
      }
      return !d
    })
  }
  return { dark, toggle }
}

export function Layout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth()
  const { offline } = useData()
  const navigate = useNavigate()
  const { dark, toggle } = useTheme()
  const [adding, setAdding] = useState(false)

  // Shortcuts: N = add learning, T = add to-do for today.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      const typing =
        el.closest('textarea, select, [contenteditable]') ||
        (el instanceof HTMLInputElement && !['checkbox', 'radio', 'button', 'submit'].includes(el.type))
      if (e.ctrlKey || e.metaKey || e.altKey || typing || document.querySelector('[role=dialog]')) return
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        setAdding(true)
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault()
        const input = document.getElementById(TODAY_TODO_INPUT)
        if (input) input.focus()
        else {
          navigate('/')
          setTimeout(() => document.getElementById(TODAY_TODO_INPUT)?.focus(), 50)
        }
      }
    }
    const onOpen = () => setAdding(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener(OPEN_ITEM_FORM, onOpen)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener(OPEN_ITEM_FORM, onOpen)
    }
  }, [navigate])

  return (
    <div className="min-h-dvh pb-20 sm:pb-8">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3">
          <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">Study Planner</span>
          <nav className="ml-4 hidden gap-1 sm:flex">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end
                className={({ isActive }) =>
                  `rounded-lg px-3 py-1.5 text-sm ${isActive ? 'bg-indigo-50 font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <button className="btn-primary" onClick={() => setAdding(true)} title="Add what you learned (N)">
              + Learned
            </button>
            <button className="icon-btn text-base" onClick={toggle} aria-label="Toggle dark mode">
              {dark ? '☀' : '☾'}
            </button>
            {!isDemo && (
              <button className="btn-ghost hidden sm:inline-flex" onClick={signOut}>
                Sign out
              </button>
            )}
          </div>
        </div>
      </header>

      {isDemo && (
        <p className="bg-amber-100 px-4 py-1.5 text-center text-xs text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
          Demo mode: data is saved in this browser only. Connect Supabase for the real, login-protected version.
        </p>
      )}
      {offline && (
        <p className="bg-slate-200 px-4 py-1.5 text-center text-xs dark:bg-slate-800">
          Offline: showing your last saved data. Changes need a connection.
        </p>
      )}

      <main className="mx-auto max-w-5xl px-4 py-5">{children}</main>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-white sm:hidden dark:border-slate-800 dark:bg-slate-950">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center py-2 text-[11px] ${isActive ? 'font-semibold text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`
            }
          >
            <span className="text-base leading-none">{l.icon}</span>
            {l.label}
          </NavLink>
        ))}
      </nav>

      {adding && <ItemForm onClose={() => setAdding(false)} />}
    </div>
  )
}
