"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { getNamespaces, createNamespace, deleteNamespace } from "@/lib/api"
import type { Namespace } from "@/lib/types"
import { DataTable } from "@/components/data-table"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Plus, Eye, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const createSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  displayName: z.string().min(1, "Display name is required"),
  description: z.string(),
  isPublic: z.boolean(),
})

type CreateForm = z.infer<typeof createSchema>

export default function NamespacesPage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const router = useRouter()
  const { toast } = useToast()
  const [createOpen, setCreateOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ["namespaces"],
    queryFn: () => getNamespaces(session!.accessToken),
    enabled: !!session?.accessToken,
  })

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { isPublic: false },
  })

  const isPublic = watch("isPublic")

  const createMutation = useMutation({
    mutationFn: (formData: CreateForm) =>
      createNamespace(session!.accessToken, {
        ...formData,
        ownerId: session!.userId ?? "",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["namespaces"] })
      toast({ title: "Namespace created successfully" })
      reset()
      setCreateOpen(false)
    },
    onError: (err) => {
      toast({ title: "Failed to create namespace", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteNamespace(session!.accessToken, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["namespaces"] })
      toast({ title: "Namespace deleted" })
    },
    onError: (err) => {
      toast({ title: "Failed to delete namespace", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" })
    },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns: any[] = [
    {
      accessorKey: "slug",
      header: "Slug",
      cell: ({ row }: { row: { original: Namespace } }) => <span className="font-mono text-sm">{row.original.slug}</span>,
    },
    {
      accessorKey: "displayName",
      header: "Display Name",
    },
    {
      accessorKey: "isPublic",
      header: "Visibility",
      cell: ({ row }: { row: { original: Namespace } }) => (
        <Badge variant={row.original.isPublic ? "default" : "secondary"}>
          {row.original.isPublic ? "Public" : "Private"}
        </Badge>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }: { row: { original: Namespace } }) => new Date(row.original.createdAt).toLocaleDateString(),
    },
    {
      id: "actions",
      cell: ({ row }: { row: { original: Namespace } }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/namespaces/${row.original.slug}`)}
          >
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
          <ConfirmDialog
            title="Delete Namespace"
            description={`Are you sure you want to delete "${row.original.displayName}"? This action cannot be undone.`}
            onConfirm={() => deleteMutation.mutateAsync(row.original.id)}
            isLoading={deleteMutation.isPending}
            trigger={
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4" />
              </Button>
            }
          />
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Namespaces</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger>
            <Button><Plus className="h-4 w-4 mr-2" />New Namespace</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Namespace</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input id="slug" placeholder="my-namespace" {...register("slug")} />
                {errors.slug && <p className="text-sm text-destructive">{errors.slug.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input id="displayName" {...register("displayName")} />
                {errors.displayName && <p className="text-sm text-destructive">{errors.displayName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" {...register("description")} />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="isPublic"
                  checked={isPublic}
                  onCheckedChange={(v) => setValue("isPublic", v)}
                />
                <Label htmlFor="isPublic">Public namespace</Label>
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting || createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Namespace"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable columns={columns} data={data?.items ?? []} isLoading={isLoading} />
    </div>
  )
}
