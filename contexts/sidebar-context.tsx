'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

interface SidebarContextValue {
  /** Desktop sidebar collapsed/expanded state */
  isOpen: boolean
  /** Mobile sidebar open/closed state */
  isMobileOpen: boolean
  /** Toggle desktop sidebar collapsed/expanded */
  toggle: () => void
  /** Toggle mobile sidebar open/closed */
  toggleMobile: () => void
  /** Set mobile sidebar open/closed */
  setMobileOpen: (open: boolean) => void
  /** Close mobile sidebar (for route changes) */
  closeMobile: () => void
}

const SidebarContext = createContext<SidebarContextValue | null>(null)
const SIDEBAR_STORAGE_KEY = 'complyeur.sidebar.open'

interface SidebarProviderProps {
  children: ReactNode
  /** Initial desktop sidebar state. Defaults to true (expanded). */
  defaultOpen?: boolean
}

export function SidebarProvider({ children, defaultOpen = true }: SidebarProviderProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  useEffect(() => {
    try {
      const storedOpen = window.localStorage.getItem(SIDEBAR_STORAGE_KEY)
      if (storedOpen !== null) {
        setIsOpen(storedOpen === 'true')
      }
    } catch {
      // Ignore storage failures; the sidebar still works for the current session.
    }
  }, [])

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev

      try {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next))
      } catch {
        // Ignore storage failures; the in-memory state has already changed.
      }

      return next
    })
  }, [])

  const toggleMobile = useCallback(() => {
    setIsMobileOpen((prev) => !prev)
  }, [])

  const closeMobile = useCallback(() => {
    setIsMobileOpen(false)
  }, [])

  return (
    <SidebarContext.Provider
      value={{
        isOpen,
        isMobileOpen,
        toggle,
        toggleMobile,
        setMobileOpen: setIsMobileOpen,
        closeMobile,
      }}
    >
      {children}
    </SidebarContext.Provider>
  )
}

/**
 * Hook to access sidebar state and controls.
 * Must be used within a SidebarProvider.
 *
 * @throws Error if used outside of SidebarProvider
 */
export function useSidebar(): SidebarContextValue {
  const context = useContext(SidebarContext)

  if (context === null) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }

  return context
}
