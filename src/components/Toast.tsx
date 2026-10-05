import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

interface ToastData {
  id: number
  message: string
  undo?: () => void
  error?: boolean
}

type ShowToast = (message: string, opts?: { undo?: () => void; error?: boolean }) => void

const ToastContext = createContext<ShowToast>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastData | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const show = useCallback<ShowToast>((message, opts) => {
    clearTimeout(timer.current)
    const id = Date.now()
    setToast({ id, message, ...opts })
    timer.current = setTimeout(() => setToast((t) => (t?.id === id ? null : t)), opts?.error ? 7000 : 5000)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-20 left-1/2 z-50 sm:bottom-4 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-xl px-4 py-3 text-sm shadow-lg ${
            toast.error ? 'bg-red-600 text-white' : 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
          }`}
        >
          <span className="flex-1">{toast.message}</span>
          {toast.undo && (
            <button
              className="font-semibold text-indigo-300 hover:underline dark:text-indigo-700"
              onClick={() => {
                toast.undo!()
                setToast(null)
              }}
            >
              Undo
            </button>
          )}
          <button aria-label="Dismiss" className="opacity-60 hover:opacity-100" onClick={() => setToast(null)}>
            ✕
          </button>
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast(): ShowToast {
  return useContext(ToastContext)
}
