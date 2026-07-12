"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { getStoredTimezone, setStoredTimezone } from "@/lib/timezone"

interface TimezoneContextType {
  timezone: string
  setTimezone: (tz: string) => void
}

const TimezoneContext = createContext<TimezoneContextType | null>(null)

export function TimezoneProvider({ children }: { children: ReactNode }) {
  const [timezone, setTimezoneState] = useState("UTC")

  useEffect(() => {
    setTimezoneState(getStoredTimezone())
  }, [])

  function setTimezone(tz: string) {
    setTimezoneState(tz)
    setStoredTimezone(tz)
  }

  return (
    <TimezoneContext.Provider value={{ timezone, setTimezone }}>
      {children}
    </TimezoneContext.Provider>
  )
}

export function useTimezone() {
  const ctx = useContext(TimezoneContext)
  if (!ctx) throw new Error("useTimezone must be used within TimezoneProvider")
  return ctx
}
