/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Plus } from 'lucide-react'
import { DataError, InlineDataError } from '@/components/ui/data-error'
import { EmptyState, SearchEmptyState } from '@/components/ui/empty-state'

describe('shared UI states', () => {
  it('renders an accessible empty state with primary and secondary actions', () => {
    const onPrimary = vi.fn()
    const onSecondary = vi.fn()

    render(
      <EmptyState
        title="No employees yet"
        description="Add your first employee to start tracking travel compliance."
        action={{ label: 'Add employee', onClick: onPrimary, icon: Plus }}
        secondaryAction={{ label: 'Import employees', onClick: onSecondary }}
      />
    )

    const region = screen.getByLabelText('No employees yet')
    expect(region).toHaveAccessibleDescription(
      'Add your first employee to start tracking travel compliance.'
    )
    expect(screen.getByRole('button', { name: 'Add employee' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Import employees' })).toBeInTheDocument()
  })

  it('renders search empty state copy and clear action', () => {
    render(<SearchEmptyState query="Paris" onClearSearch={vi.fn()} />)

    expect(screen.getByText('No results found')).toBeInTheDocument()
    expect(screen.getByText('No items match "Paris". Try a different search term.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear search' })).toBeInTheDocument()
  })

  it('renders an alert with retry and support actions', () => {
    render(
      <DataError
        resource="imports"
        onRetry={vi.fn()}
        isRetrying
        showSupport
        supportEmail="help@example.com"
      />
    )

    const alert = screen.getByRole('alert')
    expect(alert).toHaveAccessibleName('Unable to load imports')
    expect(alert).toHaveAccessibleDescription(
      'There was a problem loading this content. Please try again.'
    )
    expect(screen.getByRole('button', { name: 'Retrying...' })).toBeDisabled()
    expect(screen.getByRole('link', { name: 'Contact Support' })).toHaveAttribute(
      'href',
      'mailto:help@example.com'
    )
  })

  it('keeps inline error retry icon keyboard accessible', () => {
    render(<InlineDataError message="Failed to load jobs" onRetry={vi.fn()} />)

    expect(screen.getByRole('alert')).toHaveTextContent('Failed to load jobs')
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })
})
