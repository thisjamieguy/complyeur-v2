'use client'

/**
 * SkipLink Component
 *
 * Provides a keyboard-accessible skip link that allows users to bypass
 * navigation and jump directly to main content. Essential for WCAG 2.1 AA
 * compliance (Success Criterion 2.4.1 - Bypass Blocks).
 *
 * The link is visually hidden until focused, then appears at the top of
 * the viewport. This ensures it doesn't interfere with visual design
 * while remaining accessible to keyboard and screen reader users.
 */

interface SkipLinkProps {
  /** The ID of the element to skip to (without the # prefix) */
  targetId?: string
  /** Custom label for the skip link */
  label?: string
}

export function SkipLink({
  targetId = 'main-content',
  label = 'Skip to main content'
}: SkipLinkProps) {
  return (
    <a
      href={`#${targetId}`}
      className="
        sr-only focus:not-sr-only
        focus:absolute focus:z-[9999] focus:top-4 focus:left-4
        focus:px-4 focus:py-2
        focus:bg-slate-900 focus:text-white
        focus:rounded-md focus:shadow-lg
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        transition-none
      "
    >
      {label}
    </a>
  )
}
