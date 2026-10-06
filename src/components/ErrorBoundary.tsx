import { Component, type ReactNode } from 'react'
import { STORAGE_KEY } from '../lib/storage'

interface State {
  error: Error | null
}

/** Shows what went wrong (and a way to save your data) instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return <CrashScreen message={error.message} />
  }
}

export function CrashScreen({ message }: { message: string }) {
  const saveRaw = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) ?? '{}'
      const a = document.createElement('a')
      a.href = URL.createObjectURL(new Blob([raw], { type: 'application/json' }))
      a.download = 'study-planner-rescue.json'
      a.click()
    } catch {
      alert('Could not read the saved data.')
    }
  }
  return (
    <div style={{ maxWidth: 480, margin: '40px auto', padding: 16, fontFamily: 'Bahnschrift, Segoe UI, system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700 }}>Study Planner hit a problem</h1>
      <p style={{ marginTop: 8 }}>Your data is still saved in this browser. Try reloading. If this keeps happening, send this message to whoever maintains the site:</p>
      <pre style={{ whiteSpace: 'pre-wrap', background: '#f1f5f9', color: '#0f172a', padding: 12, borderRadius: 8, marginTop: 8, fontSize: 12 }}>
        {message}
        {'\n'}
        {navigator.userAgent}
      </pre>
      <p style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={() => location.reload()} style={{ padding: '8px 12px', borderRadius: 8, background: '#4f46e5', color: '#fff' }}>
          Reload
        </button>
        <button onClick={saveRaw} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #94a3b8' }}>
          Download my data
        </button>
      </p>
    </div>
  )
}
