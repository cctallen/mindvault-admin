"use client"

import { toast as toastManager } from "@/components/ui/toast"

interface ToastOptions {
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

export function useToast() {
  const toast = (options: ToastOptions) => {
    const type = options.variant === "destructive" ? "error" : "success"
    toastManager.add({
      title: options.title,
      description: options.description,
      type,
    })
  }

  return { toast }
}
