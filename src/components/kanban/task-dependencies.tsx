"use client"

import { useState } from "react"
import type { Task } from "@/types/kanban"
import { useLanguage } from "@/contexts/language"

interface Props {
  task: Task
  allTasks: Task[]
}

export function TaskDependencies({ task, allTasks }: Props) {
  const { t } = useLanguage()
  const [search, setSearch] = useState("")
  const [adding, setAdding] = useState(false)

  const blockers = task.taskDependencies ?? []
  const blockedBy = task.blockingDependents ?? []
  const availableTasks = allTasks.filter(
    (t) =>
      t.id !== task.id &&
      !blockers.some((d) => d.dependsOnTask.id === t.id) &&
      !blockedBy.some((d) => d.task.id === t.id),
  )
  const filtered = search ? availableTasks.filter((t) => t.title.toLowerCase().includes(search.toLowerCase())) : availableTasks

  async function addDependency(dependsOnTaskId: string) {
    await fetch(`/api/tasks/${task.id}/dependencies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dependsOnTaskId }),
    })
    setAdding(false)
    setSearch("")
    window.location.reload()
  }

  async function removeDependency(depId: string) {
    await fetch(`/api/tasks/${task.id}/dependencies/${depId}`, { method: "DELETE" })
    window.location.reload()
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold" style={{ color: "var(--nb-text-soft)" }}>{t("Dependencies")}</label>

      {blockers.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-bold" style={{ color: "#e85d75" }}>{t("Blocked by:")}</p>
          {blockers.map((dep) => (
            <div key={dep.id} className="flex items-center justify-between gap-2 rounded px-2 py-1" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
              <span className="text-xs font-bold truncate" style={{ color: "#991b1b" }}>{dep.dependsOnTask.title}</span>
              <button onClick={() => removeDependency(dep.id)} className="text-xs font-black shrink-0" style={{ color: "#e85d75" }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {blockedBy.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-bold" style={{ color: "#9333ea" }}>{t("Blocks:")}</p>
          {blockedBy.map((dep) => (
            <div key={dep.id} className="flex items-center justify-between gap-2 rounded px-2 py-1" style={{ background: "#f3e8ff", border: "1px solid #d8b4fe" }}>
              <span className="text-xs font-bold truncate" style={{ color: "#6b21a8" }}>{dep.task.title}</span>
              <button onClick={() => removeDependency(dep.id)} className="text-xs font-black shrink-0" style={{ color: "#9333ea" }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {adding ? (
        <div className="space-y-1">
          <input
            type="text"
            placeholder={t("Search tasks...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            className="nb-input block w-full px-2 py-1 text-xs"
          />
          <div className="max-h-32 overflow-y-auto space-y-0.5">
            {filtered.slice(0, 20).map((t) => (
              <button
                key={t.id}
                onClick={() => addDependency(t.id)}
                className="block w-full text-left rounded px-2 py-1 text-xs font-bold transition-colors"
                style={{ color: "var(--nb-text)", background: "var(--nb-surface-soft)" }}
              >
                {t.title}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-[10px] px-2" style={{ color: "var(--nb-text-soft)" }}>{t("No tasks found")}</p>
            )}
          </div>
          <button onClick={() => { setAdding(false); setSearch("") }} className="text-[10px] font-bold" style={{ color: "var(--nb-text-soft)" }}>{t("Cancel")}</button>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="text-xs font-bold" style={{ color: "var(--nb-text-soft)" }}>+ {t("Add dependency")}</button>
      )}
    </div>
  )
}
