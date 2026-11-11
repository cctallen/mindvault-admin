"use client"

import { useSession } from "next-auth/react"
import { useQuery } from "@tanstack/react-query"
import { getUsers } from "@/lib/api"
import type { AppUser } from "@/lib/types"
import { DataTable } from "@/components/data-table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

export default function UsersPage() {
  const { data: session } = useSession()
  const token = session?.accessToken ?? ""

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => getUsers(token),
    enabled: !!token,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns: any[] = [
    {
      id: "avatar",
      cell: ({ row }: { row: { original: AppUser } }) => {
        const u = row.original
        const initials = ((u.firstName?.[0] ?? "") + (u.lastName?.[0] ?? "")).toUpperCase() || u.email[0].toUpperCase()
        return (
          <Avatar className="h-8 w-8">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        )
      },
    },
    {
      accessorKey: "fullName",
      header: "Name",
      cell: ({ row }: { row: { original: AppUser } }) => (
        <span className="font-medium">
          {row.original.fullName || <span className="text-muted-foreground italic">—</span>}
        </span>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }: { row: { original: AppUser } }) => (
        <span className="text-sm">{row.original.email}</span>
      ),
    },
    {
      accessorKey: "id",
      header: "User ID",
      cell: ({ row }: { row: { original: AppUser } }) => (
        <span className="font-mono text-xs text-muted-foreground">{row.original.id}</span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Joined",
      cell: ({ row }: { row: { original: AppUser } }) => (
        <span className="text-sm text-muted-foreground">
          {new Date(row.original.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      id: "you",
      cell: ({ row }: { row: { original: AppUser } }) =>
        row.original.id === session?.userId
          ? <Badge variant="secondary">You</Badge>
          : null,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Users</h1>
        <p className="text-muted-foreground mt-1">All registered users on this MindVault instance.</p>
      </div>
      <DataTable columns={columns} data={users} isLoading={isLoading} />
    </div>
  )
}
