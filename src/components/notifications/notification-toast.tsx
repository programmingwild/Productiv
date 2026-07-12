"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useLanguage } from "@/contexts/language"

interface ToastItem {
  id: string
  title: string
  message: string
  icon: string
  link: string | null
}

export function NotificationToast({ userId, teamId }: { userId: string; teamId: string }) {
  const { t } = useLanguage()
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const t = timersRef.current.get(id)
    if (t) { clearTimeout(t); timersRef.current.delete(id) }
  }, [])

  useEffect(() => {
    const client = supabase
    if (!client) return

    const chanName = `toast-notifications-${userId}-${Math.random().toString(36).slice(2, 8)}`
    let active = true

    try {
      const channel = client
        .channel(chanName)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `userId=eq.${userId}` },
          (payload) => {
            if (!active) return
            const raw = payload.new as Record<string, unknown>
            const item: ToastItem = {
              id: raw.id as string,
              title: raw.title as string,
              message: raw.message as string,
              icon: (raw.icon as string) ?? "🔔",
              link: raw.link as string | null,
            }
            setToasts((prev) => [item, ...prev].slice(0, 3))
            const timer = setTimeout(() => removeToast(item.id), 5000)
            timersRef.current.set(item.id, timer)
          },
        )
        .subscribe()

      return () => { active = false; try { client.removeChannel(channel) } catch {} }
    } catch { return () => {} }
  }, [userId, removeToast])

  useEffect(() => {
    const client = supabase
    if (!client) return

    const chanName = `toast-activities-${teamId}-${Math.random().toString(36).slice(2, 8)}`
    let active = true

    try {
      const channel = client
        .channel(chanName)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "activities", filter: `teamId=eq.${teamId}` },
          (payload) => {
            if (!active) return
            const raw = payload.new as Record<string, unknown>
            const item: ToastItem = {
              id: raw.id as string,
              title: t("New activity"),
              message: (raw.action as string).replace(/_/g, " "),
              icon: "📡",
              link: "/activity",
            }
            setToasts((prev) => [item, ...prev].slice(0, 3))
            const timer = setTimeout(() => removeToast(item.id), 5000)
            timersRef.current.set(item.id, timer)
          },
        )
        .subscribe()

      return () => { active = false; try { client.removeChannel(channel) } catch {} }
    } catch { return () => {} }
  }, [teamId, removeToast])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="animate-slide-up flex items-start gap-3 px-4 py-3 cursor-pointer transition-all hover:translate-x-1"
          style={{
            background: "var(--nb-surface)",
            border: "3px solid var(--nb-border)",
            boxShadow: "6px 6px 0 var(--nb-shadow)",
          }}
          onClick={() => {
            removeToast(toast.id)
            if (toast.link) window.location.href = toast.link
          }}
        >
          <span className="text-lg shrink-0">{toast.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black truncate" style={{ color: "var(--nb-text)" }}>{toast.title}</p>
            <p className="text-xs font-bold truncate" style={{ color: "var(--nb-text-soft)" }}>{toast.message}</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); removeToast(toast.id) }}
            className="text-xs shrink-0"
            style={{ background: "none", border: "none", color: "var(--nb-text-soft)", cursor: "pointer" }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
