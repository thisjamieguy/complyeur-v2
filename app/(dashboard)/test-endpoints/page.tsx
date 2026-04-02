import { requireSuperAdmin } from '@/lib/admin/auth'
import { TestEndpointsPage } from '@/components/testing/test-endpoints-page'

export default async function TestEndpointsRoute() {
  await requireSuperAdmin()

  return <TestEndpointsPage />
}
