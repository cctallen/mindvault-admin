"use client"

import { useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { use } from "react"
import {
  getNamespaceBySlug,
  getMemories,
  searchMemories,
  createMemory,
  deleteMemory,
  getAgents,
  getAllAgents,
  createAgent,
  deleteAgent,
  addAgentToNamespace,
  removeAgentFromNamespace,
  rotateAgentKey,
  getMembers,
  addMember,
  updateMemberRole,
  removeMember,
} from "@/lib/api"
import type { Memory, Agent, Member } from "@/lib/types"
import { MemoryType, MemoryVisibility, NamespaceRole, NAMESPACE_ROLE_LABELS } from "@/lib/types"
import { DataTable } from "@/components/data-table"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { MemoryTypeBadge, VisibilityBadge } from "@/components/memory-badges"
import { CopyInput } from "@/components/copy-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Plus, Trash2, RefreshCw, ChevronLeft, ChevronRight, Link2, Unlink } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useDebounce } from "@/hooks/use-debounce"

// ——— MEMORIES TAB ———

function MemoriesTab({ namespaceId, token }: { namespaceId: string; token: string }) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 400)
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [addOpen, setAddOpen] = useState(false)

  const { data: pagedData, isLoading: loadingPaged } = useQuery({
    queryKey: ["memories", namespaceId, page],
    queryFn: () => getMemories(token, namespaceId, { page, pageSize: 20 }),
    enabled: !debouncedSearch,
  })

  const { data: searchResults, isLoading: loadingSearch } = useQuery({
    queryKey: ["memories-search", namespaceId, debouncedSearch],
    queryFn: () => searchMemories(token, namespaceId, debouncedSearch),
    enabled: !!debouncedSearch,
  })

  const rawMemories = debouncedSearch ? (searchResults ?? []) : (pagedData?.items ?? [])
  const memories = typeFilter !== "all"
    ? rawMemories.filter((m) => m.type === Number(typeFilter))
    : rawMemories

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMemory(token, namespaceId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memories", namespaceId] })
      toast({ title: "Memory deleted" })
    },
  })

  const memorySchema = z.object({
    content: z.string().min(1, "Content is required"),
    type: z.string(),
    visibility: z.string(),
    source: z.string().optional(),
    expiresAt: z.string().optional(),
  })
  type MemoryForm = z.infer<typeof memorySchema>

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<MemoryForm>({
    resolver: zodResolver(memorySchema),
    defaultValues: { type: "0", visibility: "0" },
  })

  const createMutation = useMutation({
    mutationFn: (data: MemoryForm) =>
      createMemory(token, namespaceId, {
        content: data.content,
        type: Number(data.type),
        visibility: Number(data.visibility),
        source: data.source || undefined,
        expiresAt: data.expiresAt || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memories", namespaceId] })
      toast({ title: "Memory added" })
      reset()
      setAddOpen(false)
    },
    onError: (err) => {
      toast({ title: "Failed to add memory", description: err instanceof Error ? err.message : "Unknown", variant: "destructive" })
    },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns: any[] = [
    {
      accessorKey: "content",
      header: "Content",
      cell: ({ row }: { row: { original: Memory } }) => (
        <span className="text-sm">{row.original.content.slice(0, 80)}{row.original.content.length > 80 ? "…" : ""}</span>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }: { row: { original: Memory } }) => <MemoryTypeBadge type={row.original.type} />,
    },
    {
      accessorKey: "visibility",
      header: "Visibility",
      cell: ({ row }: { row: { original: Memory } }) => <VisibilityBadge visibility={row.original.visibility} />,
    },
    {
      accessorKey: "source",
      header: "Source",
      cell: ({ row }: { row: { original: Memory } }) => <span className="text-sm text-muted-foreground">{row.original.source ?? "—"}</span>,
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }: { row: { original: Memory } }) => new Date(row.original.createdAt).toLocaleDateString(),
    },
    {
      id: "actions",
      cell: ({ row }: { row: { original: Memory } }) => (
        <ConfirmDialog
          title="Delete Memory"
          description="Are you sure you want to delete this memory?"
          onConfirm={() => deleteMutation.mutateAsync(row.original.id)}
          isLoading={deleteMutation.isPending}
          trigger={
            <Button variant="destructive" size="sm">
              <Trash2 className="h-4 w-4" />
            </Button>
          }
        />
      ),
    },
  ]

  const typeVal = watch("type")
  const visibilityVal = watch("visibility")

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Input
          placeholder="Search memories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "all")}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="0">Fact</SelectItem>
            <SelectItem value="1">Preference</SelectItem>
            <SelectItem value="2">Event</SelectItem>
            <SelectItem value="3">Context</SelectItem>
            <SelectItem value="4">Instruction</SelectItem>
            <SelectItem value="5">Summary</SelectItem>
          </SelectContent>
        </Select>
        <Sheet open={addOpen} onOpenChange={setAddOpen}>
          <SheetTrigger render={<Button><Plus className="h-4 w-4 mr-2" />Add Memory</Button>} />
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Add Memory</SheetTitle>
            </SheetHeader>
            <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea rows={4} {...register("content")} />
                {errors.content && <p className="text-sm text-destructive">{errors.content.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={typeVal} onValueChange={(v) => setValue("type", v ?? "0")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Fact</SelectItem>
                    <SelectItem value="1">Preference</SelectItem>
                    <SelectItem value="2">Event</SelectItem>
                    <SelectItem value="3">Context</SelectItem>
                    <SelectItem value="4">Instruction</SelectItem>
                    <SelectItem value="5">Summary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Visibility</Label>
                <Select value={visibilityVal} onValueChange={(v) => setValue("visibility", v ?? "0")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Public</SelectItem>
                    <SelectItem value="1">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Source</Label>
                <Input {...register("source")} />
              </div>
              <div className="space-y-2">
                <Label>Expires At</Label>
                <Input type="datetime-local" {...register("expiresAt")} />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Adding..." : "Add Memory"}
              </Button>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      <DataTable columns={columns} data={memories} isLoading={loadingPaged || loadingSearch} />

      {!debouncedSearch && pagedData && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {Math.ceil(((pagedData.total ?? pagedData.totalCount ?? 1) || 1) / 20)}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page * 20 >= (pagedData.total ?? pagedData.totalCount ?? 0)}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ——— AGENTS TAB ———

function AgentsTab({ namespaceId, token, userId }: { namespaceId: string; token: string; userId: string }) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [createOpen, setCreateOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [selectedAgentId, setSelectedAgentId] = useState("")
  const [newKey, setNewKey] = useState<string | null>(null)
  const [keyModalOpen, setKeyModalOpen] = useState(false)

  // Agents already in this namespace
  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["agents", namespaceId],
    queryFn: () => getAgents(token, namespaceId),
  })

  // All agents the user has access to (for assign-existing picker)
  const { data: allAgents = [] } = useQuery({
    queryKey: ["agents-all"],
    queryFn: () => getAllAgents(token),
    enabled: assignOpen,
  })

  // Agents not yet in this namespace
  const currentIds = new Set(agents.map((a) => a.id))
  const assignableAgents = allAgents.filter((a) => !currentIds.has(a.id))

  const agentSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string(),
  })
  type AgentForm = z.infer<typeof agentSchema>

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AgentForm>({
    resolver: zodResolver(agentSchema),
  })

  const createMutation = useMutation({
    mutationFn: (data: AgentForm) =>
      createAgent(token, namespaceId, {
        namespaceId,
        name: data.name,
        description: data.description,
        requesterId: userId,
      }),
    onSuccess: (agent) => {
      queryClient.invalidateQueries({ queryKey: ["agents", namespaceId] })
      queryClient.invalidateQueries({ queryKey: ["agents-all"] })
      if (agent.apiKey) {
        setNewKey(agent.apiKey)
        setKeyModalOpen(true)
      }
      toast({ title: "Agent created" })
      reset()
      setCreateOpen(false)
    },
    onError: (err) => {
      toast({ title: "Failed to create agent", description: err instanceof Error ? err.message : "Unknown", variant: "destructive" })
    },
  })

  const assignMutation = useMutation({
    mutationFn: (agentId: string) => addAgentToNamespace(token, agentId, namespaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents", namespaceId] })
      queryClient.invalidateQueries({ queryKey: ["agents-all"] })
      toast({ title: "Agent assigned to namespace" })
      setSelectedAgentId("")
      setAssignOpen(false)
    },
    onError: (err) => {
      toast({ title: "Failed to assign agent", description: err instanceof Error ? err.message : "Unknown", variant: "destructive" })
    },
  })

  const unassignMutation = useMutation({
    mutationFn: (agentId: string) => removeAgentFromNamespace(token, agentId, namespaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents", namespaceId] })
      queryClient.invalidateQueries({ queryKey: ["agents-all"] })
      toast({ title: "Agent removed from namespace" })
    },
    onError: (err) => {
      toast({ title: "Failed to remove agent", description: err instanceof Error ? err.message : "Unknown", variant: "destructive" })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (agentId: string) => deleteAgent(token, namespaceId, agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents", namespaceId] })
      queryClient.invalidateQueries({ queryKey: ["agents-all"] })
      toast({ title: "Agent deleted" })
    },
    onError: (err) => {
      toast({ title: "Failed to delete agent", description: err instanceof Error ? err.message : "Unknown", variant: "destructive" })
    },
  })

  const rotateMutation = useMutation({
    mutationFn: (agentId: string) => rotateAgentKey(token, namespaceId, agentId),
    onSuccess: (result) => {
      if (result.apiKey) {
        setNewKey(result.apiKey)
        setKeyModalOpen(true)
      }
    },
    onError: (err) => {
      toast({ title: "Failed to rotate key", description: err instanceof Error ? err.message : "Unknown", variant: "destructive" })
    },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns: any[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }: { row: { original: Agent } }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }: { row: { original: Agent } }) => (
        <span className="text-sm text-muted-foreground">{row.original.description ?? "—"}</span>
      ),
    },
    {
      accessorKey: "namespaceIds",
      header: "Namespaces",
      cell: ({ row }: { row: { original: Agent } }) => (
        <span className="text-sm text-muted-foreground">{row.original.namespaceIds?.length ?? 0} namespace(s)</span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }: { row: { original: Agent } }) =>
        new Date(row.original.createdAt).toLocaleDateString(),
    },
    {
      id: "actions",
      cell: ({ row }: { row: { original: Agent } }) => (
        <div className="flex items-center gap-2">
          <ConfirmDialog
            title="Rotate API Key"
            description="This will invalidate the current key immediately. The new key will be shown once."
            onConfirm={() => rotateMutation.mutateAsync(row.original.id).then(() => {})}
            isLoading={rotateMutation.isPending}
            trigger={
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-1" />Rotate Key
              </Button>
            }
          />
          <ConfirmDialog
            title="Remove from Namespace"
            description={`Remove "${row.original.name}" from this namespace? The agent itself won't be deleted.`}
            onConfirm={() => unassignMutation.mutateAsync(row.original.id)}
            isLoading={unassignMutation.isPending}
            trigger={
              <Button variant="outline" size="sm">
                <Unlink className="h-4 w-4" />
              </Button>
            }
          />
          <ConfirmDialog
            title="Delete Agent"
            description={`Permanently delete "${row.original.name}"? This removes it from ALL namespaces.`}
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
      <div className="flex justify-end gap-2">
        {/* Assign existing agent */}
        <Dialog open={assignOpen} onOpenChange={(open) => { setAssignOpen(open); if (!open) setSelectedAgentId("") }}>
          <DialogTrigger>
            <Button variant="outline"><Link2 className="h-4 w-4 mr-2" />Assign Existing</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Existing Agent</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {assignableAgents.length === 0 ? (
                <p className="text-sm text-muted-foreground">All your agents are already in this namespace.</p>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Agent</Label>
                    <Select value={selectedAgentId} onValueChange={(v) => setSelectedAgentId(v ?? "")}>
                      <SelectTrigger><SelectValue placeholder="Select an agent..." /></SelectTrigger>
                      <SelectContent>
                        {assignableAgents.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}{a.description ? ` — ${a.description}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    className="w-full"
                    disabled={!selectedAgentId || assignMutation.isPending}
                    onClick={() => assignMutation.mutate(selectedAgentId)}
                  >
                    {assignMutation.isPending ? "Assigning..." : "Assign to Namespace"}
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Create new agent */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger><Button><Plus className="h-4 w-4 mr-2" />New Agent</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Agent</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input {...register("name")} />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea {...register("description")} />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Agent"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable columns={columns} data={agents} isLoading={isLoading} />

      {/* API Key reveal modal */}
      <Dialog open={keyModalOpen} onOpenChange={setKeyModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-destructive font-medium">
              ⚠️ Save this key — it won&apos;t be shown again.
            </p>
            {newKey && <CopyInput value={newKey} />}
            <Button className="w-full" onClick={() => setKeyModalOpen(false)}>
              I&apos;ve saved the key
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ——— MEMBERS TAB ———

function MembersTab({ namespaceId, token }: { namespaceId: string; token: string }) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [addOpen, setAddOpen] = useState(false)

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["members", namespaceId],
    queryFn: () => getMembers(token, namespaceId),
  })

  const addSchema = z.object({
    userId: z.string().uuid("Must be a valid user UUID"),
    role: z.string(),
  })
  type AddForm = z.infer<typeof addSchema>

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<AddForm>({
    resolver: zodResolver(addSchema),
    defaultValues: { role: "1" },
  })
  const roleVal = watch("role")

  const addMutation = useMutation({
    mutationFn: (data: AddForm) => addMember(token, namespaceId, data.userId, Number(data.role)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", namespaceId] })
      toast({ title: "Member added" })
      reset()
      setAddOpen(false)
    },
    onError: (err) => {
      toast({ title: "Failed to add member", description: err instanceof Error ? err.message : "Unknown", variant: "destructive" })
    },
  })

  const updateRoleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: number }) =>
      updateMemberRole(token, namespaceId, memberId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", namespaceId] })
      toast({ title: "Role updated" })
    },
  })

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => removeMember(token, namespaceId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", namespaceId] })
      toast({ title: "Member removed" })
    },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns: any[] = [
    {
      id: "avatar",
      cell: ({ row }: { row: { original: Member } }) => {
        const initials = row.original.userId.slice(0, 2).toUpperCase()
        return (
          <Avatar className="h-8 w-8">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        )
      },
    },
    {
      accessorKey: "userId",
      header: "User ID",
      cell: ({ row }: { row: { original: Member } }) => <span className="font-mono text-sm">{row.original.userId}</span>,
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }: { row: { original: Member } }) => (
        <Badge variant="secondary">{NAMESPACE_ROLE_LABELS[row.original.role] ?? "Unknown"}</Badge>
      ),
    },
    {
      id: "actions",
      cell: ({ row }: { row: { original: Member } }) => (
        <div className="flex items-center gap-2">
          <Select
            defaultValue={String(row.original.role)}
            onValueChange={(v) => updateRoleMutation.mutate({ memberId: row.original.userId, role: Number(v ?? "1") })}
          >
            <SelectTrigger className="w-28 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Reader</SelectItem>
              <SelectItem value="2">Writer</SelectItem>
              <SelectItem value="3">Admin</SelectItem>
            </SelectContent>
          </Select>
          <ConfirmDialog
            title="Remove Member"
            description="Remove this member from the namespace?"
            onConfirm={() => removeMutation.mutateAsync(row.original.userId)}
            isLoading={removeMutation.isPending}
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
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger><Button><Plus className="h-4 w-4 mr-2" />Add Member</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Member</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit((d) => addMutation.mutate(d))} className="space-y-4">
              <div className="space-y-2">
                <Label>User ID</Label>
                <Input placeholder="user-uuid" {...register("userId")} />
                {errors.userId && <p className="text-sm text-destructive">{errors.userId.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={roleVal} onValueChange={(v) => setValue("role", v ?? "1")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Reader</SelectItem>
                    <SelectItem value="2">Writer</SelectItem>
                    <SelectItem value="3">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={addMutation.isPending}>
                {addMutation.isPending ? "Adding..." : "Add Member"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <DataTable columns={columns} data={members} isLoading={isLoading} />
    </div>
  )
}

// ——— MAIN PAGE ———

export default function NamespaceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const { data: session } = useSession()

  const { data: namespace, isLoading } = useQuery({
    queryKey: ["namespace", slug],
    queryFn: () => getNamespaceBySlug(session!.accessToken, slug),
    enabled: !!session?.accessToken,
  })

  if (isLoading) {
    return <div className="text-muted-foreground">Loading namespace...</div>
  }

  if (!namespace) {
    return <div className="text-destructive">Namespace not found.</div>
  }

  const token = session!.accessToken
  const userId = session?.userId ?? ""

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">{namespace.displayName}</h1>
          <Badge variant={namespace.isPublic ? "default" : "secondary"}>
            {namespace.isPublic ? "Public" : "Private"}
          </Badge>
        </div>
        <p className="text-muted-foreground font-mono text-sm mt-1">{namespace.slug}</p>
        {namespace.description && (
          <p className="text-muted-foreground mt-2">{namespace.description}</p>
        )}
      </div>

      <Tabs defaultValue="memories">
        <TabsList>
          <TabsTrigger value="memories">Memories</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
        </TabsList>
        <TabsContent value="memories" className="mt-6">
          <MemoriesTab namespaceId={namespace.id} token={token} />
        </TabsContent>
        <TabsContent value="agents" className="mt-6">
          <AgentsTab namespaceId={namespace.id} token={token} userId={userId} />
        </TabsContent>
        <TabsContent value="members" className="mt-6">
          <MembersTab namespaceId={namespace.id} token={token} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
