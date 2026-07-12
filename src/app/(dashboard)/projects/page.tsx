"use client"

import { useState, useEffect } from "react"
import { useLanguage } from "@/contexts/language"
import Link from "next/link"

interface ProjectData {
  id: string
  name: string
  description: string | null
  color: string
  boards: { columns: { tasks: unknown[] }[] }[]
}

export default function ProjectsPage() {
  const { t } = useLanguage()
  const [projects, setProjects] = useState<ProjectData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => { if (!r.ok) throw new Error(); return r.json() })
      .then((data) => setProjects(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: "var(--nb-text)" }}>{t("Projects")}</h1>
          <p className="text-sm font-bold" style={{ color: "var(--nb-text-soft)" }}>{t("n project(s)", { n: projects.length })}</p>
        </div>
        <Link
          href="/projects/new"
          className="text-sm font-black px-4 py-2 transition-all"
          style={{ background: "#4ecdc4", border: "2px solid var(--nb-border)", color: "#1a1a1a", boxShadow: "4px 4px 0 var(--nb-shadow)" }}
        >
          {t("+ New Project")}
        </Link>
      </div>

      {!loading && projects.length === 0 ? (
        <div
          className="p-16 text-center"
          style={{ border: "3px dashed var(--nb-border)" }}
        >
          <p className="text-sm font-bold" style={{ color: "var(--nb-text-soft)" }}>{t("No projects yet")}</p>
          <Link href="/projects/new" className="mt-2 inline-block text-sm font-black" style={{ color: "#4ecdc4" }}>
            {t("Create your first project")}
          </Link>
        </div>
      ) : loading ? (
        <div className="p-16 text-center">
          <p className="text-sm font-bold" style={{ color: "var(--nb-text-soft)" }}>{t("Loading...")}</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const taskCount = project.boards.reduce(
              (sum, b) => sum + b.columns.reduce((s, c) => s + c.tasks.length, 0),
              0
            )
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="p-5 transition-all hover:-translate-y-0.5"
                style={{
                  background: "var(--nb-surface)",
                  border: "3px solid var(--nb-border)",
                  boxShadow: "6px 6px 0 var(--nb-shadow)",
                  textDecoration: "none",
                }}
              >
                <div className="mb-3 h-2 w-16" style={{ background: project.color, border: "2px solid var(--nb-border)" }} />
                <h3 className="text-base font-black" style={{ color: "var(--nb-text)" }}>{project.name}</h3>
                {project.description && (
                  <p className="mt-1 text-xs font-bold" style={{ color: "var(--nb-text-soft)" }}>{project.description}</p>
                )}
                <div className="mt-3 flex gap-4 text-xs font-bold" style={{ color: "var(--nb-text-soft)" }}>
                  <span>{t("n board(s)", { n: project.boards.length })}</span>
                  <span>{t("n task(s)", { n: taskCount })}</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
