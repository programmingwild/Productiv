"use client"

import { useState, useEffect } from "react"
import { useLanguage } from "@/contexts/language"

interface DashboardAnalyticsData {
  totalTasks: number
  completedTasks: number
  overdueTasks: number
  completionRate: number
  memberCount: number
  weeklyChart: { date: string; hours: number }[]
  teamWorkload: { name: string; hours: number }[]
}

export function DashboardAnalytics({ teamId }: { teamId: string }) {
  const { t } = useLanguage()
  const [data, setData] = useState<DashboardAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/time/dashboard")
      .then((r) => {
        if (!r.ok) throw new Error(t("Failed to load analytics"))
        return r.json()
      })
      .then((d: DashboardAnalyticsData) => {
        setData(d)
        setLoading(false)
      })
      .catch(() => {
        setError(t("Failed to load analytics"))
        setLoading(false)
      })
  }, [teamId])

  if (loading) {
    return (
      <div className="nb-fade-in-up">
        <h2 className="text-lg font-black mb-4" style={{ color: "var(--nb-text)" }}>{t("Analytics")}</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="nb-card-sm p-6 animate-pulse" style={{ background: "var(--nb-surface-soft)" }}>
              <div className="h-3 w-16 mb-2" style={{ background: "var(--nb-border)", borderRadius: "4px" }} />
              <div className="h-6 w-12" style={{ background: "var(--nb-border)", borderRadius: "4px" }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="nb-fade-in-up">
        <h2 className="text-lg font-black mb-4" style={{ color: "var(--nb-text)" }}>{t("Analytics")}</h2>
        <div className="nb-card p-6 text-center">
          <p className="text-sm font-bold" style={{ color: "var(--nb-text-soft)" }}>{t("Analytics unavailable")}</p>
        </div>
      </div>
    )
  }

  const maxHours = Math.max(...data.weeklyChart.map((d) => d.hours), 1)
  const maxWorkload = Math.max(...data.teamWorkload.map((w) => w.hours), 1)
  const dayLabels = [t("Sun"), t("Mon"), t("Tue"), t("Wed"), t("Thu"), t("Fri"), t("Sat")]

  return (
    <div className="nb-fade-in-up space-y-6">
      <h2 className="text-lg font-black" style={{ color: "var(--nb-text)" }}>{t("Analytics")}</h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="nb-card-sm p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--nb-text)" }}>{t("Completion Rate")}</p>
          <p className="mt-1 text-2xl font-black" style={{ color: "#4ecdc4" }}>{data.completionRate}%</p>
          <p className="text-[10px] font-semibold mt-1" style={{ color: "var(--nb-text-soft)" }}>
            {data.completedTasks}/{data.totalTasks} {t("tasks")}
          </p>
        </div>
        <div className="nb-card-sm p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--nb-text)" }}>{t("Total Tasks")}</p>
          <p className="mt-1 text-2xl font-black" style={{ color: "#f7d44a" }}>{data.totalTasks}</p>
        </div>
        <div className="nb-card-sm p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--nb-text)" }}>{t("Overdue")}</p>
          <p className="mt-1 text-2xl font-black" style={{ color: data.overdueTasks > 0 ? "#e85d75" : "var(--nb-text)" }}>
            {data.overdueTasks}
          </p>
        </div>
        <div className="nb-card-sm p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--nb-text)" }}>{t("Team Size")}</p>
          <p className="mt-1 text-2xl font-black" style={{ color: "#6c5ce7" }}>{data.memberCount}</p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="nb-card-sm p-4">
          <h3 className="text-xs font-black mb-3" style={{ color: "var(--nb-text)" }}>{t("Weekly Time Tracked")}</h3>
          {data.weeklyChart.every((d) => d.hours === 0) ? (
            <p className="text-xs font-bold text-center py-4" style={{ color: "var(--nb-text-soft)" }}>{t("No time tracked this week")}</p>
          ) : (
            <div className="flex items-end gap-1.5 h-24">
              {data.weeklyChart.map((d, i) => (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full transition-all duration-300"
                    style={{
                      height: `${Math.max((d.hours / maxHours) * 100, 4)}%`,
                      background: "#4ecdc4",
                      border: "1.5px solid var(--nb-border)",
                      minHeight: "4px",
                    }}
                  />
                  <span className="text-[8px] font-bold" style={{ color: "var(--nb-text-soft)" }}>{dayLabels[i]}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="nb-card-sm p-4">
          <h3 className="text-xs font-black mb-3" style={{ color: "var(--nb-text)" }}>{t("Team Workload (hours)")}</h3>
          {data.teamWorkload.length === 0 ? (
            <p className="text-xs font-bold text-center py-4" style={{ color: "var(--nb-text-soft)" }}>{t("No time tracked yet")}</p>
          ) : (
            <div className="space-y-2">
              {data.teamWorkload.map((u) => (
                <div key={u.name} className="flex items-center gap-2">
                  <span className="text-[10px] font-black w-20 truncate" style={{ color: "var(--nb-text)" }}>{u.name}</span>
                  <div className="flex-1 h-4" style={{ background: "var(--nb-surface-soft)", border: "1.5px solid var(--nb-border)" }}>
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${Math.max((u.hours / maxWorkload) * 100, 4)}%`,
                        background: "#f7d44a",
                        minWidth: "4px",
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-black" style={{ color: "var(--nb-text)" }}>{u.hours}h</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <a href="/api/export/tasks" className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-black transition-all" style={{ background: "var(--nb-surface)", border: "2px solid var(--nb-border)", color: "var(--nb-text)", textDecoration: "none" }}>⬇ {t("Export Tasks")}</a>
        <a href="/api/export/time" className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-black transition-all" style={{ background: "var(--nb-surface)", border: "2px solid var(--nb-border)", color: "var(--nb-text)", textDecoration: "none" }}>⬇ {t("Export Time Logs")}</a>
        <a href="/api/export/sprint" className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-black transition-all" style={{ background: "var(--nb-surface)", border: "2px solid var(--nb-border)", color: "var(--nb-text)", textDecoration: "none" }}>⬇ {t("Export Sprints")}</a>
      </div>
    </div>
  )
}
