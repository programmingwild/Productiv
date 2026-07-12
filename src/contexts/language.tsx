"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { LanguageCode } from "@/lib/translations"
import { TRANSLATIONS } from "@/lib/translations"

interface LanguageContextType {
  language: LanguageCode
  setLanguage: (code: LanguageCode) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextType | null>(null)

function resolveTemplate(str: string, params?: Record<string, string | number>): string {
  if (!params) return str
  let result = str
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), String(value))
  }
  return result
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>("en-IN")

  useEffect(() => {
    try {
      const stored = localStorage.getItem("preferred-language") as LanguageCode | null
      if (stored && TRANSLATIONS[stored]) {
        setLanguageState(stored)
      }
    } catch {}
  }, [])

  function setLanguage(code: LanguageCode) {
    setLanguageState(code)
    try {
      localStorage.setItem("preferred-language", code)
    } catch {}
  }

  function t(key: string, params?: Record<string, string | number>): string {
    if (language === "en-IN") return resolveTemplate(key, params)
    const dict = TRANSLATIONS[language]
    const translated = dict?.[key]
    if (translated) return resolveTemplate(translated, params)
    return resolveTemplate(key, params)
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider")
  return ctx
}
