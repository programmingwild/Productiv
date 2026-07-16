"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useLanguage } from "@/contexts/language"

interface TimeEntry {
  id: string
  startTime: string
  endTime: string | null
  duration: number | null
  notes: string | null
  user: { id: string; name: string | null; image: string | null }
}

interface Props {
  taskId: string
  teamId: string
}

function fmt(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export function TimeTracker({ taskId, teamId }: Props) {
  const { t } = useLanguage()
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [starting, setStarting] = useState(false)
  const [runningId, setRunningId] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [logDuration, setLogDuration] = useState("")
  const [logNotes, setLogNotes] = useState("")
  const [logging, setLogging] = useState(false)
  const stableTaskId = useRef(taskId)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => { stableTaskId.current = taskId }, [taskId])

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/time`)
      if (!res.ok) throw new Error(t("Failed to load"))
      const data: TimeEntry[] = await res.json()
      setEntries(data)
      const running = data.find((e) => !e.endTime)
      if (running) {
        setRunningId(running.id)
        setElapsed(Math.round((Date.now() - new Date(running.startTime).getTime()) / 1000))
      } else {
        setRunningId(null)
        setElapsed(0)
      }
    } catch {
      setError(t("Failed to load time entries"))
    } finally {
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    fetchEntries()
    const interval = setInterval(fetchEntries, 15000)
    return () => clearInterval(interval)
  }, [fetchEntries])

  useEffect(() => {
    if (runningId) {
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1)
      }, 1000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [runningId])

  async function startTimer() {
    setStarting(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}/time`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? t("Failed to start timer"))
        return
      }
      await fetchEntries()
      setError("")
    } catch {
      setError(t("Failed to start timer"))
    } finally {
      setStarting(false)
    }
  }

  async function stopTimer() {
    if (!runningId) return
    try {
      const res = await fetch(`/api/tasks/${taskId}/time/${runningId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      })
      if (!res.ok) throw new Error(t("Failed to stop"))
      await fetchEntries()
      setError("")
    } catch {
      setError(t("Failed to stop timer"))
    }
  }

  async function logTime(e: React.FormEvent) {
    e.preventDefault()
    const duration = parseInt(logDuration, 10)
    if (isNaN(duration) || duration <= 0) return
    setLogging(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}/time`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "log", duration, notes: logNotes || null }),
      })
      if (!res.ok) throw new Error(t("Failed to log time"))
      await fetchEntries()
      setLogDuration("")
      setLogNotes("")
      setError("")
    } catch {
      setError(t("Failed to log time"))
    } finally {
      setLogging(false)
    }
  }

  const totalSeconds = entries.reduce((sum, e) => sum + (e.duration ?? 0), 0)

  return (
    <div className="pt-3 mt-3" style={{ borderTop: "2px solid var(--nb-border)" }}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-black uppercase" style={{ color: "var(--nb-text)" }}>
          {t("Time ({n})", { n: entries.length })}
        </h4>
        <span className="text-xs font-black" style={{ color: "#4ecdc4" }}>
          {t("Total: {time}", { time: fmt(totalSeconds) })}
        </span>
      </div>

      {error && <p className="text-xs font-bold mb-2" style={{ color: "#e85d75" }}>{error}</p>}

      {loading ? (
        <p className="text-xs font-bold" style={{ color: "var(--nb-text-soft)" }}>{t("Loading...")}</p>
      ) : (
        <div className="space-y-1.5 max-h-40 overflow-y-auto mb-3">
          {entries.length === 0 && (
            <p className="text-xs font-bold" style={{ color: "var(--nb-text-soft)" }}>{t("No time tracked yet")}</p>
          )}
          {entries.map((entry) => {
            const seconds = entry.duration ?? (entry.endTime
              ? Math.round((new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime()) / 1000)
              : elapsed)
            const isRunning = !entry.endTime
            return (
              <div key={entry.id} className="flex items-center gap-2 p-1.5" style={{ background: isRunning ? "rgba(78,205,196,0.08)" : "var(--nb-surface-soft)", border: "1.5px solid var(--nb-border)" }}>
                <span className="text-[10px] font-black shrink-0" style={{ color: "var(--nb-text-soft)" }}>
                  {entry.user.name ?? t("Unknown")}
                </span>
                <span className={`text-xs font-black shrink-0 ${isRunning ? "animate-pulse" : ""}`} style={{ color: isRunning ? "#4ecdc4" : "var(--nb-text)" }}>
                  {fmt(seconds)}{isRunning ? " ▶" : ""}
                </span>
                {entry.notes && <span className="text-[10px] font-semibold truncate" style={{ color: "var(--nb-text-soft)" }}>{entry.notes}</span>}
              </div>
            )
          })}
        </div>
      )}

      <div className="flex gap-2 mb-3">
        {runningId ? (
          <button onClick={stopTimer} className="nb-btn px-3 py-1.5 text-xs font-black" style={{ background: "#e85d75", border: "2px solid var(--nb-border)", color: "white" }}>
            ■ {t("Stop ({elapsed})", { elapsed: fmt(elapsed) })}
          </button>
        ) : (
          <button onClick={startTimer} disabled={starting} className="nb-btn-accent px-3 py-1.5 text-xs font-black">
            {starting ? "..." : "▶ " + t("Start Timer")}
          </button>
        )}
      </div>

      <form onSubmit={logTime} className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="block text-[10px] font-bold mb-0.5" style={{ color: "var(--nb-text-soft)" }}>
            {t("Log time (seconds)")}
          </label>
          <input
            type="number"
            min="1"
            placeholder={t("e.g. 3600")}
            value={logDuration}
            onChange={(e) => setLogDuration(e.target.value)}
            className="nb-input w-full px-2 py-1 text-xs"
          />
        </div>
        <div className="flex-1">
          <label className="block text-[10px] font-bold mb-0.5" style={{ color: "var(--nb-text-soft)" }}>
            {t("Notes")}
          </label>
          <input
            type="text"
            placeholder={t("Optional")}
            value={logNotes}
            onChange={(e) => setLogNotes(e.target.value)}
            className="nb-input w-full px-2 py-1 text-xs"
          />
        </div>
        <button type="submit" disabled={logging || !logDuration.trim()} className="nb-btn-primary px-3 py-1.5 text-xs font-black shrink-0" style={{ marginBottom: 0 }}>
          {logging ? "..." : t("Log")}
        </button>
      </form>
    </div>
  )
}
