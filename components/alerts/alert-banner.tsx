'use client'

import { useState } from 'react'
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

const alertConfig: Record<AlertType, {
  icon: typeof AlertTriangle
  bgColor: string
  borderColor: string
  textColor: string
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline'
  label: string
}> = {
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-200 dark:border-amber-800',
    textColor: 'text-amber-800 dark:text-amber-200',
    badgeVariant: 'outline',
    label: 'Warning',
  },
  urgent: {
    icon: AlertCircle,
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    borderColor: 'border-orange-200 dark:border-orange-800',
    textColor: 'text-orange-800 dark:text-orange-200',
    badgeVariant: 'secondary',
    label: 'Urgent',
  },
  breach: {
    icon: XCircle,
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-200 dark:border-red-800',
    textColor: 'text-red-800 dark:text-red-200',
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
      className={cn(
        'flex items-center justify-between gap-4 px-4 py-3 border-b last:border-b-0',
        config.borderColor
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <Icon className={cn('h-5 w-5 shrink-0', config.textColor)} />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant={config.badgeVariant} className="text-xs">
              {config.label}
            </Badge>
            <span className={cn('font-medium truncate', config.textColor)}>
              {alert.employee?.name ?? 'Unknown Employee'}
            </span>
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {alert.message}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link href={`/employee/${alert.employee_id}`}>
          <Button variant="ghost" size="sm" className="h-8">
            View
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onAcknowledge(alert.id)}
          title="Mark as read"
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

  if (localAlerts.length === 0) {
    return null
  }

  // Find the most severe alert type to determine banner color
  const highestSeverity = localAlerts.reduce((highest, alert) => {
    const severityOrder: AlertType[] = ['breach', 'urgent', 'warning']
    const currentIndex = severityOrder.indexOf(alert.alert_type as AlertType)
    const highestIndex = severityOrder.indexOf(highest)
    return currentIndex < highestIndex ? (alert.alert_type as AlertType) : highest
  }, 'warning' as AlertType)

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
          'border rounded-lg cursor-pointer transition-colors',
          config.bgColor,
          config.borderColor
        )}
        onClick={() => setIsExpanded(true)}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Icon className={cn('h-5 w-5', config.textColor)} />
            <span className={cn('font-medium', config.textColor)}>
              {localAlerts.length} active alert{localAlerts.length !== 1 ? 's' : ''} require attention
            </span>
          </div>
          <Button variant="ghost" size="sm" className={config.textColor}>
            Show
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  // Expanded view - show all alerts
  return (
    <div
      className={cn(
        'border rounded-lg overflow-hidden',
        config.bgColor,
        config.borderColor
      )}
    >
      {/* Header */}
      <div className={cn('flex items-center justify-between px-4 py-3 border-b', config.borderColor)}>
        <div className="flex items-center gap-3">
          <Icon className={cn('h-5 w-5', config.textColor)} />
          <span className={cn('font-medium', config.textColor)}>
            {localAlerts.length} Active Alert{localAlerts.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAcknowledgeAll}
            disabled={isLoading}
            className={config.textColor}
          >
            <Eye className="h-4 w-4 mr-1" />
            Dismiss All
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setIsExpanded(false)}
            className={config.textColor}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Alert list */}
      <div className="bg-background/50 max-h-64 overflow-y-auto">
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
