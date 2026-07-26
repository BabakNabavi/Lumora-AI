import { DashboardShell } from '@/components/dashboard/shell'
import { navigation } from '@/config/site'
import { requireUser } from '@/lib/auth/current-user'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireUser()

  return (
    <DashboardShell
      title="Workspace"
      items={navigation.dashboard}
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
