'use client';

import { useDataRefresh } from '@/hooks/use-data-refresh';

/**
 * Client component that handles data refresh after imports.
 * Add this to any page layout that displays data which could be
 * affected by bulk imports or updates.
 *
 * This component renders nothing - it only runs the refresh logic.
 */
export function DataRefreshHandler() {
  useDataRefresh();
  return null;
}
