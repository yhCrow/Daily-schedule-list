import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ToastProvider } from './components/Toast'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { DataProvider } from './hooks/useData'
import { isConfigured } from './lib/backend'
import { CalendarPage } from './pages/Calendar'
import { LearnPage } from './pages/Learn'
import { LoginPage } from './pages/Login'
import { SettingsPage } from './pages/Settings'
import { StatsPage } from './pages/Stats'
import { TodayPage } from './pages/Today'

export default function App() {
  if (!isConfigured) return <NotConfigured />
  return (
    <ToastProvider>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </ToastProvider>
  )
}

/** Logged-out visitors only ever see the login page; non-owner accounts see nothing. */
function Gate() {
  const { loading, session, owner, signOut } = useAuth()

  if (loading || (session && owner === 'unknown')) {
    return <p className="p-8 text-center text-slate-400">Loading…</p>
  }
  if (owner !== 'owner') {
    if (!session) return <LoginPage />
    return (
      <div className="flex min-h-dvh items-center justify-center p-4">
        <div className="card max-w-sm space-y-3 text-center">
          <h1 className="text-lg font-semibold">No access</h1>
          <p className="text-sm text-slate-500">This account is not the owner of this planner.</p>
          <button className="btn-primary" onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>
    )
  }

  return (
    <DataProvider>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<TodayPage />} />
            <Route path="/learn" element={<LearnPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </HashRouter>
    </DataProvider>
  )
}

function NotConfigured() {
  return (
    <div className="mx-auto max-w-lg space-y-3 p-8">
      <h1 className="text-xl font-bold">Study Planner isn't connected yet</h1>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> (see <code>.env.example</code> and the README), or run{' '}
        <code>npm run dev:demo</code> to try it with data stored in your browser.
      </p>
    </div>
  )
}
