/**
 * @fileoverview React Testing Library utilities
 *
 * Custom render function that wraps components with necessary providers.
 * Re-exports everything from @testing-library/react for convenience.
 */

import React, { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * Custom providers wrapper for testing
 */
interface ProvidersProps {
  children: ReactNode;
}

function AllProviders({ children }: ProvidersProps) {
  // Add any global providers here (theme, context, etc.)
  return <>{children}</>;
}

/**
 * Custom render function that wraps with all providers
 */
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

/**
 * Setup user event with advanced timers
 */
function setupUser() {
  return userEvent.setup({
    advanceTimers: vi.advanceTimersByTime.bind(vi),
  });
}

// Re-export everything from testing-library
export * from '@testing-library/react';

// Override render with custom render
export { customRender as render };

// Export user event setup
export { setupUser, userEvent };
