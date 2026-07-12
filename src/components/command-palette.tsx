"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/contexts/language"

interface SearchResults {
  tasks: { id: string; title: string; priority: string; projectName: string; projectId: string }[]
  projects: { id: string; name: string; color: string }[]
  sprints: { id: string; name: string; status: string }[]
  members: { id: string; name: string; email: string; role: string }[]
}

const priorityColor: Record<string, string> = {
  urgent: "#e85d75", high: "#fb923c", medium: "#f7d44a", low: "#60a5fa", none: "#999",
}

const quickActions = [
  { id: "new-project", label: "New Project", icon: "📁", shortcut: "g p", href: "/projects/new" },
  { id: "new-sprint", label: "New Sprint", icon: "⚡", shortcut: "g s", href: "/sprints" },
  { id: "dashboard", label: "Go to Dashboard", icon: "▣", shortcut: "g d", href: "/dashboard" },
  { id: "team", label: "Go to Team", icon: "◆", shortcut: "g t", href: "/team" },
  { id: "settings", label: "Go to Settings", icon: "⚙", shortcut: "g ,", href: "/settings" },
  { id: "timeline", label: "Go to Timeline", icon: "📅", shortcut: "g l", href: "/timeline" },
]

function highlightMatch(text: string, query: string) {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ background: "#f7d44a", color: "#1a1a1a", padding: "0 1px" }}>{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  )
}

export function CommandPalette() {
  const router = useRouter()
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Restore recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("cmdK_recent")
      if (saved) setRecentSearches(JSON.parse(saved))
    } catch {}
  }, [])

  // Keyboard shortcut
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen((prev) => !prev)
        setQuery("")
        setResults(null)
        setSelectedIdx(0)
      }
      if (e.key === "Escape") {
        setOpen(false)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  // Autofocus
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  // Debounced search with AbortController
  useEffect(() => {
    if (!open || !query.trim()) {
      setResults(null)
      setSelectedIdx(0)
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        if (res.ok) {
          const data = await res.json()
          if (!controller.signal.aborted) setResults(data)
        }
      } catch {
        if (!controller.signal.aborted) setResults(null)
      }
      if (!controller.signal.aborted) setLoading(false)
    }, 150)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, open])

  // Build flat list for keyboard navigation
  const allItems = useCallback(() => {
    const items: { type: string; id: string; label: string; href: string }[] = []

    quickActions.forEach((a) => {
      if (!query || a.label.toLowerCase().includes(query.toLowerCase())) {
        items.push({ type: "action", id: a.id, label: a.label, href: a.href })
      }
    })

    if (results) {
      results.tasks.forEach((t) =>
        items.push({ type: "task", id: t.id, label: t.title, href: `/projects/${t.projectId}/board?task=${t.id}` }),
      )
      results.projects.forEach((p) =>
        items.push({ type: "project", id: p.id, label: p.name, href: `/projects/${p.id}` }),
      )
      results.sprints.forEach((s) =>
        items.push({ type: "sprint", id: s.id, label: s.name, href: `/sprints?id=${s.id}` }),
      )
      results.members.forEach((m) =>
        items.push({ type: "member", id: m.id, label: m.name, href: `/team` }),
      )
    }

    return items
  }, [results, query])

  const items = allItems()

  function handleSelect(idx: number) {
    const item = items[idx]
    if (!item) return
    setOpen(false)
    setQuery("")
    // Save to recent
    try {
      const recent = [item.label, ...recentSearches.filter((r) => r !== item.label)].slice(0, 5)
      setRecentSearches(recent)
      localStorage.setItem("cmdK_recent", JSON.stringify(recent))
    } catch {}
    router.push(item.href)
  }

  // Keyboard navigation
  useEffect(() => {
    if (!open) return
    function handler(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIdx((prev) => Math.min(prev + 1, items.length - 1))
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIdx((prev) => Math.max(prev - 1, 0))
      }
      if (e.key === "Enter") {
        e.preventDefault()
        handleSelect(selectedIdx)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, items, selectedIdx])

  // Scroll selected into view
  useEffect(() => {
    const el = resultsRef.current?.querySelector(`[data-idx="${selectedIdx}"]`)
    el?.scrollIntoView({ block: "nearest" })
  }, [selectedIdx])

  if (!open) return null

  const hasResults = results && (results.tasks.length > 0 || results.projects.length > 0 || results.sprints.length > 0 || results.members.length > 0)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100]"
        style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
        onClick={() => setOpen(false)}
      />

      {/* Palette */}
      <div
        className="fixed z-[101]"
        style={{
          top: "15%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(90vw, 560px)",
        }}
      >
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "var(--nb-surface)",
            border: "3px solid var(--nb-border)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3), 8px 8px 0 var(--nb-shadow)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "2px solid var(--nb-border)" }}>
            <span className="text-base shrink-0">🔍</span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelectedIdx(0) }}
              placeholder={t("Search tasks, projects, sprints, people...")}
              className="flex-1 text-sm font-bold outline-none border-none"
              style={{ background: "transparent", color: "var(--nb-text)" }}
              autoComplete="off"
              spellCheck={false}
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-xs font-black px-2 py-1 rounded" style={{ background: "var(--nb-surface-soft)", border: "1.5px solid var(--nb-border)", color: "var(--nb-text-soft)" }}>
                ✕
              </button>
            )}
            <kbd className="text-[10px] font-black px-1.5 py-0.5 rounded" style={{ background: "var(--nb-surface-soft)", border: "1.5px solid var(--nb-border)", color: "var(--nb-text-soft)" }}>
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div ref={resultsRef} className="max-h-[360px] overflow-y-auto" style={{ scrollBehavior: "smooth" }}>
            {loading && (
              <div className="px-4 py-8 text-center">
                <p className="text-sm font-bold" style={{ color: "var(--nb-text-soft)" }}>{t("Searching...")}</p>
              </div>
            )}

            {!loading && !query && recentSearches.length > 0 && (
              <div className="px-3 py-2">
                <p className="px-2 py-1 text-[10px] font-black uppercase tracking-wider" style={{ color: "var(--nb-text-soft)" }}>{t("Recent")}</p>
                {recentSearches.map((label, i) => (
                  <button
                    key={label}
                    data-idx={i}
                    onClick={() => { setQuery(label) }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all"
                    style={{
                      background: selectedIdx === i ? "color-mix(in srgb, var(--nb-border) 15%, transparent)" : "transparent",
                      color: "var(--nb-text)",
                    }}
                  >
                    <span style={{ color: "var(--nb-text-soft)" }}>🕐</span>
                    {label}
                  </button>
                ))}
              </div>
            )}

            {!loading && !query && recentSearches.length === 0 && (
              <div className="px-3 py-2">
                <p className="px-2 py-1 text-[10px] font-black uppercase tracking-wider" style={{ color: "var(--nb-text-soft)" }}>{t("Quick Actions")}</p>
                {quickActions.map((a, i) => (
                  <button
                    key={a.id}
                    data-idx={i}
                    onClick={() => handleSelect(i)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all"
                    style={{
                      background: selectedIdx === i ? "color-mix(in srgb, var(--nb-border) 15%, transparent)" : "transparent",
                      color: "var(--nb-text)",
                    }}
                  >
                    <span>{a.icon}</span>
                    <span className="flex-1 text-left text-sm font-bold">{a.label}</span>
                    <kbd className="text-[10px] font-black px-1.5 py-0.5 rounded" style={{ background: "var(--nb-surface-soft)", border: "1.5px solid var(--nb-border)", color: "var(--nb-text-soft)" }}>
                      {a.shortcut}
                    </kbd>
                  </button>
                ))}
              </div>
            )}

            {!loading && query && !hasResults && (
              <div className="px-4 py-8 text-center">
                <p className="text-sm font-bold" style={{ color: "var(--nb-text-soft)" }}>{t("No results for \u201c{query}\u201d", { query })}</p>
                <p className="text-xs font-bold mt-1" style={{ color: "var(--nb-text-soft)" }}>{t("Try searching with different keywords")}</p>
              </div>
            )}

            {!loading && results && (hasResults || items.length > 0) && (
              <div className="px-3 py-2">
                {/* Quick actions first if they match */}
                {quickActions.filter((a) => !query || a.label.toLowerCase().includes(query.toLowerCase())).length > 0 && (
                  <>
                    <p className="px-2 py-1 text-[10px] font-black uppercase tracking-wider" style={{ color: "var(--nb-text-soft)" }}>{t("Actions")}</p>
                    {quickActions.map((a, i) => {
                      if (query && !a.label.toLowerCase().includes(query.toLowerCase())) return null
                      const globalIdx = items.findIndex((item) => item.id === a.id)
                      return (
                        <button
                          key={a.id}
                          data-idx={globalIdx}
                          onClick={() => handleSelect(globalIdx)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all"
                          style={{
                            background: selectedIdx === globalIdx ? "color-mix(in srgb, var(--nb-border) 15%, transparent)" : "transparent",
                            color: "var(--nb-text)",
                          }}
                        >
                          <span>{a.icon}</span>
<span className="flex-1 text-left text-sm font-bold">{t(a.label)}</span>
                          <kbd className="text-[10px] font-black px-1.5 py-0.5 rounded" style={{ background: "var(--nb-surface-soft)", border: "1.5px solid var(--nb-border)", color: "var(--nb-text-soft)" }}>
                            {a.shortcut}
                          </kbd>
                        </button>
                      )
                    })}
                  </>
                )}

                {/* Tasks */}
                {results.tasks.length > 0 && (
                  <>
                    <p className="px-2 py-1 mt-1 text-[10px] font-black uppercase tracking-wider" style={{ color: "var(--nb-text-soft)" }}>{t("Tasks")}</p>
                    {results.tasks.map((t, i) => {
                      const globalIdx = items.findIndex((item) => item.id === t.id)
                      return (
                        <button
                          key={t.id}
                          data-idx={globalIdx}
                          onClick={() => handleSelect(globalIdx)}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all"
                          style={{
                            background: selectedIdx === globalIdx ? "color-mix(in srgb, var(--nb-border) 15%, transparent)" : "transparent",
                            color: "var(--nb-text)",
                          }}
                        >
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: priorityColor[t.priority] ?? priorityColor.none }} />
                          <div className="flex-1 text-left min-w-0">
                            <p className="text-sm font-bold truncate">{highlightMatch(t.title, query)}</p>
                            {t.projectName && <p className="text-[10px] font-bold truncate" style={{ color: "var(--nb-text-soft)" }}>{t.projectName}</p>}
                          </div>
                        </button>
                      )
                    })}
                  </>
                )}

                {/* Projects */}
                {results.projects.length > 0 && (
                  <>
                    <p className="px-2 py-1 mt-1 text-[10px] font-black uppercase tracking-wider" style={{ color: "var(--nb-text-soft)" }}>{t("Projects")}</p>
                    {results.projects.map((p, i) => {
                      const globalIdx = items.findIndex((item) => item.id === p.id)
                      return (
                        <button
                          key={p.id}
                          data-idx={globalIdx}
                          onClick={() => handleSelect(globalIdx)}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all"
                          style={{
                            background: selectedIdx === globalIdx ? "color-mix(in srgb, var(--nb-border) 15%, transparent)" : "transparent",
                            color: "var(--nb-text)",
                          }}
                        >
                          <div className="w-3 h-3 shrink-0" style={{ background: p.color, border: "2px solid var(--nb-border)" }} />
                          <span className="flex-1 text-left text-sm font-bold">{highlightMatch(p.name, query)}</span>
                        </button>
                      )
                    })}
                  </>
                )}

                {/* Sprints */}
                {results.sprints.length > 0 && (
                  <>
                    <p className="px-2 py-1 mt-1 text-[10px] font-black uppercase tracking-wider" style={{ color: "var(--nb-text-soft)" }}>{t("Sprints")}</p>
                    {results.sprints.map((s, i) => {
                      const globalIdx = items.findIndex((item) => item.id === s.id)
                      const statusColor = s.status === "ACTIVE" ? "#4ecdc4" : s.status === "COMPLETED" ? "#f7d44a" : "#999"
                      return (
                        <button
                          key={s.id}
                          data-idx={globalIdx}
                          onClick={() => handleSelect(globalIdx)}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all"
                          style={{
                            background: selectedIdx === globalIdx ? "color-mix(in srgb, var(--nb-border) 15%, transparent)" : "transparent",
                            color: "var(--nb-text)",
                          }}
                        >
                          <span>🏃</span>
                          <span className="flex-1 text-left text-sm font-bold">{highlightMatch(s.name, query)}</span>
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded" style={{ background: statusColor, border: "1.5px solid var(--nb-border)", color: "#1a1a1a" }}>{s.status}</span>
                        </button>
                      )
                    })}
                  </>
                )}

                {/* Members */}
                {results.members.length > 0 && (
                  <>
                    <p className="px-2 py-1 mt-1 text-[10px] font-black uppercase tracking-wider" style={{ color: "var(--nb-text-soft)" }}>{t("People")}</p>
                    {results.members.map((m, i) => {
                      const globalIdx = items.findIndex((item) => item.id === m.id)
                      const roleColor = m.role === "OWNER" ? "#f7d44a" : m.role === "ADMIN" ? "#4ecdc4" : "#999"
                      return (
                        <button
                          key={m.id}
                          data-idx={globalIdx}
                          onClick={() => handleSelect(globalIdx)}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all"
                          style={{
                            background: selectedIdx === globalIdx ? "color-mix(in srgb, var(--nb-border) 15%, transparent)" : "transparent",
                            color: "var(--nb-text)",
                          }}
                        >
                          <div className="flex h-6 w-6 items-center justify-center text-[9px] font-black shrink-0" style={{ background: "#f7d44a", border: "1.5px solid var(--nb-border)", color: "#1a1a1a" }}>
                            {m.name[0]?.toUpperCase() ?? "?"}
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <p className="text-sm font-bold truncate">{highlightMatch(m.name, query)}</p>
                            <p className="text-[10px] font-bold truncate" style={{ color: "var(--nb-text-soft)" }}>{m.email}</p>
                          </div>
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded" style={{ background: roleColor, border: "1.5px solid var(--nb-border)", color: "#1a1a1a" }}>{m.role}</span>
                        </button>
                      )
                    })}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer hint */}
          <div className="flex items-center gap-4 px-4 py-2" style={{ borderTop: "2px solid var(--nb-border)", background: "color-mix(in srgb, var(--nb-text) 3%, transparent)" }}>
            <span className="text-[10px] font-bold" style={{ color: "var(--nb-text-soft)" }}>
              <kbd className="mr-1 px-1 py-0.5 rounded" style={{ background: "var(--nb-surface-soft)", border: "1px solid var(--nb-border)" }}>↑↓</kbd>
              {t("Navigate")}
            </span>
            <span className="text-[10px] font-bold" style={{ color: "var(--nb-text-soft)" }}>
              <kbd className="mr-1 px-1 py-0.5 rounded" style={{ background: "var(--nb-surface-soft)", border: "1px solid var(--nb-border)" }}>⏎</kbd>
              {t("Select")}
            </span>
            <span className="text-[10px] font-bold" style={{ color: "var(--nb-text-soft)" }}>
              <kbd className="mr-1 px-1 py-0.5 rounded" style={{ background: "var(--nb-surface-soft)", border: "1px solid var(--nb-border)" }}>⌘K</kbd>
              {t("Toggle")}
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
