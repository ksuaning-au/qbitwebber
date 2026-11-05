import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface ConfirmActionProps {
  label: string
  title: string
  message: string
  confirmLabel: string
  disabled?: boolean
  onConfirm: () => void
  // Text for a small outlined button. Without it, `children` is shown as an icon button.
  buttonLabel?: string
  // For a text button that switches something on, so it reads as an off toggle.
  pressed?: boolean
  children?: ReactNode
}

// An icon button that asks in a pop-up before acting, like the delete prompt.
export function ConfirmAction({ label, title, message, confirmLabel, disabled, onConfirm, buttonLabel, pressed, children }: ConfirmActionProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {buttonLabel ? (
        <Button type="button" size="sm" variant="outline" title={label} aria-pressed={pressed} disabled={disabled} onClick={() => setOpen(true)}>
          {buttonLabel}
        </Button>
      ) : (
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" aria-label={label} title={label} disabled={disabled} onClick={() => setOpen(true)}>
          {children}
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{message}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={() => { setOpen(false); onConfirm() }}>{confirmLabel}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
