export const dynamic = 'force-dynamic'

import { auth } from "@/auth"
import { getNamespaces } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Database, Bot, ArrowRight } from "lucide-react"
import Link from "next/link"

export default async function DashboardPage() {
  const session = await auth()
  const result = await getNamespaces(session!.accessToken, 1, 6).catch(() => null)
  const namespaces = result?.items ?? []
  const totalCount = result?.total ?? result?.totalCount ?? 0

  const firstName = session?.user?.email?.split("@")[0] ?? "there"

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, <span className="text-primary">{firstName}</span>
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{session?.user?.email}</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Namespaces</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Database className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalCount}</div>
            <Link href="/namespaces" className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Agents</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bot className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">—</div>
            <Link href="/agents" className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1">
              Manage agents <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent namespaces */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold tracking-tight">Recent Namespaces</h2>
          <Link href="/namespaces" className="text-sm text-primary hover:underline flex items-center gap-1">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {namespaces.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-border p-10 text-center">
            <Database className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No namespaces yet.</p>
            <Link href="/namespaces">
              <Badge variant="outline" className="mt-3 cursor-pointer hover:bg-accent">Create one</Badge>
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {namespaces.map((ns) => (
              <Link key={ns.id} href={`/namespaces/${ns.slug}`}>
                <Card className="card-elevated hover:border-primary/40 hover:shadow-md transition-all duration-200 cursor-pointer group">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm font-semibold leading-snug group-hover:text-primary transition-colors">
                        {ns.displayName}
                      </CardTitle>
                      <Badge variant={ns.isPublic ? "default" : "secondary"} className="shrink-0 text-[10px]">
                        {ns.isPublic ? "Public" : "Private"}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground font-mono">{ns.slug}</p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {ns.description || "No description"}
                    </p>
                    <p className="text-[11px] text-muted-foreground/60 mt-3">
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
