'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { ImportSummary } from '@/components/import/ImportSummary';
import { StepIndicator } from '@/components/import/StepIndicator';
import { ImportSession, ImportFormat, ImportResult } from '@/types/import';
import { getImportSession } from '../actions';

export default function SuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');

  const [session, setSession] = useState<ImportSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      if (!sessionId) {
        router.push('/import');
        return;
      }

      try {
        const loadedSession = await getImportSession(sessionId);

        if (!loadedSession || !loadedSession.result) {
          router.push('/import');
          return;
        }

        setSession(loadedSession);
      } catch (error) {
        console.error('Failed to load session:', error);
        router.push('/import');
      } finally {
        setIsLoading(false);
      }
    }

    loadSession();
  }, [sessionId, router]);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <StepIndicator currentStep={4} />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  if (!session || !session.result) {
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <StepIndicator currentStep={4} />
      <ImportSummary
        result={session.result as ImportResult}
        format={session.format as ImportFormat}
      />
    </div>
  );
}
