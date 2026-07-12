"use client"

import { useState, useRef } from "react"
import type { Task } from "@/types/kanban"
import { useLanguage } from "@/contexts/language"
import { TaskComments } from "./comments"
import { TimeTracker } from "./time-tracker"
import { FileUpload, uploadImageFromClipboard } from "@/components/file-upload"
import { TaskDependencies } from "./task-dependencies"

interface Props {
  task: Task
  teamId: string
  allTasks: Task[]
  onClose: () => void
  onDelete: () => void
}

export function EditTaskModal({ task, teamId, allTasks, onClose, onDelete }: Props) {
  const { t } = useLanguage()
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description ?? "")
  const [priority, setPriority] = useState(task.priority)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [pasteUploading, setPasteUploading] = useState(false)
  const descRef = useRef<HTMLTextAreaElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, priority }),
    })

    setLoading(false)
    setSaved(true)
    setTimeout(onClose, 800)
  }

  async function handleDelete() {
    setDeleting(true)
    await fetch(`/api/tasks/${task.id}`, { method: "DELETE" })
    onDelete()
  }

  async function handleDescriptionPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = e.clipboardData.items
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault()
        const file = item.getAsFile()
        if (!file) continue
        setPasteUploading(true)
        const url = await uploadImageFromClipboard(file, task.id)
        setPasteUploading(false)
        if (url) {
          const textarea = descRef.current
          if (textarea) {
            const start = textarea.selectionStart
            const end = textarea.selectionEnd
            const imgTag = `\n![${file.name}](${url})\n`
            const newDesc = description.slice(0, start) + imgTag + description.slice(end)
            setDescription(newDesc)
            setTimeout(() => {
              textarea.focus()
              textarea.selectionStart = textarea.selectionEnd = start + imgTag.length
            }, 0)
          }
        }
        return
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md p-6" style={{ background: "var(--nb-surface)", border: "3px solid var(--nb-border)", boxShadow: "8px 8px 0 var(--nb-shadow)" }} onClick={(e) => e.stopPropagation()}>
        {saved ? (
          <div className="py-8 text-center">
            <p className="text-lg font-black" style={{ color: "#4ecdc4" }}>{t("Saved!")}</p>
          </div>
        ) : (
          <>
            <h2 className="mb-4 text-lg font-black" style={{ color: "var(--nb-text)" }}>{t("Edit Task")}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="nb-input block w-full px-3 py-2 text-sm"
                />
              </div>
              <div className="relative">
                <textarea
                  ref={descRef}
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onPaste={handleDescriptionPaste}
                  className="nb-input block w-full px-3 py-2 text-sm resize-none"
                  placeholder={t("Description (paste images directly!)")}
                />
                {pasteUploading && (
                  <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 text-[10px] font-black rounded" style={{ background: "var(--nb-surface)", border: "1.5px solid var(--nb-border)", color: "var(--nb-text-soft)" }}>
                    <span>⏳</span> {t("Uploading image...")}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "var(--nb-text-soft)" }}>{t("Priority")}</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="nb-input block w-full px-3 py-2 text-sm"
                >
                  <option value="none">{t("No priority")}</option>
                  <option value="low">{t("Low")}</option>
                  <option value="medium">{t("Medium")}</option>
                  <option value="high">{t("High")}</option>
                  <option value="urgent">{t("Urgent")}</option>
                </select>
              </div>
              <TaskDependencies task={task} allTasks={allTasks} />
              <FileUpload taskId={task.id} />
              <TimeTracker taskId={task.id} teamId={teamId} />
              <TaskComments taskId={task.id} />
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-sm font-black"
                  style={{ color: "#e85d75" }}
                >
                  {deleting ? t("Deleting...") : t("Delete")}
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="nb-btn px-4 py-2 text-sm font-black"
                  >
                    {t("Cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="nb-btn-primary px-4 py-2 text-sm font-black"
                  >
                    {loading ? t("Saving...") : t("Save")}
                  </button>
                </div>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
