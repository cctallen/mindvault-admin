"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { getNamespaces, getSecrets, createSecret, updateSecret, revealSecret, deleteSecret } from "@/lib/api"
import type { Secret, Namespace } from "@/lib/types"
import { DataTable } from "@/components/data-table"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Eye, EyeOff, Pencil, Trash2, Copy, Check, KeyRound } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const secretSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(200)
    .regex(/^[a-zA-Z0-9_\-.]+$/, "Name may only contain letters, numbers, underscores, hyphens, and dots"),
  value: z.string().min(1, "Value is required").max(10000),
  description: z.string().max(500).optional(),
})

type SecretForm = z.infer<typeof secretSchema>

export default function SecretsPage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [selectedNsId, setSelectedNsId] = useState<string>("")
  const [createOpen, setCreateOpen] = useState(false)
  const [editSecret, setEditSecret] = useState<Secret | null>(null)
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, string>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const token = session?.accessToken ?? ""

  // Load namespaces for selector
  const { data: namespacesData } = useQuery({
    queryKey: ["namespaces"],
    queryFn: () => getNamespaces(token),
    enabled: !!token,
  })
  const namespaces: Namespace[] = namespacesData?.items ?? []

  // Load secrets for selected namespace
  const { data: secrets = [], isLoading } = useQuery({
    queryKey: ["secrets", selectedNsId],
    queryFn: () => getSecrets(token, selectedNsId),
    enabled: !!token && !!selectedNsId,
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SecretForm>({ resolver: zodResolver(secretSchema) })

  const {
    register: editRegister,
    handleSubmit: handleEditSubmit,
    reset: editReset,
    setValue: setEditValue,
    formState: { errors: editErrors, isSubmitting: editSubmitting },
  } = useForm<SecretForm>({ resolver: zodResolver(secretSchema) })

  // Create
  const createMutation = useMutation({
    mutationFn: (data: SecretForm) => createSecret(token, selectedNsId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["secrets", selectedNsId] })
      toast({ title: "Secret created" })
      reset()
      setCreateOpen(false)
    },
    onError: (err) => toast({ title: "Failed to create secret", description: err instanceof Error ? err.message : "Unknown", variant: "destructive" }),
  })

  // Update
  const updateMutation = useMutation({
    mutationFn: (data: SecretForm) => updateSecret(token, selectedNsId, editSecret!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["secrets", selectedNsId] })
      toast({ title: "Secret updated" })
      editReset()
      setEditSecret(null)
    },
    onError: (err) => toast({ title: "Failed to update secret", description: err instanceof Error ? err.message : "Unknown", variant: "destructive" }),
  })

  // Reveal
  const revealMutation = useMutation({
    mutationFn: (secretId: string) => revealSecret(token, selectedNsId, secretId),
    onSuccess: (data) => {
      setRevealedSecrets((prev) => ({ ...prev, [data.id]: data.value }))
    },
    onError: (err) => toast({ title: "Failed to reveal secret", description: err instanceof Error ? err.message : "Unknown", variant: "destructive" }),
  })

  // Delete
  const deleteMutation = useMutation({
    mutationFn: (secretId: string) => deleteSecret(token, selectedNsId, secretId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["secrets", selectedNsId] })
      toast({ title: "Secret deleted" })
    },
    onError: (err) => toast({ title: "Failed to delete secret", description: err instanceof Error ? err.message : "Unknown", variant: "destructive" }),
  })

  const handleCopy = async (secretId: string, value: string) => {
    await navigator.clipboard.writeText(value)
    setCopiedId(secretId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const openEdit = (secret: Secret) => {
    setEditSecret(secret)
    setEditValue("name", secret.name)
    setEditValue("description", secret.description ?? "")
    setEditValue("value", "")
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns: any[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }: { row: { original: Secret } }) => (
        <span className="font-mono text-sm font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }: { row: { original: Secret } }) => (
        <span className="text-sm text-muted-foreground">{row.original.description || "—"}</span>
      ),
    },
    {
      id: "value",
      header: "Value",
      cell: ({ row }: { row: { original: Secret } }) => {
        const revealed = revealedSecrets[row.original.id]
        return (
          <div className="flex items-center gap-2 max-w-xs">
            {revealed ? (
              <>
                <span className="font-mono text-xs bg-muted px-2 py-1 rounded truncate max-w-[200px]">
                  {revealed}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  title="Copy value"
                  onClick={() => handleCopy(row.original.id, revealed)}
                >
                  {copiedId === row.original.id ? (
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  title="Hide value"
                  onClick={() => setRevealedSecrets((prev) => {
                    const next = { ...prev }
                    delete next[row.original.id]
                    return next
                  })}
                >
                  <EyeOff className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : (
              <>
                <span className="text-muted-foreground text-xs font-mono">••••••••</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  title="Reveal value"
                  onClick={() => revealMutation.mutate(row.original.id)}
                  disabled={revealMutation.isPending}
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }: { row: { original: Secret } }) =>
        new Date(row.original.createdAt).toLocaleDateString(),
    },
    {
      id: "actions",
      cell: ({ row }: { row: { original: Secret } }) => (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => openEdit(row.original)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <ConfirmDialog
            title="Delete Secret"
            description={`Delete "${row.original.name}"? This cannot be undone.`}
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
        <div className="flex items-center gap-3">
          <KeyRound className="h-7 w-7 text-muted-foreground" />
          <h1 className="text-3xl font-bold">Secrets</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Namespace selector */}
          <Select value={selectedNsId} onValueChange={(v) => setSelectedNsId(v ?? "")}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Select namespace…" />
            </SelectTrigger>
            <SelectContent>
              {namespaces.map((ns) => (
                <SelectItem key={ns.id} value={ns.id}>
                  {ns.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={() => setCreateOpen(true)}
            disabled={!selectedNsId}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Secret
          </Button>
        </div>
      </div>

      {!selectedNsId ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          <KeyRound className="mx-auto h-10 w-10 mb-3 opacity-30" />
          <p className="text-sm">Select a namespace to view its secrets</p>
        </div>
      ) : (
        <DataTable columns={columns} data={secrets} isLoading={isLoading} />
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Secret</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="DATABASE_URL"
                className="font-mono"
                {...register("name")}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              <p className="text-xs text-muted-foreground">Letters, numbers, underscores, hyphens, and dots only</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">Value</Label>
              <Input
                id="value"
                type="password"
                placeholder="Enter secret value"
                {...register("value")}
              />
              {errors.value && <p className="text-sm text-destructive">{errors.value.message}</p>}
              <p className="text-xs text-muted-foreground">Stored encrypted with AES-256-GCM</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description <span className="text-muted-foreground">(optional)</span></Label>
              <Textarea id="description" rows={2} {...register("description")} />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => { reset(); setCreateOpen(false) }}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting || createMutation.isPending}>
                {createMutation.isPending ? "Creating…" : "Create Secret"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editSecret} onOpenChange={(open) => { if (!open) { setEditSecret(null); editReset() } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Secret</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit((data) => updateMutation.mutate(data))} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                className="font-mono"
                {...editRegister("name")}
              />
              {editErrors.name && <p className="text-sm text-destructive">{editErrors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-value">New Value</Label>
              <Input
                id="edit-value"
                type="password"
                placeholder="Enter new value to rotate"
                {...editRegister("value")}
              />
              {editErrors.value && <p className="text-sm text-destructive">{editErrors.value.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description <span className="text-muted-foreground">(optional)</span></Label>
              <Textarea id="edit-description" rows={2} {...editRegister("description")} />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => { setEditSecret(null); editReset() }}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={editSubmitting || updateMutation.isPending}>
                {updateMutation.isPending ? "Updating…" : "Update Secret"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
