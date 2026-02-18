'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { AlertTriangle, AlertCircle, XCircle, X, ChevronRight, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { acknowledgeAlertAction } from '@/app/(dashboard)/actions'
import type { AlertWithEmployee, AlertType } from '@/types/database-helpers'

interface AlertBannerProps {
  alerts: AlertWithEmployee[]
}

/** Severity order for determining banner color (highest severity first) */
const SEVERITY_ORDER: AlertType[] = ['breach', 'urgent', 'warning']

const alertConfig: Record<AlertType, {
  icon: typeof AlertTriangle
  headerBg: string
  headerText: string
  borderColor: string
  itemTextColor: string
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline'
  label: string
}> = {
  warning: {
    icon: AlertTriangle,
    headerBg: 'bg-amber-500 dark:bg-amber-700',
    headerText: 'text-white',
    borderColor: 'border-amber-500 dark:border-amber-700',
    itemTextColor: 'text-amber-700 dark:text-amber-200',
    badgeVariant: 'outline',
    label: 'Warning',
  },
  urgent: {
    icon: AlertCircle,
    headerBg: 'bg-orange-600 dark:bg-orange-700',
    headerText: 'text-white',
    borderColor: 'border-orange-600 dark:border-orange-700',
    itemTextColor: 'text-orange-700 dark:text-orange-200',
    badgeVariant: 'secondary',
    label: 'Urgent',
  },
  breach: {
    icon: XCircle,
    headerBg: 'bg-rose-600 dark:bg-rose-800',
    headerText: 'text-white',
    borderColor: 'border-rose-600 dark:border-rose-800',
    itemTextColor: 'text-rose-700 dark:text-rose-200',
    badgeVariant: 'destructive',
    label: 'Breach',
  },
}

function AlertItem({
  alert,
  onAcknowledge,
}: {
  alert: AlertWithEmployee
  onAcknowledge: (id: string) => void
}) {
  const config = alertConfig[alert.alert_type as AlertType]
  const Icon = config.icon

  return (
    <div
      className="flex items-center justify-between gap-4 px-4 py-3 border-b border-slate-100 last:border-b-0"
    >
      <div className="flex items-center gap-3 min-w-0">
        <Icon className={cn('h-5 w-5 shrink-0', config.itemTextColor)} />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant={config.badgeVariant} className="text-xs">
              {config.label}
            </Badge>
            <span className={cn('font-medium truncate', config.itemTextColor)}>
              {alert.employee?.name ?? 'Unknown Employee'}
            </span>
          </div>
          <p className="text-sm text-slate-600 truncate">
            {alert.message}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link href={`/employee/${alert.employee_id}`}>
          <Button variant="ghost" size="sm" className="h-8 text-slate-700 hover:text-slate-900">
            View
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onAcknowledge(alert.id)}
          title="Mark as read"
          className="text-slate-500 hover:text-slate-700"
        >
          <Eye className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export function AlertBanner({ alerts }: AlertBannerProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [localAlerts, setLocalAlerts] = useState(alerts)
  const [isLoading, setIsLoading] = useState(false)

  // Find the most severe alert type to determine banner color
  const highestSeverity = useMemo(() => localAlerts.reduce((highest, alert) => {
    const currentIndex = SEVERITY_ORDER.indexOf(alert.alert_type as AlertType)
    const highestIndex = SEVERITY_ORDER.indexOf(highest)
    return currentIndex < highestIndex ? (alert.alert_type as AlertType) : highest
  }, 'warning' as AlertType), [localAlerts])

  if (localAlerts.length === 0) {
    return null
  }

  const config = alertConfig[highestSeverity]
  const Icon = config.icon

  const handleAcknowledge = async (alertId: string) => {
    setIsLoading(true)
    try {
      await acknowledgeAlertAction(alertId)
      setLocalAlerts(prev => prev.filter(a => a.id !== alertId))
    } catch (error) {
      console.error('Failed to acknowledge alert:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAcknowledgeAll = async () => {
    setIsLoading(true)
    try {
      await Promise.all(localAlerts.map(alert => acknowledgeAlertAction(alert.id)))
      setLocalAlerts([])
    } catch (error) {
      console.error('Failed to acknowledge alerts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Collapsed view - just show count
  if (!isExpanded) {
    return (
      <div
        className={cn(
          'rounded-lg cursor-pointer transition-colors shadow-md overflow-hidden',
          config.headerBg
        )}
        onClick={() => setIsExpanded(true)}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Icon className={cn('h-5 w-5', config.headerText)} />
            <span className={cn('font-medium', config.headerText)}>
              {localAlerts.length} active alert{localAlerts.length !== 1 ? 's' : ''} require attention
            </span>
          </div>
          <Button variant="ghost" size="sm" className={cn(config.headerText, 'hover:bg-white/20')}>
            Show
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  // Expanded view - show all alerts
  return (
    <div className="rounded-lg overflow-hidden shadow-md">
      {/* Header — vivid colored background with white text */}
      <div className={cn('flex items-center justify-between px-4 py-3', config.headerBg)}>
        <div className="flex items-center gap-3">
          <Icon className={cn('h-5 w-5', config.headerText)} />
          <span className={cn('font-semibold', config.headerText)}>
            {localAlerts.length} Active Alert{localAlerts.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAcknowledgeAll}
            disabled={isLoading}
            className={cn(config.headerText, 'hover:bg-white/20')}
          >
            <Eye className="h-4 w-4 mr-1" />
            Dismiss All
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setIsExpanded(false)}
            className={cn(config.headerText, 'hover:bg-white/20')}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Alert list — white background for clear readability */}
      <div className="bg-white max-h-64 overflow-y-auto border border-t-0 border-slate-200 rounded-b-lg">
        {localAlerts.map(alert => (
          <AlertItem
            key={alert.id}
            alert={alert}
            onAcknowledge={handleAcknowledge}
          />
        ))}
      </div>
    </div>
  )
}
