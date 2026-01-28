'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Hook to handle data refresh after imports or bulk operations.
 *
 * When data is updated (e.g., after import), a sessionStorage flag is set.
 * This hook detects that flag and triggers a router.refresh() to fetch
 * fresh data from the server, clearing the Next.js Router Cache.
 *
 * Usage: Call this hook in any page that displays data which could be
 * affected by imports (dashboard, calendar, employee pages, etc.)
 */
export function useDataRefresh() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const dataUpdatedAt = sessionStorage.getItem('complyeur_data_updated');
    if (!dataUpdatedAt) return;

    // Check if the update was recent (within the last 30 seconds)
    const updatedTimestamp = parseInt(dataUpdatedAt, 10);
    const now = Date.now();
    const isRecent = now - updatedTimestamp < 30000; // 30 seconds

    if (isRecent) {
      // Clear the flag immediately to prevent repeated refreshes
      sessionStorage.removeItem('complyeur_data_updated');

      // Trigger a server refresh to get fresh data
      // This invalidates the Router Cache for the current page
      router.refresh();
    } else {
      // Flag is stale, remove it
      sessionStorage.removeItem('complyeur_data_updated');
    }
  }, [router]);
}
