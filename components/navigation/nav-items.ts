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

export type NavSection = 'Main' | 'Data' | 'Tools' | 'System'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  section: NavSection
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
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'Main' },
  { href: '/calendar', label: 'Calendar', icon: Calendar, section: 'Main' },

  // Data
  { href: '/import', label: 'Import', icon: Upload, section: 'Data' },
  { href: '/exports', label: 'Exports', icon: Download, section: 'Data' },

  // Tools
  { href: '/future-job-alerts', label: 'Future Alerts', icon: Bell, section: 'Tools' },
  { href: '/trip-forecast', label: 'Trip Forecast', icon: TrendingUp, section: 'Tools' },

  // System
  { href: '/settings', label: 'Settings', icon: Settings, section: 'System' },
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
    title: 'Tools',
    items: navItems.filter((item) => item.section === 'Tools'),
  },
  {
    title: 'System',
    items: navItems.filter((item) => item.section === 'System'),
  },
]
