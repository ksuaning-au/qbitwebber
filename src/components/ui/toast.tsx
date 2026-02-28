import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface Toast {
  id: string
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

interface ToastContextType {
  toasts: Toast[]
  toast: (props: Omit<Toast, "id">) => void
  dismiss: (id?: string) => void
}

const ToastContext = React.createContext<ToastContextType | null>(null)

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within ToastProvider")
  }
  return context
}

let toastId = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const toast = React.useCallback((props: Omit<Toast, "id">) => {
    const id = String(++toastId)
    setToasts((prev) => [...prev, { ...props, id }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  const dismiss = React.useCallback((id?: string) => {
    if (id) {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    } else {
      setToasts([])
    }
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <div className="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto relative w-full rounded-md border p-4 shadow-lg transition-all",
              t.variant === "destructive"
                ? "border-destructive bg-destructive text-destructive-foreground"
                : "border bg-background text-foreground"
            )}
          >
            <div className="flex items-start gap-2">
              <div className="flex-1">
                {t.title && <p className="font-semibold">{t.title}</p>}
                {t.description && <p className="text-sm opacity-90">{t.description}</p>}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="absolute right-2 top-2 rounded-sm opacity-70 hover:opacity-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
