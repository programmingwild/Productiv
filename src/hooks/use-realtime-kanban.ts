"use client"

import { useEffect, useRef, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import type { BoardData, Task } from "@/types/kanban"

export function useRealtimeKanban(
  board: BoardData,
  teamId: string,
  onBoardUpdate: (board: BoardData) => void,
) {
  const stableBoard = useRef(board)
  const stableUpdate = useRef(onBoardUpdate)

  useEffect(() => { stableBoard.current = board }, [board])
  useEffect(() => { stableUpdate.current = onBoardUpdate }, [onBoardUpdate])

  const handleTaskChange = useCallback((task: Task, type: "INSERT" | "UPDATE" | "DELETE") => {
    const current = stableBoard.current
    const next = structuredClone(current)

    if (type === "DELETE") {
      for (const col of next.columns) {
        const idx = col.tasks.findIndex((t) => t.id === task.id)
        if (idx !== -1) {
          col.tasks.splice(idx, 1)
          col.tasks.forEach((t, i) => (t.position = i))
          break
        }
      }
      stableUpdate.current(next)
      return
    }

    if (type === "INSERT") {
      for (const col of next.columns) {
        if (col.id === task.columnId) {
          const exists = col.tasks.find((t) => t.id === task.id)
          if (!exists) {
            col.tasks.push(task)
            col.tasks.sort((a, b) => a.position - b.position)
          }
          break
        }
      }
      stableUpdate.current(next)
      return
    }

    if (type === "UPDATE") {
      for (const col of next.columns) {
        const idx = col.tasks.findIndex((t) => t.id === task.id)
        if (idx !== -1) {
          if (col.id !== task.columnId) {
            col.tasks.splice(idx, 1)
            col.tasks.forEach((t, i) => (t.position = i))
          } else {
            col.tasks[idx] = { ...col.tasks[idx], ...task }
            col.tasks.sort((a, b) => a.position - b.position)
          }
          break
        }
      }
      stableUpdate.current(next)
    }
  }, [])

  useEffect(() => {
    const client = supabase
    if (!client) return

    const channel = client
      .channel("realtime-kanban")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "tasks", filter: `teamId=eq.${teamId}` },
        (payload) => handleTaskChange(payload.new as Task, "INSERT"),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tasks", filter: `teamId=eq.${teamId}` },
        (payload) => handleTaskChange(payload.new as Task, "UPDATE"),
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "tasks", filter: `teamId=eq.${teamId}` },
        (payload) => handleTaskChange(payload.old as Task, "DELETE"),
      )
      .subscribe()

    return () => { client.removeChannel(channel) }
  }, [teamId, handleTaskChange])
}
