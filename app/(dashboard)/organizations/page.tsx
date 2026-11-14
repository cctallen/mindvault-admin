"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getOrganizations, createOrganization, updateOrganization, deleteOrganization,
  getOrgMembers, addOrgMember, updateOrgMemberRole, removeOrgMember,
  getOrgNamespaces, attachNamespaceToOrg, detachNamespaceFromOrg,
  getNamespaces,
} from "@/lib/api"
import type { Organization, OrgMember, OrgNamespace } from "@/lib/types"
import { OrgRole, ORG_ROLE_LABELS } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Building2, Users, Database, Pencil, Trash2, UserPlus, Unlink, Link2 } from "lucide-react"

// ─── Org Card ─────────────────────────────────────────────────────────────────
function OrgCard({
  org,
  token,
  currentUserId,
  onEdit,
  onDelete,
}: {
  org: Organization
  token: string
  currentUserId: string
  onEdit: (org: Organization) => void
  onDelete: (org: Organization) => void
}) {
  const [tab, setTab] = useState("members")
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const isOwner = org.ownerId === currentUserId

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ["org-members", org.id],
    queryFn: () => getOrgMembers(token, org.id),
  })

  const { data: namespaces = [], isLoading: nsLoading } = useQuery({
    queryKey: ["org-namespaces", org.id],
    queryFn: () => getOrgNamespaces(token, org.id),
  })

  const { data: allNamespacesResult } = useQuery({
    queryKey: ["namespaces"],
    queryFn: () => getNamespaces(token),
  })
  const allNamespaces = allNamespacesResult?.items ?? []

  const attachableNamespaces = allNamespaces.filter(
    (ns: { id: string }) => !namespaces.some((on) => on.id === ns.id)
  )

  const [addMemberOpen, setAddMemberOpen] = useState(false)
  const [memberEmail, setMemberEmail] = useState("")
  const [memberRole, setMemberRole] = useState<OrgRole>(OrgRole.Member)
  const [attachNsId, setAttachNsId] = useState("")
  const [attachOpen, setAttachOpen] = useState(false)

  const addMemberMutation = useMutation({
    mutationFn: () => addOrgMember(token, org.id, { email: memberEmail, role: memberRole }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-members", org.id] })
      toast({ title: "Member added" })
      setMemberEmail(""); setAddMemberOpen(false)
    },
    onError: (err) => toast({ title: "Failed", description: err instanceof Error ? err.message : "Unknown", variant: "destructive" }),
  })

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: OrgRole }) =>
      updateOrgMemberRole(token, org.id, userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-members", org.id] })
      toast({ title: "Role updated" })
    },
  })

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => removeOrgMember(token, org.id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-members", org.id] })
      toast({ title: "Member removed" })
    },
  })

  const attachMutation = useMutation({
    mutationFn: (nsId: string) => attachNamespaceToOrg(token, org.id, nsId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-namespaces", org.id] })
      toast({ title: "Namespace attached" })
      setAttachNsId(""); setAttachOpen(false)
    },
    onError: (err) => toast({ title: "Failed", description: err instanceof Error ? err.message : "Unknown", variant: "destructive" }),
  })

  const detachMutation = useMutation({
    mutationFn: (nsId: string) => detachNamespaceFromOrg(token, org.id, nsId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-namespaces", org.id] })
      toast({ title: "Namespace detached" })
    },
  })

  const roleColor: Record<OrgRole, string> = {
    [OrgRole.Owner]: "bg-purple-100 text-purple-700",
    [OrgRole.Admin]: "bg-indigo-100 text-indigo-700",
    [OrgRole.Member]: "bg-slate-100 text-slate-700",
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-lg truncate">{org.displayName}</CardTitle>
              <CardDescription className="font-mono text-xs">{org.slug}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="secondary">{org.memberCount} member{org.memberCount !== 1 ? "s" : ""}</Badge>
            {isOwner && (
              <>
                <Button variant="outline" size="sm" onClick={() => onEdit(org)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <ConfirmDialog
                  title="Delete Organization"
                  description={`Permanently delete "${org.displayName}"? All namespaces will be detached.`}
                  onConfirm={() => onDelete(org)}
                  trigger={<Button variant="destructive" size="sm"><Trash2 className="h-4 w-4" /></Button>}
                />
              </>
            )}
          </div>
        </div>
        {org.description && <p className="text-sm text-muted-foreground mt-1">{org.description}</p>}
      </CardHeader>

      <CardContent>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="members"><Users className="h-4 w-4 mr-1.5" />Members</TabsTrigger>
            <TabsTrigger value="namespaces"><Database className="h-4 w-4 mr-1.5" />Namespaces</TabsTrigger>
          </TabsList>

          {/* Members tab */}
          <TabsContent value="members" className="space-y-3">
            <div className="flex justify-end">
              <Dialog open={addMemberOpen} onOpenChange={(o) => { setAddMemberOpen(o); if (!o) setMemberEmail("") }}>
                <DialogTrigger>
                  <Button size="sm" variant="outline"><UserPlus className="h-4 w-4 mr-1.5" />Add Member</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Member</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Email address</Label>
                      <Input
                        type="email"
                        placeholder="user@example.com"
                        value={memberEmail}
                        onChange={(e) => setMemberEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select value={String(memberRole)} onValueChange={(v) => setMemberRole(Number(v) as OrgRole)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Member — can access all org namespaces</SelectItem>
                          <SelectItem value="2">Admin — can manage members and namespaces</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      className="w-full"
                      disabled={!memberEmail || addMemberMutation.isPending}
                      onClick={() => addMemberMutation.mutate()}
                    >
                      {addMemberMutation.isPending ? "Adding..." : "Add Member"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {membersLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : members.length === 0 ? (
              <p className="text-sm text-muted-foreground">No members yet.</p>
            ) : (
              <div className="divide-y rounded-lg border overflow-hidden">
                {members.map((m) => (
                  <div key={m.userId} className="flex items-center justify-between gap-3 px-4 py-2.5 bg-background">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{m.fullName || m.email}</p>
                      <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {m.role === OrgRole.Owner ? (
                        <Badge className={roleColor[OrgRole.Owner]}>Owner</Badge>
                      ) : (
                        <Select
                          value={String(m.role)}
                          onValueChange={(v) => updateRoleMutation.mutate({ userId: m.userId, role: Number(v) as OrgRole })}
                          disabled={!isOwner && m.role === OrgRole.Admin}
                        >
                          <SelectTrigger className={`h-7 text-xs w-24 font-medium border-0 ${roleColor[m.role]}`}>
                            <SelectValue>{ORG_ROLE_LABELS[m.role]}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Member</SelectItem>
                            <SelectItem value="2">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      {m.role !== OrgRole.Owner && (m.userId === currentUserId || isOwner) && (
                        <ConfirmDialog
                          title="Remove Member"
                          description={`Remove ${m.email} from this organization?`}
                          onConfirm={() => removeMemberMutation.mutateAsync(m.userId)}
                          trigger={<Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Namespaces tab */}
          <TabsContent value="namespaces" className="space-y-3">
            <div className="flex justify-end">
              <Dialog open={attachOpen} onOpenChange={(o) => { setAttachOpen(o); if (!o) setAttachNsId("") }}>
                <DialogTrigger>
                  <Button size="sm" variant="outline"><Link2 className="h-4 w-4 mr-1.5" />Attach Namespace</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Attach Namespace</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    {attachableNamespaces.length === 0 ? (
                      <p className="text-sm text-muted-foreground">All your namespaces are already attached to this org.</p>
                    ) : (
                      <>
                        <Select value={attachNsId} onValueChange={(v) => setAttachNsId(v ?? "")}>
                          <SelectTrigger><SelectValue placeholder="Select a namespace..." /></SelectTrigger>
                          <SelectContent>
                            {attachableNamespaces.map((ns: { id: string; displayName: string; slug: string }) => (
                              <SelectItem key={ns.id} value={ns.id}>{ns.displayName} <span className="text-muted-foreground ml-1">({ns.slug})</span></SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          className="w-full"
                          disabled={!attachNsId || attachMutation.isPending}
                          onClick={() => attachMutation.mutate(attachNsId)}
                        >
                          {attachMutation.isPending ? "Attaching..." : "Attach"}
                        </Button>
                      </>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {nsLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : namespaces.length === 0 ? (
              <p className="text-sm text-muted-foreground">No namespaces attached yet.</p>
            ) : (
              <div className="divide-y rounded-lg border overflow-hidden">
                {namespaces.map((ns) => (
                  <div key={ns.id} className="flex items-center justify-between gap-3 px-4 py-2.5 bg-background">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{ns.displayName}</p>
                      <p className="font-mono text-xs text-muted-foreground">{ns.slug}</p>
                    </div>
                    <ConfirmDialog
                      title="Detach Namespace"
                      description={`Detach "${ns.displayName}" from this org? The namespace itself won't be deleted.`}
                      onConfirm={() => detachMutation.mutateAsync(ns.id)}
                      trigger={<Button variant="ghost" size="sm" title="Detach"><Unlink className="h-3.5 w-3.5" /></Button>}
                    />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function OrganizationsPage() {
  const { data: session } = useSession()
  const token = session?.accessToken ?? ""
  const currentUserId = session?.userId ?? ""
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [createOpen, setCreateOpen] = useState(false)
  const [editOrg, setEditOrg] = useState<Organization | null>(null)
  const [form, setForm] = useState({ slug: "", displayName: "", description: "" })
  const [editForm, setEditForm] = useState({ displayName: "", description: "" })

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ["organizations"],
    queryFn: () => getOrganizations(token),
    enabled: !!token,
  })

  const createMutation = useMutation({
    mutationFn: () => createOrganization(token, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] })
      toast({ title: "Organization created" })
      setForm({ slug: "", displayName: "", description: "" })
      setCreateOpen(false)
    },
    onError: (err) => toast({ title: "Failed to create", description: err instanceof Error ? err.message : "Unknown", variant: "destructive" }),
  })

  const updateMutation = useMutation({
    mutationFn: () => updateOrganization(token, editOrg!.id, editForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] })
      toast({ title: "Organization updated" })
      setEditOrg(null)
    },
    onError: (err) => toast({ title: "Failed to update", description: err instanceof Error ? err.message : "Unknown", variant: "destructive" }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteOrganization(token, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] })
      toast({ title: "Organization deleted" })
    },
    onError: (err) => toast({ title: "Failed to delete", description: err instanceof Error ? err.message : "Unknown", variant: "destructive" }),
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Organizations</h1>
          <p className="text-muted-foreground mt-1">Group namespaces and share access across your team.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger>
            <Button><Plus className="h-4 w-4 mr-2" />New Organization</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Organization</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input
                  placeholder="Acme AI"
                  value={form.displayName}
                  onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Slug <span className="text-muted-foreground text-xs">(lowercase, hyphens only)</span></Label>
                <Input
                  placeholder="acme-ai"
                  value={form.slug}
                  onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Textarea
                  placeholder="What does this org do?"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                />
              </div>
              <Button
                className="w-full"
                disabled={!form.slug || !form.displayName || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending ? "Creating..." : "Create Organization"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* List */}
      {isLoading ? (
        <p className="text-muted-foreground">Loading organizations...</p>
      ) : orgs.length === 0 ? (
        <div className="text-center py-16 border rounded-xl bg-muted/30">
          <Building2 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold text-lg mb-1">No organizations yet</h3>
          <p className="text-muted-foreground text-sm mb-4">Create one to start grouping namespaces and sharing access with your team.</p>
          <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />New Organization</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {orgs.map((org) => (
            <OrgCard
              key={org.id}
              org={org}
              token={token}
              currentUserId={currentUserId}
              onEdit={(o) => { setEditOrg(o); setEditForm({ displayName: o.displayName, description: o.description ?? "" }) }}
              onDelete={(o) => deleteMutation.mutate(o.id)}
            />
          ))}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={editOrg !== null} onOpenChange={(o) => { if (!o) setEditOrg(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Organization</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input
                value={editForm.displayName}
                onChange={(e) => setEditForm((p) => ({ ...p, displayName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                rows={2}
                value={editForm.description}
                onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditOrg(null)}>Cancel</Button>
              <Button
                className="flex-1"
                disabled={!editForm.displayName || updateMutation.isPending}
                onClick={() => updateMutation.mutate()}
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
