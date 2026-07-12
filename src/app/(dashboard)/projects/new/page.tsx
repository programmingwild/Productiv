"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/contexts/language"

const colors = ["#e85d75", "#4ecdc4", "#f7d44a", "#6366f1", "#3b82f6", "#22c55e", "#f59e0b"]

export default function NewProjectPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [color, setColor] = useState("#e85d75")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, color }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? t("Failed to create project"))
      setLoading(false)
      return
    }

    const project = await res.json()
    router.push(`/projects/${project.id}`)
  }

  return (
    <div className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-black mb-6" style={{ color: "var(--nb-text)" }}>{t("New Project")}</h1>
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 text-sm font-bold" style={{ background: "#e85d75", border: "2px solid var(--nb-border)", color: "white" }}>
            {error}
          </div>
        )}
        <div>
          <label className="block text-sm font-bold mb-1" style={{ color: "var(--nb-text)" }}>{t("Name")}</label>
          <input
            type="text" required value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 text-sm font-bold outline-none"
            style={{ background: "var(--nb-surface)", border: "2.5px solid var(--nb-border)", color: "var(--nb-text)" }}
          />
        </div>
        <div>
          <label className="block text-sm font-bold mb-1" style={{ color: "var(--nb-text)" }}>{t("Description")}</label>
          <textarea
            rows={3} value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 text-sm font-bold outline-none resize-none"
            style={{ background: "var(--nb-surface)", border: "2.5px solid var(--nb-border)", color: "var(--nb-text)" }}
          />
        </div>
        <div>
          <label className="block text-sm font-bold mb-2" style={{ color: "var(--nb-text)" }}>{t("Color")}</label>
          <div className="flex gap-2">
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className="h-9 w-9 transition-all"
                style={{
                  background: c,
                  border: color === c ? "3px solid var(--nb-border)" : "3px solid transparent",
                  boxShadow: color === c ? "3px 3px 0 var(--nb-shadow)" : "none",
                }}
              />
            ))}
          </div>
        </div>
        <button
          type="submit" disabled={loading}
          className="w-full py-3 text-sm font-black transition-all disabled:opacity-50"
          style={{ background: "#f7d44a", border: "2.5px solid var(--nb-border)", color: "#1a1a1a", boxShadow: "5px 5px 0 var(--nb-shadow)" }}
        >
          {loading ? t("Creating...") : t("Create Project")}
        </button>
      </form>
    </div>
  )
}
