import { SiteFooter } from '@/components/shared/site-footer'
import { SiteHeader } from '@/components/shared/site-header'
import { getCurrentUser } from '@/lib/auth/current-user'

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader
        user={
          user
            ? {
                name: user.name,
                email: user.email,
                image: user.image,
                credits: user.credits,
                role: user.role,
              }
            : null
        }
      />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  )
}
