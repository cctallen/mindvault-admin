"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { getAllAgents, getNamespaces, addAgentToNamespace, removeAgentFromNamespace, deleteAgent } from "@/lib/api"
import type { Agent, Namespace } from "@/lib/types"
import { DataTable } from "@/components/data-table"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { CopyInput } from "@/components/copy-input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Trash2, Plus, Link, Unlink } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function AgentsPage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [assignAgent, setAssignAgent] = useState<Agent | null>(null)
  const [selectedNs, setSelectedNs] = useState("")

  const token = session?.accessToken ?? ""

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["agents-all"],
    queryFn: () => getAllAgents(token),
    enabled: !!token,
  })

  const { data: namespacesData } = useQuery({
    queryKey: ["namespaces"],
    queryFn: () => getNamespaces(token),
    enabled: !!token,
  })
  const namespaces: Namespace[] = namespacesData?.items ?? []

  const assignMutation = useMutation({
    mutationFn: ({ agentId, nsId }: { agentId: string; nsId: string }) =>
      addAgentToNamespace(token, agentId, nsId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents-all"] })
      toast({ title: "Agent assigned to namespace" })
      setAssignAgent(null)
      setSelectedNs("")
    },
    onError: (err) => {
      toast({ title: "Failed to assign", description: err instanceof Error ? err.message : "Unknown", variant: "destructive" })
    },
  })

  const unassignMutation = useMutation({
    mutationFn: ({ agentId, nsId }: { agentId: string; nsId: string }) =>
      removeAgentFromNamespace(token, agentId, nsId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents-all"] })
      toast({ title: "Agent removed from namespace" })
    },
    onError: (err) => {
      toast({ title: "Failed to remove", description: err instanceof Error ? err.message : "Unknown", variant: "destructive" })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (agentId: string) => deleteAgent(token, "", agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents-all"] })
      toast({ title: "Agent deleted" })
    },
    onError: (err) => {
      toast({ title: "Failed to delete", description: err instanceof Error ? err.message : "Unknown", variant: "destructive" })
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
        <span className="text-sm text-muted-foreground">{row.original.description || "—"}</span>
      ),
    },
    {
      accessorKey: "namespaceIds",
      header: "Namespaces",
      cell: ({ row }: { row: { original: Agent } }) => {
        const nsIds: string[] = row.original.namespaceIds ?? []
        if (nsIds.length === 0) return <span className="text-sm text-muted-foreground">None</span>
        return (
          <div className="flex flex-wrap gap-1">
            {nsIds.map((nsId) => {
              const ns = namespaces.find((n) => n.id === nsId)
              return (
                <Badge key={nsId} variant="secondary" className="flex items-center gap-1">
                  {ns?.slug ?? nsId.slice(0, 8)}
                  <button
                    className="ml-1 hover:text-destructive"
                    onClick={() => unassignMutation.mutate({ agentId: row.original.id, nsId })}
                    title="Remove from namespace"
                  >
                    <Unlink className="h-3 w-3" />
                  </button>
                </Badge>
              )
            })}
          </div>
        )
      },
    },
    {
      accessorKey: "id",
      header: "Agent ID",
      cell: ({ row }: { row: { original: Agent } }) => (
        <span className="font-mono text-xs text-muted-foreground">{row.original.id}</span>
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
          <Button variant="outline" size="sm" onClick={() => { setAssignAgent(row.original); setSelectedNs("") }}>
            <Link className="h-4 w-4 mr-1" />Assign
          </Button>
          <ConfirmDialog
            title="Delete Agent"
            description={`Delete agent "${row.original.name}"? This removes it from all namespaces.`}
            onConfirm={() => deleteMutation.mutateAsync(row.original.id)}
            isLoading={deleteMutation.isPending}
            trigger={
              <Button variant="destructive" size="sm"><Trash2 className="h-4 w-4" /></Button>
            }
          />
        </div>
      ),
    },
  ]

  // Namespaces not yet assigned to the selected agent
  const unassignedNamespaces = assignAgent
    ? namespaces.filter((ns) => !assignAgent.namespaceIds?.includes(ns.id))
    : []

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Agents</h1>
      <p className="text-muted-foreground">All agents across your namespaces. Use Assign to add an agent to additional namespaces.</p>

      <DataTable columns={columns} data={agents} isLoading={isLoading} />

      {/* Assign to namespace dialog */}
      <Dialog open={!!assignAgent} onOpenChange={(open) => { if (!open) setAssignAgent(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign &ldquo;{assignAgent?.name}&rdquo; to a Namespace</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {unassignedNamespaces.length === 0 ? (
              <p className="text-sm text-muted-foreground">This agent is already in all your namespaces.</p>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Namespace</Label>
                  <Select value={selectedNs} onValueChange={(v: string | null) => setSelectedNs(v ?? "")}>
                    <SelectTrigger><SelectValue placeholder="Select a namespace..." /></SelectTrigger>
                    <SelectContent>
                      {unassignedNamespaces.map((ns) => (
                        <SelectItem key={ns.id} value={ns.id}>{ns.displayName} ({ns.slug})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full"
                  disabled={!selectedNs || assignMutation.isPending}
                  onClick={() => assignAgent && assignMutation.mutate({ agentId: assignAgent.id, nsId: selectedNs })}
                >
                  {assignMutation.isPending ? "Assigning..." : "Assign to Namespace"}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
