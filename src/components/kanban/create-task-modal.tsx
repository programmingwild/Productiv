"use client"

import { useState } from "react"
import type { Member } from "@/types/kanban"
import { VoiceInput } from "@/components/voice-input"
import { useLanguage } from "@/contexts/language"

interface Props {
  columnId: string
  members: Member[]
  onClose: () => void
  onCreated: () => void
}

export function CreateTaskModal({ columnId, members, onClose, onCreated }: Props) {
  const { t } = useLanguage()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [assigneeId, setAssigneeId] = useState("")
  const [priority, setPriority] = useState("none")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ columnId, title, description, assigneeId: assigneeId || null, priority }),
    })

    setLoading(false)
    onCreated()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md p-6" style={{ background: "var(--nb-surface)", border: "3px solid var(--nb-border)", boxShadow: "8px 8px 0 var(--nb-shadow)" }} onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-black" style={{ color: "var(--nb-text)" }}>{t("Create Task")}</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2 items-stretch">
            <input
              type="text"
              placeholder={t("Task title")}
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="nb-input block w-full px-3 py-2 text-sm"
            />
            <VoiceInput onTranscribed={(t) => setTitle((prev) => prev + t)} />
          </div>
          <div>
            <textarea
              placeholder={t("Description (optional)")}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="nb-input block w-full px-3 py-2 text-sm resize-none"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="nb-input block w-full px-3 py-2 text-sm"
              >
                <option value="">{t("Unassigned")}</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name ?? m.id}</option>
                ))}
              </select>
            </div>
            <div className="w-28">
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
          </div>
          <div className="flex justify-end gap-2 pt-2">
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
              {loading ? t("Creating...") : t("Create")}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
