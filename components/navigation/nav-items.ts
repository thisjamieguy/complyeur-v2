import {
  LayoutDashboard,
  Calendar,
  Upload,
  Download,
  Bell,
  TrendingUp,
  Settings,
  type LucideIcon,
} from 'lucide-react'

export type NavSection = 'Main' | 'Data' | 'Planning' | 'System'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  section: NavSection
  tourId?: string
}

export interface NavSectionGroup {
  title: NavSection
  items: NavItem[]
}

/**
 * Flat array of all navigation items.
 * Used when you need to iterate over all items without section grouping.
 */
export const navItems: NavItem[] = [
  // Main
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    section: 'Main',
    tourId: 'tour-nav-dashboard',
  },
  {
    href: '/calendar',
    label: 'Calendar',
    icon: Calendar,
    section: 'Main',
    tourId: 'tour-nav-calendar',
  },

  // Data
  {
    href: '/import',
    label: 'Import',
    icon: Upload,
    section: 'Data',
    tourId: 'tour-nav-import',
  },
  {
    href: '/exports',
    label: 'Exports',
    icon: Download,
    section: 'Data',
    tourId: 'tour-nav-exports',
  },

  // Planning
  {
    href: '/future-job-alerts',
    label: 'Future Alerts',
    icon: Bell,
    section: 'Planning',
    tourId: 'tour-nav-alerts',
  },
  {
    href: '/trip-forecast',
    label: 'Trip Forecast',
    icon: TrendingUp,
    section: 'Planning',
    tourId: 'tour-nav-forecast',
  },

  // System
  {
    href: '/settings',
    label: 'Settings',
    icon: Settings,
    section: 'System',
    tourId: 'tour-nav-settings',
  },
]

/**
 * Navigation items grouped by section.
 * Used for rendering sidebar with section headers.
 */
export const navSections: NavSectionGroup[] = [
  {
    title: 'Main',
    items: navItems.filter((item) => item.section === 'Main'),
  },
  {
    title: 'Data',
    items: navItems.filter((item) => item.section === 'Data'),
  },
  {
    title: 'Planning',
    items: navItems.filter((item) => item.section === 'Planning'),
  },
  {
    title: 'System',
    items: navItems.filter((item) => item.section === 'System'),
  },
]
