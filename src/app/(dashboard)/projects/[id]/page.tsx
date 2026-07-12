"use client"

import { useState, useEffect } from "react"
import { useLanguage } from "@/contexts/language"
import { useParams } from "next/navigation"
import Link from "next/link"

interface TaskData { id: string; position: number }
interface ColumnData { id: string; name: string; position: number; tasks: TaskData[] }
interface BoardData { id: string; name: string; columns: ColumnData[] }
interface ProjectData {
  id: string; name: string; description: string | null; color: string; boards: BoardData[]
}

export default function ProjectDetailPage() {
  const { t } = useLanguage()
  const params = useParams()
  const id = params.id as string
  const [project, setProject] = useState<ProjectData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json() })
      .then(setProject)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm font-bold" style={{ color: "var(--nb-text-soft)" }}>{t("Loading...")}</p>
      </div>
    )
  }

  if (!project) return (
    <div className="p-6">
      <p className="text-sm font-bold" style={{ color: "var(--nb-text-soft)" }}>{t("Project not found")}</p>
    </div>
  )

  const totalTasks = project.boards.reduce(
    (s, b) => s + b.columns.reduce((s2, c) => s2 + c.tasks.length, 0),
    0
  )

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4" style={{ background: project.color, border: "2px solid var(--nb-border)" }} />
          <div>
            <h1 className="text-2xl font-black" style={{ color: "var(--nb-text)" }}>{project.name}</h1>
            {project.description && (
              <p className="text-sm font-bold" style={{ color: "var(--nb-text-soft)" }}>{project.description}</p>
            )}
          </div>
        </div>
        <Link
          href={`/projects/${project.id}/board`}
          className="text-sm font-black px-4 py-2 transition-all"
          style={{ background: "#4ecdc4", border: "2px solid var(--nb-border)", color: "#1a1a1a", boxShadow: "4px 4px 0 var(--nb-shadow)" }}
        >
          {t("Open Board")}
        </Link>
      </div>

      <div className="mb-6 grid gap-5 sm:grid-cols-3">
        <div className="p-4" style={{ background: "var(--nb-surface)", border: "2.5px solid var(--nb-border)", boxShadow: "4px 4px 0 var(--nb-shadow)" }}>
          <p className="text-xs font-bold" style={{ color: "var(--nb-text-soft)" }}>{t("Boards")}</p>
          <p className="mt-1 text-2xl font-black" style={{ color: "var(--nb-text)" }}>{project.boards.length}</p>
        </div>
        <div className="p-4" style={{ background: "var(--nb-surface)", border: "2.5px solid var(--nb-border)", boxShadow: "4px 4px 0 var(--nb-shadow)" }}>
          <p className="text-xs font-bold" style={{ color: "var(--nb-text-soft)" }}>{t("Tasks")}</p>
          <p className="mt-1 text-2xl font-black" style={{ color: "var(--nb-text)" }}>{totalTasks}</p>
        </div>
      </div>

      <h2 className="text-lg font-black mb-3" style={{ color: "var(--nb-text)" }}>{t("Boards")}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {project.boards.map((board) => (
          <Link
            key={board.id}
            href={`/projects/${project.id}/board`}
            className="p-4 transition-all hover:-translate-y-0.5"
            style={{
              background: "var(--nb-surface)",
              border: "2.5px solid var(--nb-border)",
              boxShadow: "4px 4px 0 var(--nb-shadow)",
              textDecoration: "none",
            }}
          >
            <h3 className="font-black" style={{ color: "var(--nb-text)" }}>{board.name}</h3>
            <p className="mt-1 text-xs font-bold" style={{ color: "var(--nb-text-soft)" }}>
              {t("{cols} columns, {tasks} tasks", { cols: board.columns.length, tasks: board.columns.reduce((s, c) => s + c.tasks.length, 0) })}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
