"use client"

import { useState, useEffect, useRef } from "react"
import { useLanguage } from "@/contexts/language"
import { useRealtimeSubscription } from "@/hooks/use-realtime"
import { supabase } from "@/lib/supabase"

interface ActivityItem {
  id: string
  userId: string
  teamId: string
  action: string
  metadata: Record<string, unknown> | null
  read: boolean
  createdAt: string
  user: { id: string; name: string; image: string | null } | null
  task: { id: string; title: string } | null
}

const actionConfig: Record<string, { icon: string; label: string; color: string }> = {
  task_created: { icon: "✨", label: "created task", color: "#4ecdc4" },
  task_updated: { icon: "✏️", label: "updated task", color: "#f7d44a" },
  task_deleted: { icon: "🗑️", label: "deleted task", color: "#e85d75" },
  task_moved: { icon: "↪️", label: "moved task", color: "#60a5fa" },
  task_assigned: { icon: "👤", label: "assigned task", color: "#a78bfa" },
  comment_added: { icon: "💬", label: "commented", color: "#34d399" },
  project_created: { icon: "📁", label: "created project", color: "#fbbf24" },
  project_updated: { icon: "🔄", label: "updated project", color: "#f59e0b" },
  project_deleted: { icon: "❌", label: "deleted project", color: "#ef4444" },
  sprint_created: { icon: "🏃", label: "created sprint", color: "#6366f1" },
  task_added_to_sprint: { icon: "📋", label: "added to sprint", color: "#8b5cf6" },
  task_removed_from_sprint: { icon: "🚫", label: "removed from sprint", color: "#a78bfa" },
  member_joined: { icon: "👋", label: "joined", color: "#22c55e" },
  member_removed: { icon: "🚪", label: "removed member", color: "#f87171" },
  member_role_changed: { icon: "⭐", label: "role changed", color: "#eab308" },
  time_started: { icon: "⏱️", label: "started timer", color: "#14b8a6" },
  time_stopped: { icon: "⏹️", label: "stopped timer", color: "#0d9488" },
  time_logged: { icon: "📝", label: "logged time", color: "#2dd4bf" },
  attachment_added: { icon: "📎", label: "added attachment", color: "#f472b6" },
  attachment_removed: { icon: "✂️", label: "removed attachment", color: "#fb7185" },
}

const colors = ["#f7d44a", "#4ecdc4", "#e85d75", "#a8e6cf", "#ff8c42", "#6c5ce7", "#fd79a8", "#00cec9", "#e17055", "#0984e3"]

function colorFromName(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function timeAgo(dateStr: string, t: (key: string, params?: Record<string, string | number>) => string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return t("just now")
  if (mins < 60) return t("{mins}m ago", { mins })
  const hours = Math.floor(mins / 60)
  if (hours < 24) return t("{hours}h ago", { hours })
  const days = Math.floor(hours / 24)
  if (days < 7) return t("{days}d ago", { days })
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function formatAction(action: string, task: { id: string; title: string } | null, metadata: Record<string, unknown> | null, t: (key: string, params?: Record<string, string | number>) => string): string {
  const config = actionConfig[action]
  if (config) {
    if (action === "member_joined" || action === "member_removed") {
      const target = (metadata as { target?: string })?.target ?? ""
      return target ? t("Team: {target}", { target }) : t("the team")
    }
    if (action === "task_assigned") {
      const target = (metadata as { target?: string })?.target ?? ""
      return target ? `${task?.title ?? t("task")} to ${target}` : (task?.title ?? t("task"))
    }
    if (action === "task_moved") {
      const from = (metadata as { from?: string })?.from ?? ""
      const to = (metadata as { to?: string })?.to ?? ""
      return `${task?.title ?? t("task")} from "${from}" to "${to}"`
    }
    if (action === "time_started" || action === "time_stopped" || action === "time_logged") {
      return task?.title ?? t("a task")
    }
    return task?.title ?? ""
  }
  return action
}

function getGroup(dateStr: string, t: (key: string, params?: Record<string, string | number>) => string): string {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return t("Today")
  if (date.toDateString() === yesterday.toDateString()) return t("Yesterday")

  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)
  if (date >= weekAgo) return t("This Week")

  const monthAgo = new Date(today)
  monthAgo.setMonth(monthAgo.getMonth() - 1)
  if (date >= monthAgo) return t("This Month")

  return t("Older")
}

export function ActivityClient({ initialActivities, teamId }: { initialActivities: ActivityItem[]; teamId: string }) {
  const { t } = useLanguage()
  const [activities, setActivities] = useState<ActivityItem[]>(initialActivities)
  const [filter, setFilter] = useState<string | null>(null)
  const [newIds, setNewIds] = useState<Set<string>>(new Set())
  const feedRef = useRef<HTMLDivElement>(null)

  const actionTypes = [...new Set(activities.map((a) => a.action))]
  const grouped = activities
    .filter((a) => !filter || a.action === filter)
    .reduce<Record<string, ActivityItem[]>>((acc, a) => {
      const group = getGroup(a.createdAt, t)
      if (!acc[group]) acc[group] = []
      acc[group].push(a)
      return acc
    }, {})

  const groupOrder = ["Today", "Yesterday", "This Week", "This Month", "Older"]

  useRealtimeSubscription<Record<string, unknown>>(
    "activities",
    teamId,
    (payload) => {
      const enriched: ActivityItem = {
        id: payload.id as string,
        userId: payload.userId as string,
        teamId: payload.teamId as string,
        action: payload.action as string,
        metadata: payload.metadata as Record<string, unknown> | null,
        read: payload.read as boolean,
        createdAt: payload.created_at as string ?? payload.createdAt as string,
        user: null,
        task: null,
      }
      setNewIds((prev) => new Set(prev).add(enriched.id))
      setTimeout(() => setNewIds((prev) => { const next = new Set(prev); next.delete(enriched.id); return next }), 2000)
      setActivities((prev) => [enriched, ...prev])
    },
    (payload) => {
      setActivities((prev) => prev.map((a) => a.id === payload.id ? { ...a, ...payload } : a))
    },
    (payload) => {
      setActivities((prev) => prev.filter((a) => a.id !== payload.id))
    },
  )

  useEffect(() => {
    const client = supabase
    if (!client) return
    const chanName = `activity-users-${teamId}-${Math.random().toString(36).slice(2, 8)}`
    let active = true
    try {
      const channel = client
        .channel(chanName)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "activities", filter: `teamId=eq.${teamId}` },
          async (payload) => {
            if (!active) return
            const raw = payload.new as Record<string, unknown>
            const uid = raw.userId as string
            try {
              const res = await fetch(`/api/users/${uid}/minimal`)
              if (res.ok) {
                const user = await res.json()
                setActivities((prev) => prev.map((a) => a.userId === uid && !a.user ? { ...a, user } : a))
              }
            } catch {}
          },
        )
        .subscribe()
      return () => { active = false; try { client.removeChannel(channel) } catch {} }
    } catch { return () => {} }
  }, [teamId])

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-black tracking-tight" style={{ color: "var(--nb-text)" }}>📡 {t("Activity Feed")}</h1>
        <p className="text-sm font-bold mt-1" style={{ color: "var(--nb-text-soft)" }}>
          {t("Everything happening across your workspace — in real time")}
          <span className="ml-2 text-xs" style={{ color: "#4ecdc4" }}>{t("● Live")}</span>
        </p>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 flex-wrap">
        <button
          onClick={() => setFilter(null)}
          className="px-3 py-1.5 text-xs font-black transition-all whitespace-nowrap"
          style={{
            background: !filter ? "var(--nb-border)" : "var(--nb-surface)",
            border: "2px solid var(--nb-border)",
            color: !filter ? "white" : "var(--nb-text)",
            boxShadow: !filter ? "3px 3px 0 var(--nb-shadow)" : "none",
          }}
        >
          {t("All ({n})", { n: activities.length })}
        </button>
        {actionTypes.slice(0, 12).map((action) => {
          const cfg = actionConfig[action]
          const count = activities.filter((a) => a.action === action).length
          return (
            <button
              key={action}
              onClick={() => setFilter(filter === action ? null : action)}
              className="px-3 py-1.5 text-xs font-black transition-all whitespace-nowrap"
              style={{
                background: filter === action ? (cfg?.color ?? "var(--nb-border)") : "var(--nb-surface)",
                border: "2px solid var(--nb-border)",
                color: filter === action ? "#1a1a1a" : "var(--nb-text)",
                boxShadow: filter === action ? "3px 3px 0 var(--nb-shadow)" : "none",
              }}
            >
              {cfg?.icon ?? "•"} {t(cfg?.label ?? action)} ({count})
            </button>
          )
        })}
      </div>

      {/* Activity stream */}
      <div ref={feedRef} className="space-y-8">
        {groupOrder.map((group) => {
          const items = grouped[group]
          if (!items || items.length === 0) return null
          return (
            <div key={group}>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-6 w-1 rounded-full" style={{ background: group === "Today" ? "#4ecdc4" : "var(--nb-text-soft)" }} />
                <h2 className="text-sm font-black" style={{ color: group === "Today" ? "#4ecdc4" : "var(--nb-text)" }}>
                  {group}
                </h2>
                <div className="flex-1 h-px" style={{ background: "var(--nb-border)" }} />
              </div>

              <div className="space-y-1">
                {items.map((a, i) => {
                  const cfg = actionConfig[a.action]
                  const isNew = newIds.has(a.id)
                  return (
                    <div
                      key={a.id}
                      className="group flex items-start gap-4 p-3 rounded-lg transition-all"
                      style={{
                        background: isNew ? "color-mix(in srgb, #4ecdc4 8%, transparent)" : i % 2 === 0 ? "color-mix(in srgb, var(--nb-text) 2%, transparent)" : "transparent",
                        opacity: a.read ? 0.6 : 1,
                      }}
                    >
                      {/* Timeline dot line */}
                      <div className="flex flex-col items-center shrink-0" style={{ width: 20 }}>
                        <div
                          className="w-3 h-3 rounded-full border-2"
                          style={{
                            background: cfg?.color ?? "var(--nb-text-soft)",
                            borderColor: "var(--nb-border)",
                          }}
                        />
                        {i < items.length - 1 && (
                          <div className="w-px flex-1 mt-1" style={{ background: "color-mix(in srgb, var(--nb-border) 40%, transparent)" }} />
                        )}
                      </div>

                      {/* User avatar */}
                      <div
                        className="flex h-9 w-9 items-center justify-center text-xs font-black shrink-0"
                        style={{
                          background: a.user ? colorFromName(a.user.name ?? "") : "var(--nb-text-soft)",
                          border: "2px solid var(--nb-border)",
                          color: "#1a1a1a",
                        }}
                      >
                        {a.user?.name?.[0]?.toUpperCase() ?? "?"}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className="text-sm font-bold leading-snug" style={{ color: "var(--nb-text)" }}>
                          <span className="font-black">{a.user?.name ?? t("Someone")}</span>
                          <span className="font-bold" style={{ color: "var(--nb-text-soft)" }}>
                            {" "}{t(cfg?.label ?? a.action)}{" "}
                          </span>
                          <span>{formatAction(a.action, a.task, a.metadata, t)}</span>
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {cfg && (
                            <span className="text-xs" title={a.action}>{cfg.icon}</span>
                          )}
                          <span className="text-[11px] font-bold" style={{ color: "var(--nb-text-soft)" }}>
                            {timeAgo(a.createdAt, t)}
                          </span>
                          {a.task && (
                            <>
                              <span className="text-[10px]" style={{ color: "var(--nb-text-soft)" }}>·</span>
                              <span className="text-[11px] font-bold truncate max-w-[200px]" style={{ color: "var(--nb-text-soft)" }}>
                                {a.task.title}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Actions on hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 flex gap-1">
                        <button
                          onClick={async () => {
                            await fetch("/api/activities", {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ activityId: a.id, read: !a.read }),
                            })
                            setActivities((prev) => prev.map((x) => x.id === a.id ? { ...x, read: !x.read } : x))
                          }}
                          className="text-[10px] font-black px-2 py-1 rounded"
                          style={{ background: "var(--nb-surface)", border: "1.5px solid var(--nb-border)", color: "var(--nb-text)" }}
                        >
                          {a.read ? t("Unread") : t("Read")}
                        </button>
                        <button
                          onClick={async () => {
                            await fetch("/api/activities", {
                              method: "DELETE",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ activityId: a.id }),
                            })
                            setActivities((prev) => prev.filter((x) => x.id !== a.id))
                          }}
                          className="text-[10px] font-black px-2 py-1 rounded"
                          style={{ background: "#e85d75", border: "1.5px solid var(--nb-border)", color: "white" }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {Object.keys(grouped).length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">📡</div>
            <p className="text-lg font-black" style={{ color: "var(--nb-text)" }}>{t("No activity yet")}</p>
            <p className="text-sm font-bold mt-2" style={{ color: "var(--nb-text-soft)" }}>
              {t("Create tasks, projects, and sprints to see them here")}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
