"use client"

import { useState, useCallback, useEffect } from "react"
import { DragDropContext, type DropResult } from "@hello-pangea/dnd"
import { useLanguage } from "@/contexts/language"
import { KanbanColumn } from "./column"
import { CreateTaskModal } from "./create-task-modal"
import type { BoardData, Member } from "@/types/kanban"

interface Props {
  board: BoardData
  projectId: string
  members: Member[]
  teamId: string
}

export function KanbanBoard({ board: initialBoard, projectId, members, teamId }: Props) {
  const { t } = useLanguage()
  const [board, setBoard] = useState<BoardData>(initialBoard)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [createColumnId, setCreateColumnId] = useState<string | null>(null)

  const fetchBoard = useCallback(async () => {
    try {
      setError("")
      const res = await fetch(`/api/projects/${projectId}`)
      if (!res.ok) throw new Error(t("Failed to fetch board"))
      const data = await res.json()
      if (data.boards?.[0]) setBoard(data.boards[0])
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Could not load board"))
    }
  }, [projectId])

  useEffect(() => { fetchBoard() }, [fetchBoard])

  useEffect(() => {
    const interval = setInterval(fetchBoard, 15000)
    return () => clearInterval(interval)
  }, [fetchBoard])

  async function onDragEnd(result: DropResult) {
    if (!result.destination) return
    const { source, destination, draggableId } = result
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    const newBoard = structuredClone(board)
    const sourceCol = newBoard.columns.find((c) => c.id === source.droppableId)
    const destCol = newBoard.columns.find((c) => c.id === destination.droppableId)
    if (!sourceCol || !destCol) return

    const [movedTask] = sourceCol.tasks.splice(source.index, 1)
    movedTask.columnId = destination.droppableId
    destCol.tasks.splice(destination.index, 0, movedTask)

    destCol.tasks.forEach((t, i) => (t.position = i))
    if (sourceCol.id !== destCol.id) sourceCol.tasks.forEach((t, i) => (t.position = i))

    setBoard(newBoard)
    setLoading(true)

    await fetch(`/api/tasks/${draggableId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ columnId: destination.droppableId, position: destination.index }),
    })

    setLoading(false)
  }

  function handleCreateTask(columnId: string) {
    setCreateColumnId(columnId)
    setShowCreate(true)
  }

  async function handleDeleteTask(taskId: string) {
    await fetch(`/api/tasks/${taskId}`, { method: "DELETE" })
    fetchBoard()
  }

  const allTasks = board.columns.flatMap((c) => c.tasks)

  return (
    <>
      {error && (
        <div className="p-4 text-center">
          <p className="text-sm font-bold" style={{ color: "#e85d75" }}>{error}</p>
          <button onClick={fetchBoard} className="mt-2 text-xs font-black px-3 py-1" style={{ background: "#f7d44a", border: "2px solid var(--nb-border)", color: "#1a1a1a" }}>{t("Retry")}</button>
        </div>
      )}
      <div className="flex flex-1 gap-4 overflow-x-auto p-6">
        <DragDropContext onDragEnd={onDragEnd}>
          {board.columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              members={members}
              teamId={teamId}
              allTasks={allTasks}
              onCreateTask={() => handleCreateTask(column.id)}
              onDeleteTask={handleDeleteTask}
            />
          ))}
        </DragDropContext>
      </div>

      {showCreate && createColumnId && (
        <CreateTaskModal
          columnId={createColumnId}
          members={members}
          onClose={() => { setShowCreate(false); setCreateColumnId(null) }}
          onCreated={fetchBoard}
        />
      )}
    </>
  )
}
