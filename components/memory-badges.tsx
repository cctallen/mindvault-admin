"use client"

import { Badge } from "@/components/ui/badge"
import { MEMORY_TYPE_LABELS, MEMORY_VISIBILITY_LABELS } from "@/lib/types"

const TYPE_COLORS: Record<number, string> = {
  0: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  1: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  2: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  3: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  4: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  5: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
}

export function MemoryTypeBadge({ type }: { type: number }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[type] ?? TYPE_COLORS[0]}`}
    >
      {MEMORY_TYPE_LABELS[type] ?? "Unknown"}
    </span>
  )
}

export function VisibilityBadge({ visibility }: { visibility: number }) {
  return (
    <Badge variant={visibility === 0 ? "default" : "secondary"}>
      {MEMORY_VISIBILITY_LABELS[visibility] ?? "Unknown"}
    </Badge>
  )
}
