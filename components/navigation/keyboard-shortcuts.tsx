'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName.toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select'
}

export function KeyboardShortcuts() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return

      if (event.key === '/') {
        event.preventDefault()
        if (!pathname.startsWith('/dashboard')) {
          router.push('/dashboard?focusSearch=1')
          return
        }
        window.dispatchEvent(new Event('complyeur:focus-dashboard-search'))
      }

      if (event.altKey && event.key.toLowerCase() === 'd') {
        event.preventDefault()
        router.push('/dashboard')
      }

      if (event.altKey && event.key.toLowerCase() === 'i') {
        event.preventDefault()
        router.push('/import')
      }

      if (event.altKey && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        router.push('/trip-forecast')
      }

      if (!event.altKey && !event.metaKey && !event.ctrlKey && event.key.toLowerCase() === 'n') {
        if (pathname.startsWith('/dashboard')) {
          event.preventDefault()
          window.dispatchEvent(new Event('complyeur:open-add-employee'))
        }
      }

      if (!event.altKey && !event.metaKey && !event.ctrlKey && event.key.toLowerCase() === 't') {
        if (pathname.includes('/employee/')) {
          event.preventDefault()
          window.dispatchEvent(new Event('complyeur:open-add-trip'))
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [pathname, router])

  return null
}
