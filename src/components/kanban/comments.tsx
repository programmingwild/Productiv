"use client"

import { useState, useEffect, useRef } from "react"
import { useLanguage } from "@/contexts/language"

interface Comment {
  id: string
  content: string
  createdAt: string
  user: { id: string; name: string | null; image: string | null }
}

interface Props {
  taskId: string
}

export function TaskComments({ taskId }: Props) {
  const { t } = useLanguage()
  const [comments, setComments] = useState<Comment[]>([])
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const stableTaskId = useRef(taskId)

  useEffect(() => { stableTaskId.current = taskId }, [taskId])

  useEffect(() => {
    async function fetchComments() {
      try {
        setError("")
        const res = await fetch(`/api/tasks/${taskId}/comments`)
        const data = await res.json()
        setComments(data)
      } catch {
        setError(t("Failed to load comments"))
      } finally {
        setLoading(false)
      }
    }
    fetchComments()
    const interval = setInterval(fetchComments, 15000)
    return () => clearInterval(interval)
  }, [taskId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setSending(true)

    const res = await fetch(`/api/tasks/${taskId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })

    if (res.ok) {
      const comment = await res.json()
      setComments((prev) => [...prev, comment])
      setContent("")
      setError("")
    } else {
      const data = await res.json().catch(() => ({ error: t("Failed to post comment") }))
      setError(data.error ?? t("Failed to post comment"))
    }
    setSending(false)
  }

  return (
    <div className="pt-3 mt-3" style={{ borderTop: "2px solid var(--nb-border)" }}>
      <h4 className="text-xs font-black uppercase mb-2" style={{ color: "var(--nb-text)" }}>
        {t("Comments ({n})", { n: comments.length })}
      </h4>

      {loading ? (
        <p className="text-xs font-bold" style={{ color: "var(--nb-text-soft)" }}>{t("Loading...")}</p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
          {comments.length === 0 && (
            <p className="text-xs font-bold" style={{ color: "var(--nb-text-soft)" }}>{t("No comments yet")}</p>
          )}
          {comments.map((comment) => (
            <div key={comment.id} className="p-2" style={{ background: "var(--nb-surface-soft)", border: "1.5px solid var(--nb-border)" }}>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black" style={{ color: "var(--nb-text)" }}>
                  {comment.user.name ?? t("Unknown")}
                </span>
                <span className="text-[10px] font-bold" style={{ color: "var(--nb-text-soft)" }}>
                  {new Date(comment.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="mt-0.5 text-xs font-semibold" style={{ color: "var(--nb-text)" }}>{comment.content}</p>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-xs font-bold mb-2" style={{ color: "#e85d75" }}>{error}</p>}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          placeholder={t("Add a comment... (@mention)")}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="nb-input flex-1 px-2 py-1.5 text-xs"
        />
        <button
          type="submit"
          disabled={sending || !content.trim()}
          className="nb-btn-accent px-4 py-1.5 text-xs font-black"
        >
          {sending ? "..." : t("Send")}
        </button>
      </form>
    </div>
  )
}
