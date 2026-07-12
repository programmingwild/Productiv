"use client"

import { useState } from "react"
import { EditTaskModal } from "./edit-task-modal"
import type { Task } from "@/types/kanban"
import { useLanguage } from "@/contexts/language"

interface Props {
  task: Task
  teamId: string
  allTasks: Task[]
  onDelete: (taskId: string) => void
}

const priorityColors: Record<string, string> = {
  none: "#e5e7eb",
  low: "#bfdbfe",
  medium: "#fef08a",
  high: "#fed7aa",
  urgent: "#fecaca",
}

const priorityTextColors: Record<string, string> = {
  none: "#374151",
  low: "#1e40af",
  medium: "#854d0e",
  high: "#9a3412",
  urgent: "#991b1b",
}

export function TaskCard({ task, teamId, allTasks, onDelete }: Props) {
  const { t } = useLanguage()
  const [showEdit, setShowEdit] = useState(false)
  const blockedBy = task.taskDependencies?.length ?? 0
  const blocking = task.blockingDependents?.length ?? 0

  return (
    <>
      <div
        onClick={() => setShowEdit(true)}
        className="cursor-pointer rounded-md p-3 transition-shadow"
        style={{
          backgroundColor: "var(--nb-surface)",
          border: `2px solid ${blockedBy > 0 ? "#fecaca" : "var(--nb-border)"}`,
          boxShadow: blockedBy > 0 ? "3px 3px 0 #fca5a5" : "3px 3px 0 var(--nb-shadow)",
        }}
        onMouseEnter={(e) => e.currentTarget.style.boxShadow = blockedBy > 0 ? "4px 4px 0 #fca5a5" : "4px 4px 0 var(--nb-shadow)"}
        onMouseLeave={(e) => e.currentTarget.style.boxShadow = blockedBy > 0 ? "3px 3px 0 #fca5a5" : "3px 3px 0 var(--nb-shadow)"}
      >
        {blockedBy > 0 && (
          <div className="mb-2 flex items-center gap-1 rounded px-1.5 py-0.5" style={{ background: "#fef2f2" }}>
            <span className="text-[10px] font-black" style={{ color: "#e85d75" }}>
              ⏸ {t("Blocked ({n})", { n: blockedBy })}
            </span>
          </div>
        )}
        {blocking > 0 && (
          <div className="mb-2 flex items-center gap-1 rounded px-1.5 py-0.5" style={{ background: "#f3e8ff" }}>
            <span className="text-[10px] font-black" style={{ color: "#9333ea" }}>
              {t("Blocks ({n})", { n: blocking })}
            </span>
          </div>
        )}
        <div className="mb-2 flex items-center justify-between">
          {task.priority !== "none" && (
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
              style={{
                backgroundColor: priorityColors[task.priority] ?? priorityColors.none,
                color: priorityTextColors[task.priority] ?? priorityTextColors.none,
                border: "1.5px solid var(--nb-border)",
              }}
            >
              {task.priority}
            </span>
          )}
        </div>
        <p className="text-sm font-bold" style={{ color: "var(--nb-text)" }}>{task.title}</p>
        {task.description && (
          <p className="mt-1 text-xs" style={{ color: "var(--nb-text-soft)" }}>{task.description}</p>
        )}
        <div className="mt-3 flex items-center justify-between">
          {task.dueDate && (
            <span className="text-[10px] font-bold" style={{ color: "var(--nb-text-soft)" }}>
              {new Date(task.dueDate).toLocaleDateString()}
            </span>
          )}
          {task.assignee ? (
            <div className="flex h-6 w-6 items-center justify-center text-[10px] font-black"
              style={{
                backgroundColor: "var(--nb-yellow)",
                border: "2px solid var(--nb-border)",
                color: "var(--nb-text)",
              }}>
              {task.assignee.name?.[0]?.toUpperCase() ?? "?"}
            </div>
          ) : (
            <div />
          )}
        </div>
      </div>

      {showEdit && (
        <EditTaskModal
          task={task}
          teamId={teamId}
          allTasks={allTasks}
          onClose={() => setShowEdit(false)}
          onDelete={() => { onDelete(task.id); setShowEdit(false) }}
        />
      )}
    </>
  )
}
