export const dynamic = 'force-dynamic'

import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex-1 ml-60 flex flex-col">
        <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
          <div className="flex h-14 items-center justify-end px-6">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center">
                <span className="text-[10px] font-bold text-primary">
                  {session.user?.email?.[0]?.toUpperCase()}
                </span>
              </div>
              <span className="text-sm text-muted-foreground hidden sm:block">{session.user?.email}</span>
            </div>
          </div>
        </header>
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
