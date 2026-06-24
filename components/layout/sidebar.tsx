'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { MessageSquarePlus, PanelLeftClose, PanelLeft, Shield } from 'lucide-react'
import { getNavSections } from '@/components/navigation/nav-items'
import { FeedbackDialog } from '@/components/feedback/feedback-dialog'
import { useSidebar } from '@/contexts/sidebar-context'
import { UserMenu, type UserMenuUser } from './user-menu'
import { cn } from '@/lib/utils'

interface SidebarProps {
  user: UserMenuUser
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const { isOpen, toggle } = useSidebar()
  const canAccessItem = (href: string): boolean => {
    if (href === '/calendar') return user.canAccessCalendar === true
    if (href === '/trip-forecast') return user.canAccessForecast === true
    if (href === '/jobs') return user.canAccessSavedJobs === true
    if (href === '/admin') return user.canAccessAdminPanel === true
    return true
  }

  const sections = getNavSections({
    savedJobsEnabled: user.canAccessSavedJobs === true,
  }).map((section) => {
    const baseItems = section.items.filter((item) => canAccessItem(item.href))
    if (section.title !== 'System' || !user.canAccessAdminPanel) {
      return {
        ...section,
        items: baseItems,
      }
    }

    return {
      ...section,
      items: [
        ...baseItems,
        {
          href: '/admin',
          label: 'Admin',
          icon: Shield,
          section: 'System' as const,
        },
      ],
    }
  })
  const visibleSections = sections.filter((section) => section.items.length > 0)

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col h-screen border-r border-brand-800/70 bg-brand-950 transition-[width] duration-200 ease-out shadow-sm',
        isOpen ? 'w-64' : 'w-[72px]'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-white/10 px-4">
        <Link
          href="/dashboard"
          className={cn(
            'flex items-center gap-3 min-h-[44px]',
            !isOpen && 'justify-center w-full'
          )}
        >
          <Image
            src="/images/Icons/03_Icon_Only/ComplyEur_Icon.svg"
            alt="ComplyEur"
            width={32}
            height={32}
            className="shrink-0 brightness-0 invert"
          />
          {isOpen && (
            <Image
              src="/images/Icons/04_Wordmark_Only/ComplyEur_Wordmark.svg"
              alt="ComplyEur"
              width={120}
              height={24}
              className="h-6 w-auto brightness-0 invert"
            />
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {visibleSections.map((section) => (
          <div key={section.title} className="mb-6">
            {isOpen && (
              <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-brand-200/80">
                {section.title}
              </h3>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon
                const isActive =
                  pathname === item.href || pathname.startsWith(item.href + '/')

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      data-tour-id={item.tourId}
                      className={cn(
                        'flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-150',
                        isActive
                          ? 'bg-white text-brand-900 shadow-sm'
                          : 'text-brand-100/80 hover:bg-white/10 hover:text-white',
                        !isOpen && 'justify-center px-0'
                      )}
                      title={!isOpen ? item.label : undefined}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      {isOpen && (
                        <span className="text-sm font-medium truncate">
                          {item.label}
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Feedback (Beta) */}
      <div className="border-t border-white/10 px-3 py-2">
        <FeedbackDialog
          trigger={
            <button
              className={cn(
                'flex min-h-[44px] w-full items-center gap-3 rounded-xl',
                'text-brand-100/80 transition-colors duration-150 hover:bg-white/10 hover:text-white',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
                isOpen ? 'px-3 py-2.5' : 'justify-center px-0 py-2.5'
              )}
              aria-label="Open feedback form (beta)"
              title={!isOpen ? 'Feedback (Beta)' : undefined}
            >
              <MessageSquarePlus className="h-5 w-5 shrink-0" />
              {isOpen && (
                <>
                  <span className="text-sm font-medium truncate">Feedback</span>
                  <span className="ml-auto rounded-full border border-white/20 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-brand-100/70">
                    Beta
                  </span>
                </>
              )}
            </button>
          }
        />
      </div>

      {/* Toggle Button */}
      <div className="border-t border-white/10 px-3 py-2">
        <button
          onClick={toggle}
          className={cn(
            'flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 py-2.5',
            'text-brand-100/70 transition-colors duration-150 hover:bg-white/10 hover:text-white',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
            !isOpen && 'justify-center px-0'
          )}
          aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {isOpen ? (
            <>
              <PanelLeftClose className="h-5 w-5 shrink-0" />
              <span className="text-sm font-medium">Collapse</span>
            </>
          ) : (
            <PanelLeft className="h-5 w-5 shrink-0" />
          )}
        </button>
      </div>

      {/* User Menu */}
      <div className="border-t border-white/10 px-3 py-3">
        <UserMenu user={user} collapsed={!isOpen} />
      </div>
    </aside>
  )
}
