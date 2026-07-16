"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { useLanguage } from "@/contexts/language"
import { KanbanBoard } from "@/components/kanban/board"
import { ExportButton } from "@/components/export-button"
import type { BoardData, Member } from "@/types/kanban"

export default function BoardPage() {
  const { t } = useLanguage()
  const params = useParams()
  const id = params.id as string
  const [project, setProject] = useState<{ id: string; name: string; boards: BoardData[] } | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/projects/${id}`)
        if (!res.ok) throw new Error()
        const data = await res.json()
        setProject({ id: data.id, name: data.name, boards: data.boards })

        if (data.boards.length > 0) {
          try {
            const memberRes = await fetch(`/api/team/members?teamId=${data.teamId}`)
            if (memberRes.ok) {
              const teamData = await memberRes.json()
              const mapped: Member[] = teamData.map((m: Record<string, unknown>) => ({
                id: (m.user as Record<string, unknown>)?.id as string || m.userId as string,
                name: (m.user as Record<string, unknown>)?.name as string || "",
                email: (m.user as Record<string, unknown>)?.email as string || "",
                image: (m.user as Record<string, unknown>)?.image as string || null,
              }))
              setMembers(mapped)
            }
          } catch {}
        }
      } catch {
        setError(t("Could not load board"))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, t])

  if (loading) {
    return <div className="p-6 text-sm font-bold" style={{ color: "var(--nb-text-soft)" }}>{t("Loading...")}</div>
  }

  if (error || !project || project.boards.length === 0) {
    return <div className="p-6 text-sm font-bold" style={{ color: "var(--nb-text-soft)" }}>{error || t("Board not found")}</div>
  }

  const board = project.boards[0]

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-6 py-3" style={{ borderBottom: "3px solid var(--nb-border)", background: "var(--nb-surface)" }}>
        <div className="flex items-center gap-3">
          <h1 className="font-black" style={{ color: "var(--nb-text)" }}>{project.name}</h1>
          <span className="text-sm font-bold" style={{ color: "var(--nb-text-soft)" }}>/</span>
          <span className="text-sm font-bold" style={{ color: "var(--nb-text-soft)" }}>{board.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton href={`/api/export/tasks?projectId=${id}`} label="CSV" />
        </div>
      </div>
      <KanbanBoard
        board={JSON.parse(JSON.stringify(board))}
        projectId={project.id}
        members={members}
        teamId=""
      />
    </div>
  )
}
