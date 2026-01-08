'use client'

import { AlertTriangle, AlertCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AlertType } from '@/types/database'

interface AlertIndicatorProps {
  alertType: AlertType
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

const config: Record<AlertType, {
  icon: typeof AlertTriangle
  color: string
  bgColor: string
  label: string
}> = {
  warning: {
    icon: AlertTriangle,
    color: 'text-amber-600 dark:text-amber-500',
    bgColor: 'bg-amber-100 dark:bg-amber-900/50',
    label: 'Warning',
  },
  urgent: {
    icon: AlertCircle,
    color: 'text-orange-600 dark:text-orange-500',
    bgColor: 'bg-orange-100 dark:bg-orange-900/50',
    label: 'Urgent',
  },
  breach: {
    icon: XCircle,
    color: 'text-red-600 dark:text-red-500',
    bgColor: 'bg-red-100 dark:bg-red-900/50',
    label: 'Breach',
  },
}

const sizeConfig = {
  sm: { icon: 'h-3 w-3', container: 'h-5 w-5', text: 'text-xs' },
  md: { icon: 'h-4 w-4', container: 'h-6 w-6', text: 'text-sm' },
  lg: { icon: 'h-5 w-5', container: 'h-8 w-8', text: 'text-base' },
}

export function AlertIndicator({
  alertType,
  size = 'md',
  showLabel = false,
  className,
}: AlertIndicatorProps) {
  const alertConfig = config[alertType]
  const sizeStyles = sizeConfig[size]
  const Icon = alertConfig.icon

  if (showLabel) {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full',
          alertConfig.bgColor,
          alertConfig.color,
          sizeStyles.text,
          className
        )}
      >
        <Icon className={sizeStyles.icon} />
        <span className="font-medium">{alertConfig.label}</span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full',
        alertConfig.bgColor,
        alertConfig.color,
        sizeStyles.container,
        className
      )}
      title={alertConfig.label}
    >
      <Icon className={sizeStyles.icon} />
    </div>
  )
}
