'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { SidebarProvider, useSidebar } from '@/contexts/sidebar-context'
import { Sidebar } from './sidebar'
import { MobileNav } from '@/components/navigation/mobile-nav'
import { KeyboardShortcuts } from '@/components/navigation/keyboard-shortcuts'
import { ShortcutHelpDialog } from '@/components/navigation/shortcut-help-dialog'
import { MfaBackupCodesWarning } from '@/components/mfa/mfa-backup-codes-warning'
import { DashboardFooter } from './dashboard-footer'
import type { UserMenuUser } from './user-menu'
import { cn } from '@/lib/utils'

interface AppShellProps {
  children: ReactNode
  user: UserMenuUser
}

function AppShellContent({ children, user }: AppShellProps) {
  const { isOpen } = useSidebar()
  const pathname = usePathname()
  const usesWideWorkspace = pathname === '/calendar' || pathname === '/calendar-v2'

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop Sidebar - fixed position */}
      <div className="hidden lg:block fixed inset-y-0 left-0 z-40">
        <Sidebar user={user} />
      </div>

      {/* Mobile Header - visible below 1024px */}
      <header className="fixed left-0 right-0 top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:hidden">
        <MobileNav user={user} />
        <Link href="/dashboard" className="flex items-center gap-3">
          <Image
            src="/images/Icons/01_Logo_Horizontal/ComplyEur_Logo_Horizontal.svg"
            alt="ComplyEur"
            width={140}
            height={38}
            className="h-7 w-auto"
            priority
          />
        </Link>
      </header>

      {/* Main content area - adjusts margin based on sidebar state */}
      <main
        className={cn(
          'flex min-h-screen w-full min-w-0 flex-1 flex-col transition-[padding-left] duration-200 ease-out',
          // Mobile: no margin-left, add top padding for fixed mobile header
          'pt-16 lg:pt-0',
          // Desktop: reserve space for the fixed sidebar without widening the page.
          isOpen ? 'lg:pl-64' : 'lg:pl-[72px]'
        )}
      >
        {/* Content container with max-width and responsive padding */}
        <div
          className={cn(
            'mx-auto w-full min-w-0 flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8',
            usesWideWorkspace ? 'max-w-[1680px]' : 'max-w-[1280px]'
          )}
        >
          {children}
        </div>

        <DashboardFooter />
      </main>
    </div>
  )
}

export function AppShell({ children, user }: AppShellProps) {
  return (
    <SidebarProvider>
      <KeyboardShortcuts />
      <ShortcutHelpDialog />
      <MfaBackupCodesWarning />
      <AppShellContent user={user}>{children}</AppShellContent>
    </SidebarProvider>
  )
}
