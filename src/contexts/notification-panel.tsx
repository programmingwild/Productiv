"use client"

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react"
import { useRealtimeUserSubscription } from "@/hooks/use-realtime"

export interface NotificationData {
  id: string
  userId: string
  teamId: string
  app: string
  icon: string
  title: string
  message: string
  read: boolean
  replied: boolean
  reaction: string | null
  link: string | null
  createdAt: string
}

function playNotificationSound() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.4)
    osc.onended = () => ctx.close()
  } catch (e) { console.error("Notification sound failed:", e) }
}

function tryBrowserNotification(title: string, body: string) {
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body, icon: "/icon.svg" })
  }
}

interface PanelContextValue {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
  notifications: NotificationData[]
  unreadCount: number
  loading: boolean
  error: string
  toggleRead: (id: string) => Promise<void>
  deleteNotification: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
  clearAll: () => Promise<void>
  addReaction: (id: string, reaction: string) => Promise<void>
  handleReply: (id: string) => Promise<void>
}

const PanelContext = createContext<PanelContextValue>(null as unknown as PanelContextValue)

export function NotificationPanelProvider({ children, userId }: { children: ReactNode; userId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const initialLoadDone = useRef(false)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((prev) => !prev), [])

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission()
    }
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {})
    }
  }, [])

  const fetchNotifications = useCallback(async () => {
    try {
      setError("")
      const res = await fetch("/api/notifications")
      if (!res.ok) throw new Error("Failed to fetch notifications")
      const data = await res.json()
      setNotifications((prev) => {
        if (initialLoadDone.current) {
          const existingIds = new Set(prev.map((n) => n.id))
          const merged = [...prev]
          for (const n of data.notifications) {
            if (!existingIds.has(n.id)) merged.push(n)
          }
          merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          return merged
        }
        return data.notifications
      })
      initialLoadDone.current = true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load notifications")
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 10000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  useRealtimeUserSubscription<NotificationData>(
    "notifications",
    userId,
    (payload) => {
      setNotifications((prev) => {
        if (prev.find((n) => n.id === payload.id)) return prev
        playNotificationSound()
        tryBrowserNotification(payload.title, payload.message)
        if (typeof navigator !== "undefined") navigator.vibrate?.(200)
        return [payload, ...prev]
      })
    },
    (payload) => {
      setNotifications((prev) => prev.map((n) => n.id === payload.id ? { ...n, ...payload } : n))
    },
    (payload) => {
      setNotifications((prev) => prev.filter((n) => n.id !== payload.id))
    },
  )

  const toggleRead = useCallback(async (id: string) => {
    let newRead: boolean | null = null
    setNotifications((prev) => {
      const n = prev.find((x) => x.id === id)
      newRead = n ? !n.read : false
      return prev.map((x) => x.id === id ? { ...x, read: newRead! } : x)
    })
    try {
      const res = await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notificationId: id, read: newRead }) })
      if (!res.ok) throw new Error("Failed to update")
    } catch {
      setNotifications((prev) => prev.map((x) => x.id === id ? { ...x, read: !newRead } : x))
    }
  }, [])

  const deleteNotification = useCallback(async (id: string) => {
    const prev = notifications
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    try {
      const res = await fetch("/api/notifications", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notificationId: id }) })
      if (!res.ok) throw new Error("Failed to delete")
    } catch {
      setNotifications(prev)
    }
  }, [notifications])

  const markAllRead = useCallback(async () => {
    const prev = notifications
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    try {
      const res = await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ read: true }) })
      if (!res.ok) throw new Error("Failed to update")
    } catch {
      setNotifications(prev)
    }
  }, [notifications])

  const clearAll = useCallback(async () => {
    const prev = notifications
    setNotifications([])
    try {
      const res = await fetch("/api/notifications", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) })
      if (!res.ok) throw new Error("Failed to clear")
    } catch {
      setNotifications(prev)
    }
  }, [notifications])

  const addReaction = useCallback(async (id: string, reaction: string) => {
    const prev = notifications
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, reaction, message: n.message + ` ${reaction}` } : n))
    try {
      const res = await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notificationId: id, reaction }) })
      if (!res.ok) throw new Error("Failed to add reaction")
    } catch {
      setNotifications(prev)
    }
  }, [notifications])

  const handleReply = useCallback(async (id: string) => {
    const prev = notifications
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, replied: true } : n))
    try {
      const res = await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notificationId: id, reply: true }) })
      if (!res.ok) throw new Error("Failed to send reply")
    } catch {
      setNotifications(prev)
    }
  }, [notifications])

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <PanelContext.Provider value={{ isOpen, open, close, toggle, notifications, unreadCount, loading, error, toggleRead, deleteNotification, markAllRead, clearAll, addReaction, handleReply }}>
      {children}
    </PanelContext.Provider>
  )
}

export function useNotificationPanel() {
  return useContext(PanelContext)
}
