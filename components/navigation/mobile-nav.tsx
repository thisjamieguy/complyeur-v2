'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Menu, LayoutDashboard, Calendar, Bell, TrendingUp, Settings, Shield } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/future-job-alerts', label: 'Future Alerts', icon: Bell },
  { href: '/trip-forecast', label: 'Trip Forecast', icon: TrendingUp },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/gdpr', label: 'GDPR', icon: Shield },
]

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close on route change
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
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
          <SheetTitle className="text-left text-lg font-semibold text-slate-900">
            ComplyEUR
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
        </nav>
      </SheetContent>
    </Sheet>
  )
}
