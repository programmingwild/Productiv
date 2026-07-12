"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRealtimeSubscription } from "./use-realtime"

export interface ActivityData {
  id: string
  userId: string
  teamId: string
  action: string
  metadata: Record<string, string> | null
  read: boolean
  user: { id: string; name: string; image: string | null } | null
  task: { id: string; title: string } | null
  createdAt: string
}

interface RawActivity {
  id: string
  userId: string
  teamId: string
  action: string
  metadata: Record<string, string> | null
  read: boolean
  createdAt: string
}

const userCache = new Map<string, { id: string; name: string; image: string | null }>()

async function enrichUser(activity: RawActivity): Promise<ActivityData> {
  let user = userCache.get(activity.userId)
  if (!user) {
    try {
      const res = await fetch(`/api/users/${activity.userId}/minimal`)
      if (res.ok) {
        user = await res.json() as { id: string; name: string; image: string | null }
        userCache.set(activity.userId, user)
      }
    } catch (e) { console.error("Enrich user failed:", e) }
  }
  return { ...activity, user: user ?? null, task: null }
}

export function useActivities(teamId: string) {
  const [activities, setActivities] = useState<ActivityData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const pendingRef = useRef(false)

  const fetchActivities = useCallback(async () => {
    try {
      setError("")
      const res = await fetch("/api/activities")
      if (!res.ok) throw new Error("Failed to fetch activities")
      const data = await res.json()
      for (const a of data) {
        if (a.user) userCache.set(a.userId, a.user)
      }
      setActivities(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load activities")
      setActivities([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchActivities()
    const interval = setInterval(fetchActivities, 10000)
    return () => clearInterval(interval)
  }, [fetchActivities])

  useRealtimeSubscription<RawActivity>(
    "activities",
    teamId,
    async (payload) => {
      if (pendingRef.current) return
      pendingRef.current = true
      const enriched = await enrichUser(payload)
      pendingRef.current = false
      setActivities((prev) => [enriched, ...prev.filter((a) => a.id !== payload.id)])
    },
    (payload) => {
      setActivities((prev) => prev.map((a) => a.id === payload.id ? { ...a, ...payload } : a))
    },
    (payload) => {
      setActivities((prev) => prev.filter((a) => a.id !== payload.id))
    },
  )

  const toggleRead = useCallback(async (id: string) => {
    let newRead = false
    setActivities((prev) => {
      const a = prev.find((x) => x.id === id)
      newRead = a ? !a.read : false
      return prev.map((x) => x.id === id ? { ...x, read: newRead } : x)
    })
    try {
      const res = await fetch("/api/activities", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityId: id, read: newRead }),
      })
      if (!res.ok) throw new Error("Failed to update")
    } catch (e) {
      console.error("Toggle read failed:", e)
      setActivities((prev) => prev.map((x) => x.id === id ? { ...x, read: !newRead } : x))
    }
  }, [])

  const deleteActivity = useCallback(async (id: string) => {
    const prev = activities
    setActivities((prev) => prev.filter((a) => a.id !== id))
    try {
      const res = await fetch("/api/activities", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityId: id }),
      })
      if (!res.ok) throw new Error("Failed to delete")
    } catch (e) {
      console.error("Delete activity failed:", e)
      setActivities(prev)
    }
  }, [activities])

  const clearAll = useCallback(async () => {
    const prev = activities
    setActivities([])
    try {
      const res = await fetch("/api/activities", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (!res.ok) throw new Error("Failed to clear")
    } catch (e) {
      console.error("Delete activity failed:", e)
      setActivities(prev)
    }
  }, [activities])

  return {
    activities,
    loading,
    error,
    toggleRead,
    deleteActivity,
    clearAll,
  }
}
