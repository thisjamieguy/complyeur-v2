import Link from 'next/link'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Clock } from 'lucide-react'

interface Trial {
  id: string
  trial_ends_at: string
  company_id: string
  companies: {
    id: string
    name: string
  } | null
}

interface TrialsExpiringSoonProps {
  trials: Trial[]
}

export function TrialsExpiringSoon({ trials }: TrialsExpiringSoonProps) {
  if (trials.length === 0) {
    return null
  }

  return (
    <Alert className="border-amber-200 bg-amber-50">
      <Clock className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-800">Trials Expiring Soon</AlertTitle>
      <AlertDescription>
        <ul className="mt-2 space-y-1">
          {trials.map((trial) => (
            <li key={trial.id} className="flex items-center justify-between">
              <Link
                href={`/admin/companies/${trial.company_id}`}
                className="text-sm text-amber-800 hover:underline font-medium"
              >
                {trial.companies?.name || 'Unknown Company'}
              </Link>
              <span className="text-sm text-amber-700">
                expires {formatDistanceToNow(parseISO(trial.trial_ends_at), { addSuffix: true })}
              </span>
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  )
}
