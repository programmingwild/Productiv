"use client"

export function detectTimezone(): string {
  if (typeof Intl === "undefined") return "UTC"
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

export function getStoredTimezone(): string {
  if (typeof window === "undefined") return "UTC"
  return localStorage.getItem("nb-timezone") ?? detectTimezone()
}

export function setStoredTimezone(tz: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("nb-timezone", tz)
  }
}

export function formatInTimezone(date: string | Date, tz: string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === "string" ? new Date(date) : date
  const defaults: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
  }
  return d.toLocaleDateString("en-US", { ...defaults, ...options })
}

export function formatDateInTimezone(date: string | Date, tz: string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: tz,
  })
}

export function timeAgo(date: string | Date): string {
  const diff = Date.now() - (typeof date === "string" ? new Date(date).getTime() : date.getTime())
  const min = Math.floor(diff / 60000)
  if (min < 1) return "now"
  if (min < 60) return `${min}m ago`
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Asia/Hong_Kong",
  "Australia/Sydney",
  "Pacific/Auckland",
] as const
