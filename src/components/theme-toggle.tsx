"use client"

import { useEffect, useState } from "react"

export function ThemeToggle() {
  const [dark, setDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem("nb-theme")
    if (stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      setDark(true)
      document.documentElement.setAttribute("data-theme", "dark")
    }
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light")
    localStorage.setItem("nb-theme", next ? "dark" : "light")
  }

  if (!mounted) return <div style={{ width: 32, height: 32 }} />

  return (
    <button
      onClick={toggle}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex items-center justify-center transition-all shrink-0"
      style={{
        width: 32,
        height: 32,
        background: dark ? "var(--nb-surface)" : "var(--nb-border)",
        border: "2.5px solid var(--nb-border)",
        color: dark ? "var(--nb-text)" : "#fff",
        cursor: "pointer",
        fontSize: 14,
      }}
    >
      {dark ? "☀" : "☾"}
    </button>
  )
}
