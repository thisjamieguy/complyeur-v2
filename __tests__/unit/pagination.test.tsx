/**
 * @fileoverview Unit tests for pagination functionality
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Pagination } from '@/components/ui/pagination'

describe('Pagination Component', () => {
  describe('rendering', () => {
    it('renders nothing when totalPages is 1', () => {
      const { container } = render(
        <Pagination
          currentPage={1}
          totalPages={1}
          onPageChange={vi.fn()}
        />
      )
      expect(container.firstChild).toBeNull()
    })

    it('renders nothing when totalPages is 0', () => {
      const { container } = render(
        <Pagination
          currentPage={1}
          totalPages={0}
          onPageChange={vi.fn()}
        />
      )
      expect(container.firstChild).toBeNull()
    })

    it('renders pagination controls when totalPages > 1', () => {
      render(
        <Pagination
          currentPage={1}
          totalPages={3}
          onPageChange={vi.fn()}
        />
      )
      expect(screen.getByText('Page 1 of 3')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
    })

    it('displays total items when provided', () => {
      render(
        <Pagination
          currentPage={2}
          totalPages={5}
          totalItems={100}
          onPageChange={vi.fn()}
        />
      )
      expect(screen.getByText(/Page 2 of 5/)).toBeInTheDocument()
      expect(screen.getByText(/100 total/)).toBeInTheDocument()
    })
  })

  describe('button states', () => {
    it('disables Previous button on first page', () => {
      render(
        <Pagination
          currentPage={1}
          totalPages={3}
          onPageChange={vi.fn()}
        />
      )
      expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled()
    })

    it('disables Next button on last page', () => {
      render(
        <Pagination
          currentPage={3}
          totalPages={3}
          onPageChange={vi.fn()}
        />
      )
      expect(screen.getByRole('button', { name: /previous/i })).not.toBeDisabled()
      expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
    })

    it('enables both buttons on middle page', () => {
      render(
        <Pagination
          currentPage={2}
          totalPages={3}
          onPageChange={vi.fn()}
        />
      )
      expect(screen.getByRole('button', { name: /previous/i })).not.toBeDisabled()
      expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled()
    })
  })

  describe('navigation', () => {
    it('calls onPageChange with previous page when Previous is clicked', () => {
      const onPageChange = vi.fn()
      render(
        <Pagination
          currentPage={2}
          totalPages={3}
          onPageChange={onPageChange}
        />
      )
      fireEvent.click(screen.getByRole('button', { name: /previous/i }))
      expect(onPageChange).toHaveBeenCalledWith(1)
    })

    it('calls onPageChange with next page when Next is clicked', () => {
      const onPageChange = vi.fn()
      render(
        <Pagination
          currentPage={2}
          totalPages={3}
          onPageChange={onPageChange}
        />
      )
      fireEvent.click(screen.getByRole('button', { name: /next/i }))
      expect(onPageChange).toHaveBeenCalledWith(3)
    })

    it('does not call onPageChange when clicking disabled Previous', () => {
      const onPageChange = vi.fn()
      render(
        <Pagination
          currentPage={1}
          totalPages={3}
          onPageChange={onPageChange}
        />
      )
      fireEvent.click(screen.getByRole('button', { name: /previous/i }))
      expect(onPageChange).not.toHaveBeenCalled()
    })

    it('does not call onPageChange when clicking disabled Next', () => {
      const onPageChange = vi.fn()
      render(
        <Pagination
          currentPage={3}
          totalPages={3}
          onPageChange={onPageChange}
        />
      )
      fireEvent.click(screen.getByRole('button', { name: /next/i }))
      expect(onPageChange).not.toHaveBeenCalled()
    })
  })
})

describe('Pagination Math', () => {
  it('calculates total pages correctly', () => {
    // These are the formulas used in the data layer
    const testCases = [
      { totalCount: 0, pageSize: 25, expected: 0 },
      { totalCount: 1, pageSize: 25, expected: 1 },
      { totalCount: 25, pageSize: 25, expected: 1 },
      { totalCount: 26, pageSize: 25, expected: 2 },
      { totalCount: 50, pageSize: 25, expected: 2 },
      { totalCount: 51, pageSize: 25, expected: 3 },
      { totalCount: 100, pageSize: 25, expected: 4 },
      { totalCount: 125, pageSize: 25, expected: 5 },
    ]

    testCases.forEach(({ totalCount, pageSize, expected }) => {
      const totalPages = Math.ceil(totalCount / pageSize)
      expect(totalPages).toBe(expected)
    })
  })

  it('calculates range correctly for pagination', () => {
    // These are the formulas used in Supabase .range(from, to)
    const testCases = [
      { page: 1, pageSize: 25, expectedFrom: 0, expectedTo: 24 },
      { page: 2, pageSize: 25, expectedFrom: 25, expectedTo: 49 },
      { page: 3, pageSize: 25, expectedFrom: 50, expectedTo: 74 },
      { page: 1, pageSize: 10, expectedFrom: 0, expectedTo: 9 },
      { page: 5, pageSize: 10, expectedFrom: 40, expectedTo: 49 },
    ]

    testCases.forEach(({ page, pageSize, expectedFrom, expectedTo }) => {
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      expect(from).toBe(expectedFrom)
      expect(to).toBe(expectedTo)
    })
  })
})
