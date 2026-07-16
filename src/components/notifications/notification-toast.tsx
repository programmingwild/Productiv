"use client"

import { useState, useEffect, useRef, useCallback } from "react"
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
  const seenIds = useRef<Set<string>>(new Set())

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const t = timersRef.current.get(id)
    if (t) { clearTimeout(t); timersRef.current.delete(id) }
  }, [])

  useEffect(() => {
    async function checkNotifications() {
      try {
        const res = await fetch("/api/notifications")
        if (!res.ok) return
        const { notifications } = await res.json()
        if (notifications.length > 0) {
          const newItems = notifications.filter((n: Record<string, unknown>) => !seenIds.current.has(n.id as string))
          for (const raw of newItems) {
            seenIds.current.add(raw.id as string)
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
          }
        }
      } catch {}
    }
    checkNotifications()
    const interval = setInterval(checkNotifications, 15000)
    return () => clearInterval(interval)
  }, [removeToast])

  useEffect(() => {
    async function checkActivities() {
      try {
        const res = await fetch("/api/activities")
        if (!res.ok) return
        const activities = await res.json()
        if (activities.length > 0) {
          const newItems = activities.filter((a: Record<string, unknown>) => !seenIds.current.has(a.id as string))
          for (const raw of newItems) {
            seenIds.current.add(raw.id as string)
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
          }
        }
      } catch {}
    }
    checkActivities()
    const interval = setInterval(checkActivities, 15000)
    return () => clearInterval(interval)
  }, [removeToast])

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
