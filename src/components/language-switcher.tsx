"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { useLanguage } from "@/contexts/language"
import { LANGUAGES, type LanguageCode } from "@/lib/translations"

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("click", handleClick)
    return () => document.removeEventListener("click", handleClick)
  }, [])

  const toggle = useCallback(() => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left, width: 180 })
    }
    setOpen((v) => !v)
  }, [open])

  const current = LANGUAGES[language]

  return (
    <div ref={ref}>
      <button
        ref={btnRef}
        onClick={toggle}
        title={current.englishName}
        className="flex items-center justify-center transition-all nb-gpu shrink-0"
        style={{
          width: 32,
          height: 32,
          background: open ? "var(--nb-border)" : "var(--nb-surface-soft)",
          border: "2px solid var(--nb-border)",
          color: open ? "white" : "var(--nb-text)",
          cursor: "pointer",
          fontSize: 11,
          fontWeight: 900,
        }}
      >
        {language === "en-IN" ? "EN" : language.slice(0, 2).toUpperCase()}
      </button>

      {open && typeof document === "object" && createPortal(
        <div
          className="nb-scale-in"
          style={{
            position: "fixed",
            top: pos.top,
            left: Math.max(8, Math.min(pos.left, window.innerWidth - 188)),
            width: pos.width,
            zIndex: 9999,
            background: "var(--nb-surface)",
            border: "2.5px solid var(--nb-border)",
            boxShadow: "6px 6px 0 var(--nb-shadow)",
            maxHeight: 280,
            overflowY: "auto",
          }}
        >
          {(Object.entries(LANGUAGES) as [LanguageCode, typeof current][]).map(([code, lang]) => (
            <button
              key={code}
              onClick={() => {
                setLanguage(code)
                setOpen(false)
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs font-bold transition-all"
              style={{
                background: language === code ? "#f7d44a" : "transparent",
                color: "var(--nb-text)",
                borderBottom: "1px solid var(--nb-border)",
              }}
            >
              <span className="shrink-0" style={{ fontSize: 14 }}>{lang.flag}</span>
              <span>{lang.englishName}</span>
              <span style={{ color: "var(--nb-text-soft)", marginLeft: "auto" }}>{lang.name}</span>
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}
