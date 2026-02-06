'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, MessageSquarePlus } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { FeedbackDialog } from '@/components/feedback/feedback-dialog'
import { navItems } from '@/components/navigation/nav-items'
import { useSidebar } from '@/contexts/sidebar-context'
import { cn } from '@/lib/utils'

export function MobileNav() {
  const pathname = usePathname()
  const { isMobileOpen, toggleMobile, closeMobile } = useSidebar()

  // Close on route change
  useEffect(() => {
    closeMobile()
  }, [pathname, closeMobile])

  return (
    <Sheet open={isMobileOpen} onOpenChange={toggleMobile}>
      <SheetTrigger asChild>
        <button
          className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-slate-100 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6 text-slate-700" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] p-0 pt-14 pb-[env(safe-area-inset-bottom)]">
        <SheetHeader className="px-4 pb-4 border-b border-slate-200">
          <SheetTitle className="flex items-center gap-2">
            <Image
              src="/images/Icons/03_Icon_Only/ComplyEur_Icon.svg"
              alt=""
              width={28}
              height={28}
              aria-hidden="true"
            />
            <Image
              src="/images/Icons/04_Wordmark_Only/ComplyEur_Wordmark.svg"
              alt="ComplyEUR"
              width={100}
              height={20}
              className="h-5 w-auto"
            />
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col p-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors min-h-[44px]',
                  isActive
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            )
          })}

          <div className="mt-3 border-t border-slate-200 px-2 pt-3">
            <FeedbackDialog
              trigger={
                <button
                  className="flex w-full min-h-[44px] items-center gap-3 rounded-lg bg-amber-400 px-4 py-3 text-sm font-semibold text-amber-950 transition-colors hover:bg-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  aria-label="Open feedback form (beta)"
                >
                  <MessageSquarePlus className="h-5 w-5 shrink-0" />
                  <span>Feedback</span>
                  <span className="ml-auto rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                    Beta
                  </span>
                </button>
              }
            />
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  )
}
