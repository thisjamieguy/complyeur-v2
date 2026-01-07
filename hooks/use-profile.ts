'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ProfileWithCompany } from '@/types/database';

interface UseProfileResult {
  profile: ProfileWithCompany | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to get the current user's profile with company data
 * Uses the browser Supabase client for client components
 *
 * @example
 * const { profile, isLoading, error } = useProfile();
 * if (profile?.role === 'admin') { ... }
 */
export function useProfile(): UseProfileResult {
  const [profile, setProfile] = useState<ProfileWithCompany | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setProfile(null);
          setIsLoading(false);
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*, companies(id, name, slug, created_at, updated_at)')
          .eq('id', user.id)
          .single();

        if (profileError) {
          if (profileError.code === 'PGRST116') {
            // No profile found
            setProfile(null);
          } else {
            throw new Error(profileError.message);
          }
        } else {
          setProfile(profileData as ProfileWithCompany);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch profile'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchProfile();
  }, []);

  return { profile, isLoading, error };
}
