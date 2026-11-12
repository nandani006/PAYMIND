import { useToast } from '../../hooks/useToast.js'
import { cn } from '../../utils/cn.js'

export function Toaster() {
  const { toasts } = useToast()

  if (!toasts.length) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg',
            'animate-in slide-in-from-bottom-5 duration-300',
            toast.variant === 'destructive'
              ? 'border-destructive/50 bg-destructive text-destructive-foreground'
              : 'border bg-card text-card-foreground'
          )}
        >
          <div className="flex-1 min-w-0">
            {toast.title && (
              <p className="text-sm font-semibold leading-tight">{toast.title}</p>
            )}
            {toast.description && (
              <p className="text-sm text-muted-foreground mt-0.5 leading-snug">
                {toast.description}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

