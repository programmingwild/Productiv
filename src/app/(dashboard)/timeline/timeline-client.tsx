"use client"

import { useLanguage } from "@/contexts/language"
import { useState, useMemo } from "react"

interface TimelineTask {
  id: string
  title: string
  priority: string
  dueDate: string | null
  assignee: { id: string; name: string | null } | null
  taskDependencies: { id: string; dependsOnTask: { id: string; title: string } }[]
  blockingDependents: { id: string; task: { id: string; title: string } }[]
}

interface SprintData {
  id: string
  name: string
  startDate: string
  endDate: string
  goal: string | null
  status: string
  tasks: TimelineTask[]
}

const priorityColors: Record<string, string> = {
  none: "#999",
  low: "#60a5fa",
  medium: "#f7d44a",
  high: "#fb923c",
  urgent: "#e85d75",
}

function dayOffset(date: Date): number {
  return Math.floor(date.getTime() / 86400000)
}

export function TimelineClient({ sprints, unassignedTasks }: { sprints: SprintData[]; unassignedTasks: TimelineTask[] }) {
  const { t } = useLanguage()
  const [showUnassigned, setShowUnassigned] = useState(true)

  const { daysOffset, totalDays, dayWidth, headerDates } = useMemo(() => {
    if (sprints.length === 0 && unassignedTasks.length === 0) return { daysOffset: 0, totalDays: 30, dayWidth: 28, headerDates: [] }

    const allDates = [
      ...sprints.flatMap((s) => [new Date(s.startDate), new Date(s.endDate)]),
      ...unassignedTasks.filter((t) => t.dueDate).map((t) => new Date(t.dueDate!)),
    ]
    allDates.sort((a, b) => a.getTime() - b.getTime())

    const start = allDates[0]
    const end = allDates[allDates.length - 1]
    const padding = 7
    const startMs = start.getTime() - padding * 86400000
    const endMs = end.getTime() + padding * 86400000
    const days = Math.max(Math.ceil((endMs - startMs) / 86400000), 14)
    const dw = 28

    const dates: { day: number; label: string; isWeekStart: boolean }[] = []
    for (let d = 0; d <= days; d++) {
      const date = new Date(startMs + d * 86400000)
      if (d === 0 || d % 7 === 0 || date.getDate() === 1) {
        dates.push({
          day: d,
          label: d === 0 ? date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : date.getDate() === 1 ? date.toLocaleDateString("en-US", { month: "short" }) : `W${Math.ceil(d / 7)}`,
          isWeekStart: d % 7 === 0,
        })
      }
    }

    return { daysOffset: dayOffset(start), totalDays: days, dayWidth: dw, headerDates: dates }
  }, [sprints, unassignedTasks])

  function taskBarStyle(task: TimelineTask, sprintStart: string, sprintEnd: string) {
    const start = new Date(sprintStart)
    const end = task.dueDate ? new Date(task.dueDate) : new Date(sprintEnd)
    const left = Math.max(0, dayOffset(start) - daysOffset) * dayWidth
    const width = Math.max(dayWidth * 2, (dayOffset(end) - dayOffset(start)) * dayWidth)
    return { left: `${left}px`, width: `${width}px` }
  }

  if (sprints.length === 0 && unassignedTasks.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-black mb-2" style={{ color: "var(--nb-text)" }}>📅 {t("Timeline")}</h1>
        <p className="text-sm font-bold" style={{ color: "var(--nb-text-soft)" }}>{t("No sprints or tasks with due dates yet.")}</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black" style={{ color: "var(--nb-text)" }}>📅 {t("Timeline")}</h1>
          <p className="text-sm font-bold" style={{ color: "var(--nb-text-soft)" }}>{t("Gantt view of all sprints and tasks")}</p>
        </div>
        <label className="flex items-center gap-2 text-xs font-bold cursor-pointer" style={{ color: "var(--nb-text)" }}>
          <input type="checkbox" checked={showUnassigned} onChange={(e) => setShowUnassigned(e.target.checked)} />
          {t("Show unscheduled tasks")}
        </label>
      </div>

      <div className="overflow-x-auto" style={{ border: "3px solid var(--nb-border)", boxShadow: "6px 6px 0 var(--nb-shadow)" }}>
        <div style={{ minWidth: `${(totalDays + 1) * dayWidth + 200}px` }}>
          {/* Time axis header */}
          <div className="flex" style={{ background: "var(--nb-surface)", borderBottom: "2px solid var(--nb-border)", position: "sticky", top: 0, zIndex: 10 }}>
            <div className="w-[200px] shrink-0 px-3 py-2 text-xs font-black" style={{ color: "var(--nb-text)", borderRight: "2px solid var(--nb-border)" }}>{t("Sprint / Task")}</div>
            <div className="flex" style={{ position: "relative" }}>
              {headerDates.map((h, i) => {
                const left = h.day * dayWidth
                const nextLeft = i < headerDates.length - 1 ? headerDates[i + 1].day * dayWidth : left + dayWidth * 14
                return (
                  <div
                    key={h.day}
                    className="shrink-0 px-1 py-2 text-[10px] font-black"
                    style={{
                      position: "absolute",
                      left: `${left}px`,
                      color: "var(--nb-text-soft)",
                      width: `${nextLeft - left}px`,
                    }}
                  >
                    {h.label}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Sprint rows */}
          {sprints.map((sprint) => {
            const sprintStart = new Date(sprint.startDate)
            const sprintEnd = new Date(sprint.endDate)
            const left = Math.max(0, dayOffset(sprintStart) - daysOffset) * dayWidth
            const width = (dayOffset(sprintEnd) - dayOffset(sprintStart)) * dayWidth
            const isActive = sprint.status === "ACTIVE"
            const isCompleted = sprint.status === "COMPLETED"
            const sprintColor = isCompleted ? "#4ecdc4" : isActive ? "#f7d44a" : "#999"

            return (
              <div key={sprint.id} style={{ borderBottom: "2px solid var(--nb-border)" }}>
                {/* Sprint header */}
                <div className="flex" style={{ background: `${sprintColor}15` }}>
                  <div className="w-[200px] shrink-0 px-3 py-2 flex items-center gap-2" style={{ borderRight: "2px solid var(--nb-border)" }}>
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: sprintColor }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black truncate" style={{ color: "var(--nb-text)" }}>{sprint.name}</p>
                      <p className="text-[10px] font-bold" style={{ color: "var(--nb-text-soft)" }}>
                        {sprintStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {sprintEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                    <span className="text-[10px] font-black px-1.5 py-0.5" style={{ background: sprintColor, border: "1.5px solid var(--nb-border)", color: "#1a1a1a" }}>
                      {sprint.status}
                    </span>
                  </div>
                  <div className="flex-1 relative" style={{ height: "44px" }}>
                    <div
                      className="absolute top-1 bottom-1 rounded opacity-30"
                      style={{ left: `${left}px`, width: `${Math.max(width, dayWidth)}px`, background: sprintColor }}
                    />
                    {sprint.goal && (
                      <p className="absolute text-[10px] font-bold px-2 py-1 truncate max-w-[60%]" style={{ color: "var(--nb-text-soft)" }}>
                        🎯 {sprint.goal}
                      </p>
                    )}
                  </div>
                </div>

                {/* Tasks in sprint */}
                {sprint.tasks.length === 0 ? (
                  <div className="flex">
                    <div className="w-[200px] shrink-0 px-3 py-1.5" style={{ borderRight: "2px solid var(--nb-border)" }} />
                    <div className="flex-1 px-2 py-1.5 text-[10px] font-bold" style={{ color: "var(--nb-text-soft)" }}>{t("No tasks")}</div>
                  </div>
                ) : (
                  sprint.tasks.map((task) => {
                    const bar = taskBarStyle(task, sprint.startDate, sprint.endDate)
                    const blocked = task.taskDependencies.length > 0
                    return (
                      <div key={task.id} className="flex" style={{ borderTop: "1px solid color-mix(in srgb, var(--nb-border) 30%, transparent)" }}>
                        <div className="w-[200px] shrink-0 px-3 py-1.5 flex items-center gap-1.5" style={{ borderRight: "2px solid var(--nb-border)" }}>
                          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: priorityColors[task.priority] ?? priorityColors.none }} />
                          <p className="text-[11px] font-bold truncate flex-1" style={{ color: "var(--nb-text)" }}>{task.title}</p>
                          {task.assignee && (
                            <span className="text-[10px] font-black px-1" style={{ background: "var(--nb-yellow)", border: "1.5px solid var(--nb-border)", color: "var(--nb-text)" }}>
                              {task.assignee.name?.[0] ?? "?"}
                            </span>
                          )}
                          {blocked && <span className="text-[10px]" style={{ color: "#e85d75" }}>⏸</span>}
                          {task.blockingDependents.length > 0 && <span className="text-[10px]" style={{ color: "#9333ea" }}>🔗</span>}
                        </div>
                        <div className="flex-1 relative py-1" style={{ minHeight: "28px" }}>
                          <div
                            className="absolute rounded-full h-5 flex items-center px-2 overflow-hidden"
                            style={{
                              left: bar.left,
                              width: bar.width,
                              background: priorityColors[task.priority] ?? priorityColors.none,
                              border: "2px solid var(--nb-border)",
                              opacity: 0.85,
                            }}
                            title={task.title}
                          >
                            <span className="text-[10px] font-black truncate" style={{ color: "#1a1a1a" }}>
                              {task.title}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )
          })}

          {/* Unassigned tasks section */}
          {showUnassigned && unassignedTasks.length > 0 && (
            <div style={{ borderBottom: "2px solid var(--nb-border)" }}>
              <div className="flex" style={{ background: "color-mix(in srgb, var(--nb-text) 5%, transparent)" }}>
                <div className="w-[200px] shrink-0 px-3 py-2 flex items-center gap-2" style={{ borderRight: "2px solid var(--nb-border)" }}>
                  <p className="text-xs font-black" style={{ color: "var(--nb-text)" }}>📋 {t("Unscheduled")}</p>
                  <span className="text-[10px] font-bold" style={{ color: "var(--nb-text-soft)" }}>({unassignedTasks.length})</span>
                </div>
                <div className="flex-1" />
              </div>
              {unassignedTasks.map((task) => {
                if (!task.dueDate) return null
                const due = new Date(task.dueDate)
                const left = (dayOffset(due) - daysOffset) * dayWidth
                return (
                  <div key={task.id} className="flex" style={{ borderTop: "1px solid color-mix(in srgb, var(--nb-border) 30%, transparent)" }}>
                    <div className="w-[200px] shrink-0 px-3 py-1.5 flex items-center gap-1.5" style={{ borderRight: "2px solid var(--nb-border)" }}>
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: priorityColors[task.priority] ?? priorityColors.none }} />
                      <p className="text-[11px] font-bold truncate flex-1" style={{ color: "var(--nb-text)" }}>{task.title}</p>
                      {task.assignee && (
                        <span className="text-[10px] font-black px-1" style={{ background: "var(--nb-yellow)", border: "1.5px solid var(--nb-border)", color: "var(--nb-text)" }}>
                          {task.assignee.name?.[0] ?? "?"}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 relative py-1" style={{ minHeight: "28px" }}>
                      <div className="absolute rounded-full h-4 flex items-center px-1.5 text-[9px] font-black" style={{ left: `${left}px`, background: priorityColors[task.priority] ?? "#999", border: "1.5px solid var(--nb-border)", color: "#1a1a1a" }}>
                        ◈
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
