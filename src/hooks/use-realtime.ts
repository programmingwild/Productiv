"use client"

import { useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"

function useRealtimeChannel<T extends object>(
  channelName: string,
  table: string,
  filterKey: string,
  filterValue: string,
  onInsert: (payload: T) => void,
  onUpdate?: (payload: T) => void,
  onDelete?: (payload: T) => void,
) {
  const stableInsert = useRef(onInsert)
  const stableUpdate = useRef(onUpdate)
  const stableDelete = useRef(onDelete)

  useEffect(() => { stableInsert.current = onInsert }, [onInsert])
  useEffect(() => { stableUpdate.current = onUpdate }, [onUpdate])
  useEffect(() => { stableDelete.current = onDelete }, [onDelete])

  useEffect(() => {
    const client = supabase
    if (!client) return

    const chanName = `${channelName}-${Math.random().toString(36).slice(2, 8)}`
    let active = true

    try {
      const channel = client
        .channel(chanName)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table, filter: `${filterKey}=eq.${filterValue}` },
          (payload) => { if (active) stableInsert.current(payload.new as T) },
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table, filter: `${filterKey}=eq.${filterValue}` },
          (payload) => { if (active) stableUpdate.current?.(payload.new as T) },
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table, filter: `${filterKey}=eq.${filterValue}` },
          (payload) => { if (active) stableDelete.current?.(payload.old as T) },
        )
        .subscribe()

      return () => {
        active = false
        try { client.removeChannel(channel) } catch (e) { console.error("Remove channel failed:", e) }
      }
    } catch (e) {
      console.error("Channel setup failed:", e)
      return () => { active = false }
    }
  }, [channelName, table, filterKey, filterValue])
}

export function useRealtimeSubscription<T extends object>(
  table: string,
  teamId: string,
  onInsert: (payload: T) => void,
  onUpdate?: (payload: T) => void,
  onDelete?: (payload: T) => void,
) {
  useRealtimeChannel(`realtime-team-${table}-${teamId}`, table, "teamId", teamId, onInsert, onUpdate, onDelete)
}

export function useRealtimeUserSubscription<T extends object>(
  table: string,
  userId: string,
  onInsert: (payload: T) => void,
  onUpdate?: (payload: T) => void,
  onDelete?: (payload: T) => void,
) {
  useRealtimeChannel(`realtime-user-${table}-${userId}`, table, "userId", userId, onInsert, onUpdate, onDelete)
}
