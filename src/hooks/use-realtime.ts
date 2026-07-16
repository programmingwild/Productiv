"use client"

import { useEffect, useRef, useCallback } from "react"

function usePollingChannel<T extends object>(
  _channelName: string,
  _table: string,
  _filterKey: string,
  _filterValue: string,
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
}

export function useRealtimeSubscription<T extends object>(
  table: string,
  teamId: string,
  onInsert: (payload: T) => void,
  onUpdate?: (payload: T) => void,
  onDelete?: (payload: T) => void,
) {
  usePollingChannel(`realtime-team-${table}-${teamId}`, table, "teamId", teamId, onInsert, onUpdate, onDelete)
}

export function useRealtimeUserSubscription<T extends object>(
  table: string,
  userId: string,
  onInsert: (payload: T) => void,
  onUpdate?: (payload: T) => void,
  onDelete?: (payload: T) => void,
) {
  usePollingChannel(`realtime-user-${table}-${userId}`, table, "userId", userId, onInsert, onUpdate, onDelete)
}
