"use client"

import { Droppable, Draggable } from "@hello-pangea/dnd"
import { TaskCard } from "./task-card"
import type { Column, Member } from "@/types/kanban"
import { useLanguage } from "@/contexts/language"

interface Props {
  column: Column
  members: Member[]
  teamId: string
  allTasks: import("@/types/kanban").Task[]
  onCreateTask: () => void
  onDeleteTask: (taskId: string) => void
}

export function KanbanColumn({ column, members, teamId, allTasks, onCreateTask, onDeleteTask }: Props) {
  const { t } = useLanguage()
  return (
    <div className="flex w-72 shrink-0 flex-col rounded-lg" style={{ backgroundColor: "var(--nb-surface-soft)" }}>
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <div
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: column.color }}
          />
          <h3 className="text-sm font-semibold" style={{ color: "var(--nb-text)" }}>{column.name}</h3>
          <span className="text-xs" style={{ color: "var(--nb-text-soft)" }}>{column.tasks.length}</span>
        </div>
        <button
          onClick={onCreateTask}
          className="flex h-6 w-6 items-center justify-center rounded"
          style={{ color: "var(--nb-text-soft)" }}
          title={t("Add task")}
        >
          +
        </button>
      </div>

      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex flex-1 flex-col gap-2 px-2 pb-2 min-h-[120px]"
            style={{
              backgroundColor: snapshot.isDraggingOver ? "var(--nb-surface)" : undefined,
            }}
          >
            {column.tasks.map((task, index) => (
              <Draggable key={task.id} draggableId={task.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`${snapshot.isDragging ? "rotate-2 shadow-lg" : ""}`}
                  >
                    <TaskCard task={task} teamId={teamId} allTasks={allTasks} onDelete={onDeleteTask} />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            {column.tasks.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex flex-1 items-center justify-center rounded-md border-2 border-dashed p-4"
                style={{ borderColor: "var(--nb-border)", opacity: 0.3 }}>
                <p className="text-xs" style={{ color: "var(--nb-text-soft)" }}>{t("Drop tasks here")}</p>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  )
}
