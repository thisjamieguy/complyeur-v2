'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { SidebarProvider, useSidebar } from '@/contexts/sidebar-context'
import { Sidebar } from './sidebar'
import { MobileNav } from '@/components/navigation/mobile-nav'
import { KeyboardShortcuts } from '@/components/navigation/keyboard-shortcuts'
import { ShortcutHelpDialog } from '@/components/navigation/shortcut-help-dialog'
import { Footer } from './footer'
import type { UserMenuUser } from './user-menu'
import { cn } from '@/lib/utils'

interface AppShellProps {
  children: ReactNode
  user: UserMenuUser
}

function AppShellContent({ children, user }: AppShellProps) {
  const { isOpen } = useSidebar()

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar - fixed position */}
      <div className="hidden lg:block fixed inset-y-0 left-0 z-40">
        <Sidebar user={user} />
      </div>

      {/* Mobile Header - visible below 1024px */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 flex h-16 items-center gap-3 border-b border-brand-100 bg-white px-4">
        <MobileNav />
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
          'flex-1 flex flex-col min-h-screen w-full transition-[margin-left] duration-200 ease-out',
          // Mobile: no margin-left, add top padding for fixed mobile header
          'pt-16 lg:pt-0',
          // Desktop: margin-left matches sidebar width (256px expanded, 72px collapsed)
          isOpen ? 'lg:ml-64' : 'lg:ml-[72px]'
        )}
      >
        {/* Content container with max-width and responsive padding */}
        <div className="flex-1 w-full max-w-[1280px] mx-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          {children}
        </div>

        <Footer />
      </main>
    </div>
  )
}

export function AppShell({ children, user }: AppShellProps) {
  return (
    <SidebarProvider>
      <KeyboardShortcuts />
      <ShortcutHelpDialog />
      <AppShellContent user={user}>{children}</AppShellContent>
    </SidebarProvider>
  )
}
