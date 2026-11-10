"use client"

import { SessionProvider, useSession, signOut } from "next-auth/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState, useEffect } from "react"

// Force sign-out if the refresh token has expired
function SessionGuard({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  useEffect(() => {
    if (session?.error === "RefreshAccessTokenError") {
      signOut({ callbackUrl: "/login" })
    }
  }, [session])
  return <>{children}</>
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
        },
      })
  )

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <SessionGuard>{children}</SessionGuard>
      </QueryClientProvider>
    </SessionProvider>
  )
}
