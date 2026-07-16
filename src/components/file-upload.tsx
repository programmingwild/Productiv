"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { useLanguage } from "@/contexts/language"

interface Attachment {
  id: string
  taskId: string
  name: string
  url: string
  size: number
  mimeType: string
  uploadedBy: string
  createdAt: string
}

interface Props {
  taskId: string
  onAttachmentsChange?: (attachments: Attachment[]) => void
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getIcon(mime: string): string {
  if (mime.startsWith("image/")) return "🖼"
  if (mime.startsWith("video/")) return "🎬"
  if (mime.startsWith("audio/")) return "🎵"
  if (mime.includes("pdf")) return "📄"
  if (mime.includes("zip") || mime.includes("rar") || mime.includes("tar")) return "📦"
  if (mime.includes("text") || mime.includes("document") || mime.includes("sheet")) return "📝"
  return "📎"
}

export function FileUpload({ taskId, onAttachmentsChange }: Props) {
  const { t } = useLanguage()
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [loaded, setLoaded] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const attachmentsRef = useRef(attachments)
  const dragCounter = useRef(0)
  attachmentsRef.current = attachments

  const fetchAttachments = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/attachments`)
      if (res.ok) {
        const data = await res.json()
        setAttachments(data)
        onAttachmentsChange?.(data)
      } else {
        setError(t("Failed to load attachments"))
      }
    } catch {
      setError(t("Network error loading attachments"))
    }
    setLoaded(true)
    setLoading(false)
  }, [taskId, onAttachmentsChange])

  useEffect(() => {
    fetchAttachments()
    const interval = setInterval(fetchAttachments, 15000)
    return () => clearInterval(interval)
  }, [fetchAttachments])

  const doUpload = useCallback(async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setError(t("File too large (max 10MB)"))
      return
    }
    setUploading(true)
    setUploadProgress(0)
    setError("")
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch(`/api/tasks/${taskId}/attachments`, {
        method: "POST",
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json()
        setError(err.error ?? t("Upload failed"))
      } else {
        const attachment = await res.json()
        setAttachments((prev) => [attachment, ...prev])
        onAttachmentsChange?.([attachment, ...attachmentsRef.current])
      }
    } catch {
      setError(t("Upload failed"))
    }
    setUploading(false)
    setUploadProgress(null)
  }, [taskId, onAttachmentsChange])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    await doUpload(file)
    if (inputRef.current) inputRef.current.value = ""
  }

  async function handleDelete(attachmentId: string) {
    const prev = attachments
    setAttachments((prev) => {
      const next = prev.filter((a) => a.id !== attachmentId)
      onAttachmentsChange?.(next)
      return next
    })
    try {
      const res = await fetch(`/api/tasks/${taskId}/attachments?attachmentId=${attachmentId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Delete failed")
    } catch {
      setAttachments(prev)
      onAttachmentsChange?.(prev)
      setError(t("Failed to delete attachment"))
    }
  }

  // Drag-drop handlers
  useEffect(() => {
    const el = dropRef.current
    if (!el) return

    function handleDragEnter(e: DragEvent) {
      e.preventDefault()
      e.stopPropagation()
      dragCounter.current++
      setDragging(true)
    }

    function handleDragOver(e: DragEvent) {
      e.preventDefault()
      e.stopPropagation()
    }

    function handleDragLeave(e: DragEvent) {
      e.preventDefault()
      e.stopPropagation()
      dragCounter.current--
      if (dragCounter.current <= 0) {
        dragCounter.current = 0
        setDragging(false)
      }
    }

    function handleDrop(e: DragEvent) {
      e.preventDefault()
      e.stopPropagation()
      setDragging(false)
      dragCounter.current = 0
      const files = e.dataTransfer?.files
      if (files && files.length > 0) {
        Array.from(files).forEach((f) => doUpload(f))
      }
    }

    el.addEventListener("dragenter", handleDragEnter)
    el.addEventListener("dragover", handleDragOver)
    el.addEventListener("dragleave", handleDragLeave)
    el.addEventListener("drop", handleDrop)

    return () => {
      el.removeEventListener("dragenter", handleDragEnter)
      el.removeEventListener("dragover", handleDragOver)
      el.removeEventListener("dragleave", handleDragLeave)
      el.removeEventListener("drop", handleDrop)
    }
  }, [doUpload])

  return (
    <div ref={dropRef} className="relative">
      {/* Drag overlay */}
      {dragging && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center rounded-lg"
          style={{
            background: "color-mix(in srgb, var(--nb-border) 20%, transparent)",
            border: "3px dashed var(--nb-border)",
            backdropFilter: "blur(2px)",
          }}
        >
          <p className="text-sm font-black" style={{ color: "var(--nb-text)" }}>📂 {t("Drop files here")}</p>
        </div>
      )}

      <div className="flex items-center gap-3 mb-3">
        <p className="text-xs font-black uppercase tracking-wider" style={{ color: "var(--nb-text)" }}>
          {t("Attachments")}{attachments.length > 0 && ` (${attachments.length})`}
        </p>
        <label className="cursor-pointer">
          <input
            ref={inputRef}
            type="file"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
          <span
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black transition-all"
            style={{
              background: uploading ? "var(--nb-surface-soft)" : "var(--nb-border)",
              border: "2px solid var(--nb-border)",
              color: uploading ? "var(--nb-text)" : "white",
              opacity: uploading ? 0.6 : 1,
            }}
          >
            {uploading ? "⏳" : "+"} {uploading ? t("Uploading...") : t("Add file")}
          </span>
        </label>
      </div>

      {error && (
        <p className="text-[10px] font-bold mb-2" style={{ color: "#e85d75" }}>{error}</p>
      )}

      {uploadProgress !== null && (
        <div className="mb-2 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--nb-surface-soft)", border: "1px solid var(--nb-border)" }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(uploadProgress, 100)}%`, background: "var(--nb-border)" }} />
        </div>
      )}

      {loading && !loaded && (
        <p className="text-xs font-bold" style={{ color: "var(--nb-text-soft)" }}>{t("Loading...")}</p>
      )}

      {loaded && attachments.length === 0 && (
        <p className="text-xs font-bold px-1" style={{ color: "var(--nb-text-soft)" }}>
          {t("Drop files anywhere here or click to add")}
        </p>
      )}

      <div className="space-y-1.5">
        {attachments.map((a) => (
          <div
            key={a.id}
            className="flex items-center gap-2 px-2.5 py-1.5 group"
            style={{ background: "var(--nb-surface-soft)", border: "2px solid var(--nb-border)" }}
          >
            {a.mimeType.startsWith("image/") ? (
              <div className="relative">
                <img src={a.url} alt={a.name} className="h-8 w-8 object-cover rounded" style={{ border: "1px solid var(--nb-border)" }} />
                <button
                  onClick={() => {
                    const textarea = document.querySelector("textarea")
                    if (textarea) {
                      const start = textarea.selectionStart
                      textarea.setRangeText(`![${a.name}](${a.url})`, start, start, "end")
                      textarea.dispatchEvent(new Event("input", { bubbles: true }))
                    }
                  }}
                  className="absolute -top-1 -right-1 text-[8px] w-3.5 h-3.5 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: "#4ecdc4", border: "1.5px solid var(--nb-border)", color: "#1a1a1a" }}
                  title={t("Insert into description")}
                >
                  +
                </button>
              </div>
            ) : (
              <span className="text-sm">{getIcon(a.mimeType)}</span>
            )}
            <a
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 min-w-0 text-xs font-bold truncate"
              style={{ color: "var(--nb-text)" }}
            >
              {a.name}
            </a>
            <span className="text-[9px] font-bold shrink-0" style={{ color: "var(--nb-text-soft)" }}>
              {formatSize(a.size)}
            </span>
            <button
              onClick={() => handleDelete(a.id)}
              className="text-[9px] shrink-0 font-black"
              style={{ color: "#e85d75", background: "none", border: "none", cursor: "pointer" }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {uploading && (
        <div className="mt-1 flex items-center gap-2 px-2 py-1.5" style={{ background: "color-mix(in srgb, var(--nb-border) 10%, transparent)", border: "2px dashed var(--nb-border)" }}>
          <span className="text-sm">⏳</span>
          <span className="text-[10px] font-bold" style={{ color: "var(--nb-text-soft)" }}>{t("Uploading...")}</span>
        </div>
      )}
    </div>
  )
}

export async function uploadImageFromClipboard(file: File, taskId: string): Promise<string | null> {
  if (file.size > 10 * 1024 * 1024) return null
  try {
    const formData = new FormData()
    formData.append("file", file)
    const res = await fetch(`/api/tasks/${taskId}/attachments`, {
      method: "POST",
      body: formData,
    })
    if (!res.ok) return null
    const att = await res.json()
    return att.url
  } catch {
    return null
  }
}
