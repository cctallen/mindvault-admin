export interface Secret {
  id: string
  namespaceId: string
  name: string
  description?: string
  createdAt: string
  updatedAt?: string
}

export interface SecretReveal {
  id: string
  name: string
  description?: string
  value: string
}

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  user?: User
}

export interface Namespace {
  id: string
  slug: string
  displayName: string
  description: string
  isPublic: boolean
  ownerId: string
  createdAt: string
}

export interface Agent {
  id: string
  name: string
  description: string
  apiKey?: string
  namespaceIds: string[]
  createdAt: string
}

export interface Memory {
  id: string
  namespaceId: string
  agentId?: string
  content: string
  type: MemoryType
  visibility: MemoryVisibility
  source?: string
  metadata?: Record<string, string>
  expiresAt?: string
  createdAt: string
}

export interface MemoryAccessLog {
  id: string
  namespaceId: string
  memoryId?: string
  agentId: string
  agentName: string
  operation: string  // "Get" | "List" | "Search"
  query?: string
  recordCount: number
  accessedAt: string
}

export interface Member {
  userId: string
  email: string
  fullName: string
  role: NamespaceRole
  roleName?: string
  joinedAt?: string
}

export interface AppUser {
  id: string
  email: string
  firstName: string
  lastName: string
  fullName: string
  createdAt: string
}

export interface PagedResult<T> {
  items: T[]
  total: number
  totalCount?: number // alias — some endpoints return total, some totalCount
  page: number
  pageSize: number
}

export enum MemoryType {
  Fact = 0,
  Preference = 1,
  Event = 2,
  Context = 3,
  Instruction = 4,
  Summary = 5,
}

export enum MemoryVisibility {
  Public = 0,
  Private = 1,
}

export enum NamespaceRole {
  Reader = 1,
  Writer = 2,
  Admin = 3,
}

export const MEMORY_TYPE_LABELS: Record<number, string> = {
  0: "Fact",
  1: "Preference",
  2: "Event",
  3: "Context",
  4: "Instruction",
  5: "Summary",
}

export const MEMORY_VISIBILITY_LABELS: Record<number, string> = {
  0: "Public",
  1: "Private",
}

export const NAMESPACE_ROLE_LABELS: Record<number, string> = {
  1: "Reader",
  2: "Writer",
  3: "Admin",
}
