"use client"

import { useState, useCallback, useEffect } from "react"
import { useRealtimeSubscription } from "@/hooks/use-realtime"
import { useLanguage } from "@/contexts/language"
import { supabase } from "@/lib/supabase"

interface SprintTask {
  id: string
  title: string
  priority: string
  position: number
  createdAt: string
  assignee: { id: string; name: string; image: string | null } | null
}

interface SprintData {
  id: string
  name: string
  goal: string | null
  startDate: string
  endDate: string
  status: string
  tasks: SprintTask[]
}

interface MemberData {
  id: string
  name: string
  image: string | null
  role: string
}

const daysLabels = ["Day 1", "Day 3", "Day 5", "Day 7", "Day 9", "Day 11", "Day 14"]
const priorityColor: Record<string, string> = {
  urgent: "#e85d75", high: "#f7d44a", medium: "#4ecdc4", low: "#999",
}

function computeBurndown(sprint: SprintData) {
  const totalPoints = sprint.tasks.length * 3
  const completedPoints = sprint.tasks.filter((t) => t.position >= 5).length * 3
  const sprintStart = new Date(sprint.startDate)
  const sprintEnd = new Date(sprint.endDate)
  const totalDays = Math.max(Math.ceil((sprintEnd.getTime() - sprintStart.getTime()) / 86400000), 1)
  const days: { day: number; remaining: number; ideal: number }[] = []
  for (let d = 0; d < Math.min(totalDays, 14); d += 2) {
    const dayDate = new Date(sprintStart)
    dayDate.setDate(dayDate.getDate() + d)
    const tasksDoneByDay = sprint.tasks.filter((t) => new Date(t.createdAt) <= dayDate).length * 3
    const remaining = Math.max(totalPoints - tasksDoneByDay, 0)
    const ideal = Math.max(totalPoints - (totalPoints / totalDays) * d, 0)
    days.push({ day: d + 1, remaining, ideal: Math.round(ideal) })
  }
  if (days.length === 0) {
    days.push({ day: 1, remaining: totalPoints, ideal: totalPoints })
  }
  return { totalPoints, completedPoints, days }
}

export function SprintsClient({
  sprints: initialSprints,
  unassignedTasks: initialUnassigned,
  members,
  teamId,
}: {
  sprints: SprintData[]
  unassignedTasks: SprintTask[]
  members: MemberData[]
  teamId: string
}) {
  const { t } = useLanguage()
  const [sprints, setSprints] = useState(initialSprints)
  const [unassignedTasks, setUnassignedTasks] = useState(initialUnassigned)
  const [activeIdx, setActiveIdx] = useState(sprints.length > 0 ? sprints.length - 1 : -1)
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [editSprint, setEditSprint] = useState<SprintData | null>(null)
  const [formName, setFormName] = useState("")
  const [formGoal, setFormGoal] = useState("")
  const [formStart, setFormStart] = useState("")
  const [formEnd, setFormEnd] = useState("")
  const [error, setError] = useState("")
  const sprint = activeIdx >= 0 ? sprints[activeIdx] : null
  const burndown = sprint ? computeBurndown(sprint) : null
  const completion = burndown && burndown.totalPoints > 0 ? Math.round((burndown.completedPoints / burndown.totalPoints) * 100) : 0
  const maxRemaining = burndown ? Math.max(...burndown.days.map((d) => d.remaining), 1) : 1
  const isOnTrack = burndown ? burndown.completedPoints >= Math.round(burndown.totalPoints * 0.5) : false

  const [aiSuggestions, setAiSuggestions] = useState("")
  const [aiLoading, setAiLoading] = useState(false)

  useRealtimeSubscription<SprintData>(
    "sprints",
    teamId,
    (payload) => {
      setSprints((prev) => {
        if (prev.find((s) => s.id === payload.id)) return prev
        return [...prev, { ...payload, tasks: payload.tasks ?? [] }]
      })
    },
    (payload) => {
      setSprints((prev) => prev.map((s) => s.id === payload.id ? { ...s, ...payload } : s))
    },
    (payload) => {
      setSprints((prev) => {
        const filtered = prev.filter((s) => s.id !== payload.id)
        if (activeIdx >= filtered.length) setActiveIdx(Math.max(0, filtered.length - 1))
        return filtered
      })
    },
  )

  useEffect(() => {
    const client = supabase
    if (!client) return
    const chanName = `sprint-tasks-${teamId}-${Math.random().toString(36).slice(2, 8)}`
    let active = true
    try {
      const channel = client
        .channel(chanName)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "tasks", filter: `teamId=eq.${teamId}` },
          (payload) => {
            if (!active) return
            const raw = payload.new as Record<string, unknown>
            const taskId = raw.id as string
            const newSprintId = raw.sprintId as string | null
            const taskData = { id: taskId, title: raw.title as string, priority: raw.priority as string ?? "none", position: raw.position as number ?? 0, createdAt: raw.created_at as string ?? raw.createdAt as string, assignee: raw.assignee as SprintTask["assignee"] ?? null }
            setSprints((prev) => {
              let changed = false
              const next = prev.map((s) => {
                if (s.id === newSprintId) {
                  if (!s.tasks.find((t) => t.id === taskId)) {
                    changed = true
                    return { ...s, tasks: [...s.tasks, taskData] }
                  }
                } else if (s.tasks.find((t) => t.id === taskId)) {
                  changed = true
                  return { ...s, tasks: s.tasks.filter((t) => t.id !== taskId) }
                }
                return s
              })
              if (changed) setUnassignedTasks((prev) => {
                if (newSprintId && prev.find((t) => t.id === taskId)) return prev.filter((t) => t.id !== taskId)
                if (!newSprintId && !prev.find((t) => t.id === taskId)) return [...prev, taskData]
                return prev
              })
              return changed ? next as SprintData[] : prev
            })
          },
        )
        .subscribe()
      return () => {
        active = false
        try { client.removeChannel(channel) } catch {}
      }
    } catch {
      return () => { active = false }
    }
  }, [teamId])

  const getAiSprintInsights = useCallback(async () => {
    if (!sprint) return
    setAiLoading(true)
    setAiSuggestions("")
    try {
      const backlogSummary = unassignedTasks.map((t) => `${t.title} (${t.priority})`).join(", ")
      const sprintSummary = sprint.tasks.map((t) => `${t.title} (${t.priority})`).join(", ")
      const res = await fetch("/api/sarvam/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: t("You are a sprint planning assistant. Give concise actionable sprint advice in 3-4 sentences. Use emojis.") },
            { role: "user", content: `Current sprint "${sprint.name}" has ${sprint.tasks.length} items (${burndown?.completedPoints}/${burndown?.totalPoints} pts done, ${completion}% complete). Unassigned backlog: ${backlogSummary || "none"}. Sprint items: ${sprintSummary || "none"}. Team members: ${members.map((m) => m.name).join(", ")}. What should we focus on?` },
          ],
        }),
      })
      const data = await res.json()
      setAiSuggestions(data.content ?? t("AI unavailable"))
    } catch {
      setAiSuggestions(t("Could not reach AI"))
    }
    setAiLoading(false)
  }, [sprint, unassignedTasks, members, burndown, completion])

  function resetForm() {
    setFormName("")
    setFormGoal("")
    setFormStart("")
    setFormEnd("")
    setError("")
  }

  async function handleCreate() {
    if (!formName.trim() || !formStart || !formEnd) {
      setError(t("Name, start date, and end date are required"))
      return
    }
    setError("")
    try {
      const res = await fetch("/api/sprints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName, goal: formGoal, startDate: formStart, endDate: formEnd }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? t("Failed to create")); return }
      setSprints((prev) => [...prev, { ...data, tasks: [] }])
      setActiveIdx(sprints.length)
      setShowCreate(false)
      resetForm()
    } catch { setError(t("Something went wrong")) }
  }

  async function handleUpdate() {
    if (!editSprint) return
    if (!formName.trim() || !formStart || !formEnd) {
      setError(t("Name, start date, and end date are required"))
      return
    }
    setError("")
    try {
      const res = await fetch(`/api/sprints/${editSprint.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName, goal: formGoal, startDate: formStart, endDate: formEnd }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? t("Failed to update")); return }
      setSprints((prev) => prev.map((s) => s.id === editSprint.id ? { ...s, ...data } : s))
      setShowEdit(false)
      setEditSprint(null)
      resetForm()
    } catch { setError(t("Something went wrong")) }
  }

  async function handleDelete(sprintId: string) {
    if (!confirm(t("Delete this sprint? Tasks will be unassigned."))) return
    try {
      const res = await fetch(`/api/sprints/${sprintId}`, { method: "DELETE" })
      if (!res.ok) return
      setSprints((prev) => prev.filter((s) => s.id !== sprintId))
      if (activeIdx >= sprints.length - 1) setActiveIdx(Math.max(0, sprints.length - 2))
    } catch (e) { console.error("Delete sprint failed:", e) }
  }

  async function handleStatus(sprintId: string, status: string) {
    try {
      const res = await fetch(`/api/sprints/${sprintId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) return
      setSprints((prev) => prev.map((s) => s.id === sprintId ? { ...s, status } : s))
    } catch (e) { console.error("Status change failed:", e) }
  }

  async function assignToSprint(taskId: string) {
    if (!sprint) return
    try {
      const res = await fetch(`/api/sprints/${sprint.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      })
      if (!res.ok) return
      const task = unassignedTasks.find((t) => t.id === taskId)
      if (task) {
        setUnassignedTasks((prev) => prev.filter((t) => t.id !== taskId))
        setSprints((prev) => prev.map((s) => s.id === sprint.id ? { ...s, tasks: [...s.tasks, task] } : s))
      }
    } catch (e) { console.error("Assign to sprint failed:", e) }
  }

  async function removeFromSprint(taskId: string) {
    if (!sprint) return
    try {
      const res = await fetch(`/api/sprints/${sprint.id}/tasks`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      })
      if (!res.ok) return
      const task = sprint.tasks.find((t) => t.id === taskId)
      if (task) {
        setSprints((prev) => prev.map((s) => s.id === sprint.id ? { ...s, tasks: s.tasks.filter((t) => t.id !== taskId) } : s))
        setUnassignedTasks((prev) => [...prev, task])
      }
    } catch (e) { console.error("Remove from sprint failed:", e) }
  }

  function openEdit(s: SprintData) {
    setEditSprint(s)
    setFormName(s.name)
    setFormGoal(s.goal ?? "")
    setFormStart(s.startDate.split("T")[0])
    setFormEnd(s.endDate.split("T")[0])
    setShowEdit(true)
    setError("")
  }

  return (
    <div className="p-6 space-y-8 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: "var(--nb-text)" }}>⚡ {t("Sprint Planning")}</h1>
          <p className="text-sm font-bold" style={{ color: "var(--nb-text-soft)" }}>{t("Plan, track, and deliver in 2-week cycles")}</p>
        </div>
        <button onClick={() => { resetForm(); setShowCreate(true) }} className="nb-btn-primary px-4 py-2 text-sm font-black" style={{ background: "var(--nb-border)", color: "white" }}>
          {t("+ New Sprint")}
        </button>
      </div>

      {error && (
        <div className="p-3 text-xs font-bold text-center" style={{ background: "#e85d75", border: "2px solid var(--nb-border)", color: "white" }}>
          {error}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {sprints.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setActiveIdx(i)}
            className="px-4 py-2 text-sm font-black transition-all"
            style={{
              background: i === activeIdx ? "var(--nb-border)" : "var(--nb-surface)",
              color: i === activeIdx ? "white" : "var(--nb-text)",
              border: "2.5px solid var(--nb-border)",
              boxShadow: i === activeIdx ? "4px 4px 0 var(--nb-shadow)" : "none",
            }}
          >
            {s.name}
          </button>
        ))}
        {sprints.length === 0 && (
          <p className="text-sm font-bold" style={{ color: "var(--nb-text-soft)" }}>{t("No sprints yet. Create one to get started.")}</p>
        )}
      </div>

      {sprint && burndown && (
        <>
          <div className="grid grid-cols-3 gap-5">
            <div className="nb-card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-black" style={{ color: "var(--nb-text)" }}>{sprint.name}</p>
                  <p className="text-xs font-bold mt-1" style={{ color: "var(--nb-text-soft)" }}>
                    {new Date(sprint.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} → {new Date(sprint.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                  {sprint.goal && <p className="text-xs font-bold mt-1" style={{ color: "var(--nb-text-soft)" }}>{sprint.goal}</p>}
                </div>
                <div className="flex gap-1">
                  <a href={`/api/export/sprint?sprintId=${sprint.id}`} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-black" style={{ border: "2px solid var(--nb-border)", color: "var(--nb-text)", textDecoration: "none" }}>⬇ {t("CSV")}</a>
                  <button onClick={() => openEdit(sprint)} className="text-xs px-2 py-1" style={{ border: "2px solid var(--nb-border)", color: "var(--nb-text)" }}>✎</button>
                  <button onClick={() => handleDelete(sprint.id)} className="text-xs px-2 py-1" style={{ border: "2px solid var(--nb-border)", color: "#e85d75" }}>✕</button>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span>{t("Status:")} <span className="font-black">{sprint.status}</span></span>
                  <span>{burndown.completedPoints} / {burndown.totalPoints} {t("pts")}</span>
                </div>
                <div className="flex gap-2 mt-2">
                  {sprint.status === "PLANNING" && (
                    <button onClick={() => handleStatus(sprint.id, "ACTIVE")} className="text-xs font-black px-3 py-1" style={{ background: "#4ecdc4", border: "2px solid var(--nb-border)", color: "#1a1a1a" }}>{t("Start Sprint")}</button>
                  )}
                  {sprint.status === "ACTIVE" && (
                    <button onClick={() => handleStatus(sprint.id, "COMPLETED")} className="text-xs font-black px-3 py-1" style={{ background: "#f7d44a", border: "2px solid var(--nb-border)", color: "#1a1a1a" }}>{t("Complete")}</button>
                  )}
                  {(sprint.status === "PLANNING" || sprint.status === "ACTIVE") && (
                    <button onClick={() => handleStatus(sprint.id, "CANCELLED")} className="text-xs font-black px-3 py-1" style={{ background: "#e85d75", border: "2px solid var(--nb-border)", color: "white" }}>{t("Cancel")}</button>
                  )}
                </div>
              </div>
            </div>

            <div className="nb-card p-5">
              <p className="text-sm font-black mb-3" style={{ color: "var(--nb-text)" }}>📊 {t("Velocity")}</p>
              <p className="text-3xl font-black" style={{ color: "#4ecdc4" }}>
                {Math.round(sprints.filter((s) => s.tasks.some((t) => t.position >= 5)).reduce((sum, s) => sum + s.tasks.filter((t) => t.position >= 5).length * 3, 0) / Math.max(sprints.filter((s) => s.tasks.some((t) => t.position >= 5)).length, 1))}
              </p>
              <p className="text-xs font-bold" style={{ color: "var(--nb-text-soft)" }}>{t("Avg points / sprint")}</p>
            </div>

            <div className="nb-card p-5">
              <p className="text-sm font-black mb-3" style={{ color: "var(--nb-text)" }}>📋 {t("Sprint Backlog")}</p>
              <p className="text-3xl font-black" style={{ color: "#e85d75" }}>{burndown.totalPoints}</p>
              <p className="text-xs font-bold" style={{ color: "var(--nb-text-soft)" }}>{t("Points in current sprint")}</p>
              <p className="text-xs font-bold mt-2" style={{ color: "var(--nb-text-soft)" }}>{t("{n} items", { n: sprint.tasks.length })}</p>
            </div>
          </div>

          <div className="nb-card p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-black" style={{ color: "var(--nb-text)" }}>📉 {t("Burndown Chart")}</p>
            </div>
            <div className="relative" style={{ minHeight: 220 }}>
              <svg viewBox="0 0 600 195" className="w-full" style={{ minHeight: 195 }} preserveAspectRatio="xMidYMid meet">
                {[0, 25, 50, 75, 100].map((pct) => {
                  const y = 165 - (pct / 100) * 140
                  return (
                    <g key={pct}>
                      <line x1="50" y1={y} x2="575" y2={y} stroke="var(--nb-text-soft)" strokeOpacity="0.15" strokeWidth="1" />
                      <text x="45" y={y + 3} textAnchor="end" fontSize="9" fontWeight="bold" fill="var(--nb-text-soft)">
                        {Math.round((pct / 100) * maxRemaining)}
                      </text>
                    </g>
                  )
                })}
                {burndown.days.map((d, i) => {
                  const x = 50 + (i / Math.max(burndown.days.length - 1, 1)) * 525
                  return (
                    <text key={d.day} x={x} y="185" textAnchor="middle" fontSize="9" fontWeight="bold" fill="var(--nb-text-soft)">
                      {t(daysLabels[i]) ?? t("Day {day}", { day: d.day })}
                    </text>
                  )
                })}
                <polyline
                  points={burndown.days.map((d, i) => { const x = 50 + (i / Math.max(burndown.days.length - 1, 1)) * 525; const y = 165 - (d.ideal / maxRemaining) * 140; return `${x},${y}` }).join(" ")}
                  fill="none" stroke="#e85d75" strokeWidth="2" strokeDasharray="6 4" strokeLinecap="round" strokeLinejoin="round"
                />
                <path
                  d={burndown.days.map((d, i) => { const x = 50 + (i / Math.max(burndown.days.length - 1, 1)) * 525; const y = 165 - (d.remaining / maxRemaining) * 140; return `${i === 0 ? "M" : "L"}${x},${y}` }).join(" ") + ` L${50 + (burndown.days.length - 1) / Math.max(burndown.days.length - 1, 1) * 525},165 L50,165 Z`}
                  fill="url(#burndownFill)" style={{ transition: "all 0.5s ease" }}
                />
                <polyline
                  points={burndown.days.map((d, i) => { const x = 50 + (i / Math.max(burndown.days.length - 1, 1)) * 525; const y = 165 - (d.remaining / maxRemaining) * 140; return `${x},${y}` }).join(" ")}
                  fill="none" stroke="#4ecdc4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                />
              </svg>
              <div className="flex items-center justify-center gap-4 mt-1 text-[10px] font-bold" style={{ color: "var(--nb-text-soft)" }}>
                <span>{t("On track:")} <span className="font-black" style={{ color: isOnTrack ? "#4ecdc4" : "#f7d44a" }}>{isOnTrack ? t("Yes") : t("Behind")}</span></span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="nb-card p-5">
              <p className="text-sm font-black mb-3" style={{ color: "var(--nb-text)" }}>📥 {t("Unassigned Backlog")} ({unassignedTasks.reduce((s) => s + 3, 0)} {t("pts")})</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {unassignedTasks.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 p-2" style={{ background: "var(--nb-surface-soft)", border: "2px solid var(--nb-border)" }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate" style={{ color: "var(--nb-text)" }}>{item.title}</p>
                      <div className="flex gap-2 mt-0.5">
                        <span className="text-[10px] font-black" style={{ color: priorityColor[item.priority] ?? "#999" }}>{item.priority}</span>
                        <span className="text-[10px] font-black" style={{ color: "var(--nb-text-soft)" }}>{t("3pts")}</span>
                      </div>
                    </div>
                    <button onClick={() => assignToSprint(item.id)} className="text-[10px] font-black px-2 py-1" style={{ background: "#4ecdc4", border: "2px solid var(--nb-border)", color: "#1a1a1a" }}>{t("+ Assign")}</button>
                  </div>
                ))}
                {unassignedTasks.length === 0 && <p className="text-xs font-bold text-center py-4" style={{ color: "var(--nb-text-soft)" }}>{t("All tasks assigned to sprints")}</p>}
              </div>
            </div>

            <div className="nb-card p-5">
              <p className="text-sm font-black mb-3" style={{ color: "var(--nb-text)" }}>👥 {t("Capacity Planning")}</p>
              <div className="space-y-3">
                {members.map((m) => {
                  const memberTasks = sprint.tasks.filter((t) => t.assignee?.id === m.id)
                  const load = Math.min(Math.round((memberTasks.length * 3 / 30) * 100), 100)
                  return (
                    <div key={m.id}>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span style={{ color: "var(--nb-text)" }}>{m.name}</span>
                        <span style={{ color: "var(--nb-text-soft)" }}>{t("{n}pts / 30h", { n: memberTasks.length * 3 })}</span>
                      </div>
                      <div className="h-3" style={{ background: "var(--nb-surface)", border: "2px solid var(--nb-border)" }}>
                        <div className="h-full" style={{ width: `${load}%`, background: load > 80 ? "#e85d75" : load > 50 ? "#f7d44a" : "#4ecdc4", transition: "width 0.3s" }} />
                      </div>
                    </div>
                  )
                })}
                {members.length === 0 && <p className="text-xs font-bold py-2" style={{ color: "var(--nb-text-soft)" }}>{t("No team members")}</p>}
              </div>
            </div>
          </div>

          <div className="nb-card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-black" style={{ color: "var(--nb-text)" }}>📋 {t("Sprint Items")} ({sprint.tasks.length})</p>
            </div>
            {sprint.tasks.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm font-bold" style={{ color: "var(--nb-text-soft)" }}>{t("No items in this sprint yet")}</p>
                <p className="text-xs font-bold mt-1" style={{ color: "var(--nb-text-soft)" }}>{t("Assign tasks from the backlog above")}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sprint.tasks.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-3" style={{ background: "var(--nb-surface)", border: "2px solid var(--nb-border)" }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold" style={{ color: "var(--nb-text)" }}>{item.title}</p>
                      <div className="flex gap-3 mt-1">
                        <span className="text-xs font-black" style={{ color: priorityColor[item.priority] }}>{item.priority}</span>
                        <span className="text-xs font-black" style={{ color: "var(--nb-text-soft)" }}>{t("3 pts")}</span>
                        {item.assignee && <span className="text-xs font-bold" style={{ color: "#4ecdc4" }}>{item.assignee.name}</span>}
                      </div>
                    </div>
                    <button onClick={() => removeFromSprint(item.id)} className="text-xs font-black px-2 py-1" style={{ background: "#e85d75", border: "2px solid var(--nb-border)", color: "white" }}>{t("Remove")}</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="nb-card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-black" style={{ color: "var(--nb-text)" }}>🤖 {t("AI Sprint Insights")}</p>
              <button onClick={getAiSprintInsights} disabled={aiLoading} className="px-3 py-1.5 text-xs font-black transition-all" style={{ background: aiLoading ? "var(--nb-text-soft)" : "var(--nb-border)", border: "2px solid var(--nb-border)", color: "white" }}>
                {aiLoading ? t("Thinking...") : t("Analyze Sprint")}
              </button>
            </div>
            {aiSuggestions ? (
              <p className="text-sm font-bold leading-relaxed" style={{ color: "var(--nb-text)", whiteSpace: "pre-wrap" }}>{aiSuggestions}</p>
            ) : (
              <p className="text-xs font-bold" style={{ color: "var(--nb-text-soft)" }}>{t('Click "Analyze Sprint" to get AI-powered suggestions')}</p>
            )}
          </div>
        </>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-sm p-6" style={{ background: "var(--nb-surface)", border: "3px solid var(--nb-border)", boxShadow: "8px 8px 0 var(--nb-shadow)" }} onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-black mb-4" style={{ color: "var(--nb-text)" }}>{t("New Sprint")}</h2>
            <input type="text" placeholder={t("Sprint name")} value={formName} onChange={(e) => setFormName(e.target.value)} className="nb-input w-full px-3 py-2 text-sm mb-2" style={{ background: "var(--nb-surface)", border: "2.5px solid var(--nb-border)" }} autoFocus />
            <input type="text" placeholder={t("Goal (optional)")} value={formGoal} onChange={(e) => setFormGoal(e.target.value)} className="nb-input w-full px-3 py-2 text-sm mb-2" style={{ background: "var(--nb-surface)", border: "2.5px solid var(--nb-border)" }} />
            <div className="flex gap-2 mb-2">
              <div className="flex-1">
                <label className="block text-[10px] font-bold mb-1" style={{ color: "var(--nb-text-soft)" }}>{t("Start Date")}</label>
                <input type="date" value={formStart} onChange={(e) => setFormStart(e.target.value)} className="nb-input w-full px-3 py-2 text-sm" style={{ background: "var(--nb-surface)", border: "2.5px solid var(--nb-border)" }} />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-bold mb-1" style={{ color: "var(--nb-text-soft)" }}>{t("End Date")}</label>
                <input type="date" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} className="nb-input w-full px-3 py-2 text-sm" style={{ background: "var(--nb-surface)", border: "2.5px solid var(--nb-border)" }} />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setShowCreate(false)} className="nb-btn px-4 py-2 text-sm font-black">{t("Cancel")}</button>
              <button onClick={handleCreate} disabled={!formName.trim() || !formStart || !formEnd} className="nb-btn-primary px-4 py-2 text-sm font-black" style={{ background: "var(--nb-border)", color: "white" }}>{t("Create")}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && editSprint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowEdit(false)}>
          <div className="w-full max-w-sm p-6" style={{ background: "var(--nb-surface)", border: "3px solid var(--nb-border)", boxShadow: "8px 8px 0 var(--nb-shadow)" }} onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-black mb-4" style={{ color: "var(--nb-text)" }}>{t("Edit Sprint")}</h2>
            <input type="text" placeholder={t("Sprint name")} value={formName} onChange={(e) => setFormName(e.target.value)} className="nb-input w-full px-3 py-2 text-sm mb-2" style={{ background: "var(--nb-surface)", border: "2.5px solid var(--nb-border)" }} autoFocus />
            <input type="text" placeholder={t("Goal (optional)")} value={formGoal} onChange={(e) => setFormGoal(e.target.value)} className="nb-input w-full px-3 py-2 text-sm mb-2" style={{ background: "var(--nb-surface)", border: "2.5px solid var(--nb-border)" }} />
            <div className="flex gap-2 mb-2">
              <div className="flex-1">
                <label className="block text-[10px] font-bold mb-1" style={{ color: "var(--nb-text-soft)" }}>{t("Start Date")}</label>
                <input type="date" value={formStart} onChange={(e) => setFormStart(e.target.value)} className="nb-input w-full px-3 py-2 text-sm" style={{ background: "var(--nb-surface)", border: "2.5px solid var(--nb-border)" }} />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-bold mb-1" style={{ color: "var(--nb-text-soft)" }}>{t("End Date")}</label>
                <input type="date" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} className="nb-input w-full px-3 py-2 text-sm" style={{ background: "var(--nb-surface)", border: "2.5px solid var(--nb-border)" }} />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setShowEdit(false)} className="nb-btn px-4 py-2 text-sm font-black">{t("Cancel")}</button>
              <button onClick={handleUpdate} disabled={!formName.trim() || !formStart || !formEnd} className="nb-btn-primary px-4 py-2 text-sm font-black" style={{ background: "var(--nb-border)", color: "white" }}>{t("Save")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
