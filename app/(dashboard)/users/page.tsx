"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { getUsers, createUser, updateUser, deleteUser, resetUserPassword, assignUserRole, removeUserRole } from "@/lib/api"
import type { AppUser } from "@/lib/types"
import { DataTable } from "@/components/data-table"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Pencil, KeyRound, Trash2, ShieldCheck, ShieldOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// ─── Schemas ────────────────────────────────────────────────
const createSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

const editSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Valid email is required"),
})

const resetSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
})

type CreateForm = z.infer<typeof createSchema>
type EditForm = z.infer<typeof editSchema>
type ResetForm = z.infer<typeof resetSchema>

// ─── Page ────────────────────────────────────────────────────
export default function UsersPage() {
  const { data: session } = useSession()
  const token = session?.accessToken ?? ""
  const router = useRouter()

  // Redirect non-admins
  useEffect(() => {
    if (session && session.role !== "Admin") {
      router.replace("/dashboard")
    }
  }, [session, router])

  if (!session || session.role !== "Admin") return null
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<AppUser | null>(null)
  const [resetUser, setResetUser] = useState<AppUser | null>(null)

  // ─── Queries ──────────────────────────────────────────────
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => getUsers(token),
    enabled: !!token,
  })

  // ─── Create form ─────────────────────────────────────────
  const {
    register: createRegister,
    handleSubmit: handleCreateSubmit,
    reset: createReset,
    formState: { errors: createErrors, isSubmitting: createSubmitting },
  } = useForm<CreateForm>({ resolver: zodResolver(createSchema) })

  // ─── Edit form ───────────────────────────────────────────
  const {
    register: editRegister,
    handleSubmit: handleEditSubmit,
    reset: editReset,
    formState: { errors: editErrors, isSubmitting: editSubmitting },
  } = useForm<EditForm>({ resolver: zodResolver(editSchema) })

  // Populate edit form when a user is selected
  useEffect(() => {
    if (editUser) {
      editReset({
        firstName: editUser.firstName,
        lastName: editUser.lastName,
        email: editUser.email,
      })
    }
  }, [editUser, editReset])

  // ─── Reset password form ─────────────────────────────────
  const {
    register: resetRegister,
    handleSubmit: handleResetSubmit,
    reset: resetFormReset,
    formState: { errors: resetErrors, isSubmitting: resetSubmitting },
  } = useForm<ResetForm>({ resolver: zodResolver(resetSchema) })

  // ─── Mutations ───────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: CreateForm) => createUser(token, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      toast({ title: "User created successfully" })
      createReset()
      setCreateOpen(false)
    },
    onError: (err) =>
      toast({
        title: "Failed to create user",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      }),
  })

  const editMutation = useMutation({
    mutationFn: (data: EditForm) => updateUser(token, editUser!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      toast({ title: "User updated" })
      setEditUser(null)
    },
    onError: (err) =>
      toast({
        title: "Failed to update user",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUser(token, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      toast({ title: "User deactivated" })
    },
    onError: (err) =>
      toast({
        title: "Failed to delete user",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      }),
  })

  const resetPasswordMutation = useMutation({
    mutationFn: (data: ResetForm) => resetUserPassword(token, resetUser!.id, data.newPassword),
    onSuccess: () => {
      toast({ title: "Password reset successfully" })
      resetFormReset()
      setResetUser(null)
    },
    onError: (err) =>
      toast({
        title: "Failed to reset password",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      }),
  })

  const roleMutation = useMutation({
    mutationFn: ({ id, isAdmin }: { id: string; isAdmin: boolean }) =>
      isAdmin ? removeUserRole(token, id, "Admin") : assignUserRole(token, id, "Admin"),
    onSuccess: (_, { isAdmin }) => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      toast({ title: isAdmin ? "Admin role removed" : "Admin role assigned" })
    },
    onError: (err) =>
      toast({
        title: "Failed to update role",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      }),
  })

  // ─── Columns ─────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns: any[] = [
    {
      id: "avatar",
      cell: ({ row }: { row: { original: AppUser } }) => {
        const u = row.original
        const initials =
          ((u.firstName?.[0] ?? "") + (u.lastName?.[0] ?? "")).toUpperCase() ||
          u.email[0].toUpperCase()
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
          {row.original.fullName || (
            <span className="text-muted-foreground italic">—</span>
          )}
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
      cell: ({ row }: { row: { original: AppUser } }) => {
        const u = row.original
        const isAdmin = u.roles?.includes("Admin")
        return (
          <div className="flex items-center gap-1.5">
            {isAdmin && <Badge variant="default">Admin</Badge>}
            {u.id === session?.userId && <Badge variant="secondary">You</Badge>}
          </div>
        )
      },
    },
    {
      id: "actions",
      cell: ({ row }: { row: { original: AppUser } }) => {
        const isSelf = row.original.id === session?.userId
        const isAdmin = row.original.roles?.includes("Admin")
        return (
          <div className="flex items-center gap-2">
            {/* Edit */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditUser(row.original)}
              title="Edit user"
            >
              <Pencil className="h-4 w-4" />
            </Button>

            {/* Reset password */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setResetUser(row.original)}
              title="Reset password"
            >
              <KeyRound className="h-4 w-4" />
            </Button>

            {/* Promote / demote admin */}
            <ConfirmDialog
              title={isAdmin ? "Remove Admin Role" : "Make Admin"}
              description={
                isAdmin
                  ? `Remove admin access from ${row.original.email}?`
                  : `Grant admin access to ${row.original.email}? They will have full access to all users and namespaces.`
              }
              onConfirm={() => roleMutation.mutateAsync({ id: row.original.id, isAdmin: !!isAdmin })}
              isLoading={roleMutation.isPending}
              trigger={
                <Button
                  variant={isAdmin ? "outline" : "outline"}
                  size="sm"
                  disabled={isSelf}
                  title={isSelf ? "Cannot modify your own role" : isAdmin ? "Remove admin" : "Make admin"}
                  className={isAdmin ? "text-orange-500 border-orange-200 hover:bg-orange-50" : "text-indigo-500 border-indigo-200 hover:bg-indigo-50"}
                >
                  {isAdmin ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                </Button>
              }
            />

            {/* Delete */}
            <ConfirmDialog
              title="Deactivate User"
              description="This will deactivate the user account."
              onConfirm={() => deleteMutation.mutateAsync(row.original.id)}
              isLoading={deleteMutation.isPending}
              trigger={
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isSelf}
                  title={isSelf ? "Cannot delete yourself" : "Delete user"}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              }
            />
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground mt-1">
            All registered users on this MindVault instance.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create User</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={handleCreateSubmit((data) => createMutation.mutate(data))}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" {...createRegister("firstName")} />
                  {createErrors.firstName && (
                    <p className="text-sm text-destructive">{createErrors.firstName.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" {...createRegister("lastName")} />
                  {createErrors.lastName && (
                    <p className="text-sm text-destructive">{createErrors.lastName.message}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  {...createRegister("email")}
                />
                {createErrors.email && (
                  <p className="text-sm text-destructive">{createErrors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Min. 8 characters"
                  {...createRegister("password")}
                />
                {createErrors.password && (
                  <p className="text-sm text-destructive">{createErrors.password.message}</p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={createSubmitting || createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create User"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <DataTable columns={columns} data={users} isLoading={isLoading} />

      {/* Edit dialog */}
      <Dialog
        open={editUser !== null}
        onOpenChange={(open) => {
          if (!open) setEditUser(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleEditSubmit((data) => editMutation.mutate(data))}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-firstName">First Name</Label>
                <Input id="edit-firstName" {...editRegister("firstName")} />
                {editErrors.firstName && (
                  <p className="text-sm text-destructive">{editErrors.firstName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lastName">Last Name</Label>
                <Input id="edit-lastName" {...editRegister("lastName")} />
                {editErrors.lastName && (
                  <p className="text-sm text-destructive">{editErrors.lastName.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input id="edit-email" type="email" {...editRegister("email")} />
              {editErrors.email && (
                <p className="text-sm text-destructive">{editErrors.email.message}</p>
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setEditUser(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={editSubmitting || editMutation.isPending}
              >
                {editMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset password dialog */}
      <Dialog
        open={resetUser !== null}
        onOpenChange={(open) => {
          if (!open) {
            setResetUser(null)
            resetFormReset()
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleResetSubmit((data) => resetPasswordMutation.mutate(data))}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Min. 8 characters"
                {...resetRegister("newPassword")}
              />
              {resetErrors.newPassword && (
                <p className="text-sm text-destructive">{resetErrors.newPassword.message}</p>
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setResetUser(null)
                  resetFormReset()
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={resetSubmitting || resetPasswordMutation.isPending}
              >
                {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
