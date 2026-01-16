import { requireSuperAdmin } from '@/lib/admin/auth'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { AdminHeader } from '@/components/admin/admin-header'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Admin | ComplyEUR',
  description: 'ComplyEUR administration panel',
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // This throws redirect if not superadmin
  const { user, profile } = await requireSuperAdmin()

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminSidebar />
      <div className="lg:pl-64">
        <AdminHeader user={user} adminName={profile.full_name} />
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
