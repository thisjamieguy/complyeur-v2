'use client'

import { ReactNode, ComponentProps } from 'react'
import { LucideIcon, FileQuestion } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ButtonVariant = ComponentProps<typeof Button>['variant']

interface EmptyStateProps {
  /** Icon to display (Lucide icon component) */
  icon?: LucideIcon
  /** Title text */
  title: string
  /** Description text */
  description?: string
  /** Primary action button */
  action?: {
    label: string
    onClick: () => void
    variant?: ButtonVariant
    icon?: LucideIcon
  }
  /** Secondary action */
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  /** Additional content */
  children?: ReactNode
  /** Additional class names */
  className?: string
}

/**
 * Empty state component for zero-data states
 *
 * Displays a friendly message when there's no data to show,
 * with optional icon, description, and action button.
 *
 * @example
 * <EmptyState
 *   icon={Users}
 *   title="No employees yet"
 *   description="Add your first employee to start tracking compliance."
 *   action={{
 *     label: "Add Employee",
 *     onClick: () => setShowAddDialog(true),
 *     icon: Plus,
 *   }}
 * />
 */
export function EmptyState({
  icon: Icon = FileQuestion,
  title,
  description,
  action,
  secondaryAction,
  children,
  className,
}: EmptyStateProps) {
  const ActionIcon = action?.icon

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      <div className="p-4 bg-muted rounded-full">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>

      <h3 className="mt-4 text-lg font-semibold text-foreground">
        {title}
      </h3>

      {description && (
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">
          {description}
        </p>
      )}

      {(action || secondaryAction || children) && (
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          {action && (
            <Button
              onClick={action.onClick}
              variant={action.variant || 'default'}
              size="sm"
            >
              {ActionIcon && <ActionIcon className="h-4 w-4 mr-2" />}
              {action.label}
            </Button>
          )}

          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant="outline"
              size="sm"
            >
              {secondaryAction.label}
            </Button>
          )}

          {children}
        </div>
      )}
    </div>
  )
}

/**
 * Compact empty state for smaller spaces (tables, cards)
 */
interface CompactEmptyStateProps {
  icon?: LucideIcon
  message: string
  className?: string
}

export function CompactEmptyState({
  icon: Icon = FileQuestion,
  message,
  className,
}: CompactEmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-8 text-center',
        className
      )}
    >
      <Icon className="h-6 w-6 text-muted-foreground mb-2" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

/**
 * Empty state for search results
 */
interface SearchEmptyStateProps {
  query: string
  onClearSearch?: () => void
  className?: string
}

export function SearchEmptyState({
  query,
  onClearSearch,
  className,
}: SearchEmptyStateProps) {
  return (
    <EmptyState
      title="No results found"
      description={`No items match "${query}". Try a different search term.`}
      action={
        onClearSearch
          ? {
              label: 'Clear search',
              onClick: onClearSearch,
              variant: 'outline',
            }
          : undefined
      }
      className={className}
    />
  )
}

/**
 * Empty state for filtered results
 */
interface FilterEmptyStateProps {
  onClearFilters?: () => void
  className?: string
}

export function FilterEmptyState({
  onClearFilters,
  className,
}: FilterEmptyStateProps) {
  return (
    <EmptyState
      title="No matching items"
      description="No items match your current filters. Try adjusting your filter criteria."
      action={
        onClearFilters
          ? {
              label: 'Clear filters',
              onClick: onClearFilters,
              variant: 'outline',
            }
          : undefined
      }
      className={className}
    />
  )
}
