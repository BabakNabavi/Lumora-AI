import { DashboardShell } from '@/components/dashboard/shell'
import { navigation } from '@/config/site'
import { requireAdmin } from '@/lib/auth/current-user'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // The proxy already blocks non-admins at the edge; this re-checks against the
  // database so a stale role claim in a token cannot reach the data.
  const user = await requireAdmin()

  return (
    <DashboardShell
      title="Admin"
      items={navigation.admin}
      user={{
        name: user.name,
        email: user.email,
        image: user.image,
        credits: user.credits,
        role: user.role,
      }}
    >
      {children}
    </DashboardShell>
  )
}
