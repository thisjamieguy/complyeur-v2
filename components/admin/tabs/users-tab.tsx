import { format, parseISO } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getRoleLabel } from '@/lib/permissions'

interface UsersTabProps {
  company: {
    id: string
    profiles: Array<{
      id: string
      full_name: string | null
      role: string | null
      created_at: string | null
    }>
  }
}

export function UsersTab({ company }: UsersTabProps) {
  const users = company.profiles

  if (users.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
        <p className="text-slate-500">No users found for this company</p>
      </div>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>User ID</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  {user.full_name || 'Unnamed User'}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {getRoleLabel(user.role ?? 'viewer')}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs text-slate-500">
                  {user.id}
                </TableCell>
                <TableCell className="text-slate-500">
                  {user.created_at
                    ? format(parseISO(user.created_at), 'MMM d, yyyy')
                    : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
