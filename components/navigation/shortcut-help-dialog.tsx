'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName.toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select'
}

export function ShortcutHelpDialog() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return

      if (event.shiftKey && event.key === '?') {
        event.preventDefault()
        setOpen(true)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Use these shortcuts to move quickly through core workflows.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <ShortcutRow keys="/" description="Focus employee search" />
          <ShortcutRow keys="Alt + D" description="Go to dashboard" />
          <ShortcutRow keys="Alt + I" description="Go to import" />
          <ShortcutRow keys="Alt + F" description="Go to trip forecast" />
          <ShortcutRow keys="N" description="Open add employee (dashboard pages)" />
          <ShortcutRow keys="T" description="Open add trip (employee detail page)" />
          <ShortcutRow keys="Shift + ?" description="Open this help panel" />
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ShortcutRow({ keys, description }: { keys: string; description: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
      <kbd className="rounded border border-slate-300 bg-slate-50 px-2 py-1 font-mono text-xs text-slate-700">
        {keys}
      </kbd>
      <span className="text-slate-600">{description}</span>
    </div>
  )
}
