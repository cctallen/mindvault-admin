import type {
  AuthTokens,
  Namespace,
  PagedResult,
  Memory,
  Agent,
  Member,
} from "@/lib/types"

// Server-side: hit the API directly (with self-signed cert bypass via proxy route)
// Client-side (browser): route through /api/proxy to avoid mixed-content + cert issues
const BASE_URL =
  typeof window === "undefined"
    ? process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://3.129.106.237:5228"
    : "/api/proxy"

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`API error ${res.status}: ${text}`)
  }

  if (res.status === 204) return undefined as unknown as T

  return res.json() as Promise<T>
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` }
}

// Auth
export async function login(
  email: string,
  password: string
): Promise<AuthTokens> {
  return apiFetch<AuthTokens>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
}

export async function register(data: {
  email: string
  password: string
  firstName: string
  lastName: string
}): Promise<void> {
  return apiFetch<void>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

// Namespaces
export async function getNamespaces(
  token: string,
  page = 1,
  pageSize = 20
): Promise<PagedResult<Namespace>> {
  return apiFetch<PagedResult<Namespace>>(
    `/api/namespaces?page=${page}&pageSize=${pageSize}`,
    { headers: authHeaders(token) }
  )
}

export async function createNamespace(
  token: string,
  data: {
    slug: string
    displayName: string
    description: string
    isPublic: boolean
    ownerId: string
  }
): Promise<Namespace> {
  return apiFetch<Namespace>("/api/namespaces", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  })
}

export async function deleteNamespace(
  token: string,
  id: string
): Promise<void> {
  return apiFetch<void>(`/api/namespaces/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  })
}

export async function getNamespaceBySlug(
  token: string,
  slug: string
): Promise<Namespace> {
  return apiFetch<Namespace>(`/api/namespaces/${slug}`, {
    headers: authHeaders(token),
  })
}

// Memories
export async function getMemories(
  token: string,
  namespaceId: string,
  params?: {
    page?: number
    pageSize?: number
    agentId?: string
    since?: string
  }
): Promise<PagedResult<Memory>> {
  const q = new URLSearchParams()
  if (params?.page) q.set("page", String(params.page))
  if (params?.pageSize) q.set("pageSize", String(params.pageSize))
  if (params?.agentId) q.set("agentId", params.agentId)
  if (params?.since) q.set("since", params.since)
  const qs = q.toString() ? `?${q.toString()}` : ""
  return apiFetch<PagedResult<Memory>>(
    `/api/namespaces/${namespaceId}/memories${qs}`,
    { headers: authHeaders(token) }
  )
}

export async function searchMemories(
  token: string,
  namespaceId: string,
  q: string,
  topK = 10
): Promise<Memory[]> {
  return apiFetch<Memory[]>(
    `/api/namespaces/${namespaceId}/memories/search?q=${encodeURIComponent(q)}&topK=${topK}`,
    { headers: authHeaders(token) }
  )
}

export async function createMemory(
  token: string,
  namespaceId: string,
  data: {
    content: string
    type: number
    visibility: number
    source?: string
    expiresAt?: string
  }
): Promise<Memory> {
  return apiFetch<Memory>(`/api/namespaces/${namespaceId}/memories`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  })
}

export async function deleteMemory(
  token: string,
  namespaceId: string,
  memoryId: string
): Promise<void> {
  return apiFetch<void>(
    `/api/namespaces/${namespaceId}/memories/${memoryId}`,
    {
      method: "DELETE",
      headers: authHeaders(token),
    }
  )
}

// Agents
export async function createAgent(
  token: string,
  namespaceId: string,
  data: { namespaceId: string; name: string; description: string; requesterId: string }
): Promise<Agent> {
  return apiFetch<Agent>(`/api/namespaces/${namespaceId}/agents`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  })
}

export async function rotateAgentKey(
  token: string,
  namespaceId: string,
  agentId: string
): Promise<Agent> {
  return apiFetch<Agent>(
    `/api/namespaces/${namespaceId}/agents/${agentId}/rotate-key`,
    {
      method: "POST",
      headers: authHeaders(token),
    }
  )
}

// Members
export async function getMembers(
  token: string,
  namespaceId: string
): Promise<Member[]> {
  return apiFetch<Member[]>(`/api/namespaces/${namespaceId}/members`, {
    headers: authHeaders(token),
  })
}

export async function addMember(
  token: string,
  namespaceId: string,
  userId: string,
  role: number
): Promise<Member> {
  return apiFetch<Member>(`/api/namespaces/${namespaceId}/members`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ userId, role: Number(role) }),
  })
}

export async function updateMemberRole(
  token: string,
  namespaceId: string,
  memberId: string,
  role: number
): Promise<void> {
  return apiFetch<void>(
    `/api/namespaces/${namespaceId}/members/${memberId}`,
    {
      method: "PUT",
      headers: authHeaders(token),
      body: JSON.stringify({ role }),
    }
  )
}

export async function removeMember(
  token: string,
  namespaceId: string,
  memberId: string
): Promise<void> {
  return apiFetch<void>(
    `/api/namespaces/${namespaceId}/members/${memberId}`,
    {
      method: "DELETE",
      headers: authHeaders(token),
    }
  )
}
