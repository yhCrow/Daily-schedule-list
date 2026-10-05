import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ToastProvider } from './components/Toast'
import { DataProvider } from './hooks/useData'
import { CalendarPage } from './pages/Calendar'
import { LearnPage } from './pages/Learn'
import { SettingsPage } from './pages/Settings'
import { StatsPage } from './pages/Stats'
import { TodayPage } from './pages/Today'

export default function App() {
  return (
    <ToastProvider>
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
    </ToastProvider>
  )
}
