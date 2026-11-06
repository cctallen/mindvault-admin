export const dynamic = 'force-dynamic'

import { auth } from "@/auth"
import { getNamespaces } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Database, Users } from "lucide-react"
import Link from "next/link"

export default async function DashboardPage() {
  const session = await auth()
  const result = await getNamespaces(session!.accessToken, 1, 5).catch(() => null)
  const namespaces = result?.items ?? []
  const totalCount = result?.total ?? result?.totalCount ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Welcome back</h1>
        <p className="text-muted-foreground mt-1">{session?.user?.email}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Namespaces</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
            <p className="text-xs text-muted-foreground">Total namespaces</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground">Manage via namespace detail</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Namespaces</h2>
        {namespaces.length === 0 ? (
          <p className="text-muted-foreground">No namespaces yet.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {namespaces.map((ns) => (
              <Link key={ns.id} href={`/namespaces/${ns.slug}`}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{ns.displayName}</CardTitle>
                      <Badge variant={ns.isPublic ? "default" : "secondary"}>
                        {ns.isPublic ? "Public" : "Private"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">{ns.slug}</p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">{ns.description}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(ns.createdAt).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
