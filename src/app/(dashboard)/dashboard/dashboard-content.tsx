"use client"

import { useState, useEffect } from "react"
import { useLanguage } from "@/contexts/language"
import { NotificationBell } from "@/components/notifications/notification-bell"
import { DashboardAnalytics } from "@/components/dashboard-analytics"
import { useActivities } from "@/hooks/use-activities"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

const colors = ["#f7d44a", "#4ecdc4", "#e85d75", "#a8e6cf", "#ff8c42", "#6c5ce7", "#fd79a8", "#00cec9", "#e17055", "#0984e3"]

function colorFromName(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

interface DashboardData {
  team: { id: string; name: string; planTier: string }
  projects: { id: string; name: string; color: string; description: string | null }[]
  members: { id: string; role: string; name: string; email: string }[]
  currentUser: { id: string }
}

export function DashboardContent({ data }: { data: DashboardData }) {
  const { t } = useLanguage()
  const [projects, setProjects] = useState(data.projects)
  const [members, setMembers] = useState(data.members)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [showArchive, setShowArchive] = useState(false)
  const currentUserId = data.members.find((m) => m.id === data.currentUser.id)?.id ?? data.currentUser.id
  const isOwner = members.find((m) => m.id === currentUserId)?.role === "owner"

  const { activities, toggleRead, clearAll } = useActivities(data.team.id)

  useEffect(() => {
    setProjects(data.projects)
    setMembers(data.members)
  }, [data])

  useEffect(() => {
    const client = supabase
    if (!client) return
    const chanName = `dashboard-projects-${data.team.id}-${Math.random().toString(36).slice(2, 8)}`
    let active = true
    try {
      const channel = client
        .channel(chanName)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "projects", filter: `teamId=eq.${data.team.id}` },
          (payload) => {
            if (!active) return
            const raw = payload.new as Record<string, unknown>
            setProjects((prev) => {
              if (prev.find((p) => p.id === raw.id)) return prev
              return [...prev, { id: raw.id as string, name: raw.name as string, color: raw.color as string ?? "#6366f1", description: raw.description as string | null }]
            })
          },
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "projects", filter: `teamId=eq.${data.team.id}` },
          (payload) => {
            if (!active) return
            const raw = payload.new as Record<string, unknown>
            setProjects((prev) => prev.map((p) => p.id === raw.id ? { ...p, name: raw.name as string, color: raw.color as string ?? "#6366f1", description: raw.description as string | null } : p))
          },
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "projects", filter: `teamId=eq.${data.team.id}` },
          (payload) => {
            if (!active) return
            const raw = payload.old as Record<string, unknown>
            setProjects((prev) => prev.filter((p) => p.id !== raw.id))
          },
        )
        .subscribe()
      return () => {
        active = false
        try { client.removeChannel(channel) } catch {}
      }
    } catch {
      return () => { active = false }
    }
  }, [data.team.id])

  const visibleActivities = activities.filter((a) => !dismissed.has(a.id))
  const archivedActivities = activities.filter((a) => dismissed.has(a.id))

  function dismissActivity(id: string) {
    setDismissed((prev) => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }

  function restoreActivity(id: string) {
    setDismissed((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  function changeRole(memberId: string, role: string) {
    setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, role } : m))
  }

  function removeMember(memberId: string) {
    setMembers((prev) => prev.filter((m) => m.id !== memberId))
  }

  return (
    <div className="p-6 space-y-8 max-w-5xl nb-stagger">
      {/* Header */}
      <div className="flex items-center justify-between nb-fade-in-up">
        <div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: "var(--nb-text)" }}>{t("Dashboard")}</h1>
          <p className="text-sm font-bold" style={{ color: "var(--nb-text-soft)" }}>{t("Welcome to {name}", { name: data.team.name })}</p>
        </div>
        <NotificationBell />
      </div>

      {/* Stats */}
      <div className="grid gap-6 sm:grid-cols-3 nb-fade-in-up">
        <div className="nb-card-sm p-6 text-center">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--nb-text)" }}>{t("Projects")}</p>
          <p className="mt-1 text-4xl font-black" style={{ color: "#e85d75" }}>{projects.length}</p>
        </div>
        <div className="nb-card-sm p-6 text-center">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--nb-text)" }}>{t("Team")}</p>
          <p className="mt-1 text-4xl font-black" style={{ color: "#4ecdc4" }}>{data.members.length}</p>
        </div>
        <div className="nb-card-yellow p-6 text-center">
          <p className="text-xs font-bold uppercase tracking-wider">{t("Plan")}</p>
          <p className="mt-1 text-4xl font-black">{data.team.planTier}</p>
        </div>
      </div>

      <DashboardAnalytics teamId={data.team.id} />

      {/* Projects */}
      <div className="nb-fade-in-up">
        <h2 className="text-lg font-black mb-4" style={{ color: "var(--nb-text)" }}>{t("Projects")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.length === 0 ? (
            <div className="nb-card p-8 text-center col-span-full">
              <p className="text-sm font-bold" style={{ color: "var(--nb-text-soft)" }}>{t("No projects yet")}</p>
              <Link href="/projects/new" className="nb-btn-primary mt-3 inline-block px-4 py-2 text-xs font-black">{t("Create project")}</Link>
            </div>
          ) : (
            projects.map((p) => (
              <Link key={p.id} href={`/projects/${p.id}`} className="nb-card nb-card-cinema p-5 block" style={{ textDecoration: "none" }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-4 w-4 shrink-0" style={{ background: p.color ?? "#6366f1", border: "2px solid var(--nb-border)" }} />
                  <h3 className="text-sm font-black truncate" style={{ color: "var(--nb-text)" }}>{p.name}</h3>
                </div>
                {p.description && <p className="text-xs font-bold" style={{ color: "var(--nb-text-soft)" }}>{p.description}</p>}
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Activity Feed */}
      <div className="nb-fade-in-up">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black" style={{ color: "var(--nb-text)" }}>
            {showArchive ? t("Archived Activity") : t("Recent Activity")}
          </h2>
          <div className="flex items-center gap-2">
            {archivedActivities.length > 0 && (
              <button onClick={() => setShowArchive(!showArchive)} className="text-xs font-black px-3 py-1.5 transition-all" style={{ background: showArchive ? "#f7d44a" : "var(--nb-surface)", border: "2px solid var(--nb-border)", color: "var(--nb-text)" }}>
                {showArchive ? `← ${t("Back ({n})", { n: visibleActivities.length })}` : t("Archive ({n})", { n: archivedActivities.length })}
              </button>
            )}
            {visibleActivities.length > 0 && !showArchive && (
              <button onClick={clearAll} className="text-xs font-black px-3 py-1.5" style={{ border: "2px solid var(--nb-border)", color: "#e85d75" }}>{t("Clear all")}</button>
            )}
          </div>
        </div>
        <div className="nb-card divide-y" style={{ overflow: "hidden", borderColor: "var(--nb-border)" }}>
          {(showArchive ? archivedActivities : visibleActivities).length === 0 ? (
            <div className="px-5 py-8 text-center"><p className="text-sm font-bold" style={{ color: "var(--nb-text-soft)" }}>{showArchive ? t("No archived activity") : t("No activity yet")}</p></div>
          ) : (showArchive ? archivedActivities : visibleActivities).map((a) => {
            const userName = a.user?.name ?? t("Unknown")
            const target = (a.metadata as { target?: string } | null)?.target ?? ""
            return (
              <div key={a.id} className="flex items-start gap-3 px-5 py-3.5" style={{ borderColor: "var(--nb-border)", opacity: a.read ? 0.6 : 1 }}>
                <div className="flex h-9 w-9 items-center justify-center text-sm font-bold shrink-0" style={{ background: colorFromName(userName), border: "2.5px solid var(--nb-border)", color: "var(--nb-text)" }}>
                  {userName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold" style={{ color: "var(--nb-text)" }}>
                    <span>{userName}</span> {a.action} <span>{target}</span>
                  </p>
                  <p className="text-xs font-semibold mt-0.5" style={{ color: "var(--nb-text-soft)" }}>{new Date(a.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {showArchive ? (
                    <button onClick={() => restoreActivity(a.id)} className="text-xs font-black px-3 py-2 transition-all" style={{ background: "#4ecdc4", border: "2px solid var(--nb-border)", color: "#1a1a1a" }} title={t("Restore")}>{t("Restore")}</button>
                  ) : (
                    <>
                      <button onClick={() => { toggleRead(a.id); dismissActivity(a.id) }} className="text-sm font-black px-3 py-2 transition-all" style={{ background: "#f7d44a", border: "2px solid var(--nb-border)", color: "#1a1a1a", boxShadow: "3px 3px 0 var(--nb-shadow)" }} title={t("Mark as read")}>{t("Mark read")}</button>
                      <button onClick={() => dismissActivity(a.id)} className="text-sm font-black px-3 py-2 transition-all" style={{ background: "#e85d75", border: "2px solid var(--nb-border)", color: "white", boxShadow: "3px 3px 0 var(--nb-shadow)" }} title={t("Dismiss")}>{t("Dismiss")}</button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Team Members */}
      <div className="nb-fade-in-up">
        <h2 className="text-lg font-black mb-4" style={{ color: "var(--nb-text)" }}>{t("Team")}</h2>
        <div className="nb-card overflow-hidden" style={{ padding: 0 }}>
          {members.map((m, i) => {
            const isOwnerMember = m.role === "owner"
            const canManage = isOwner && !isOwnerMember
            return (
              <div key={m.id} className="flex items-center gap-3 px-5 py-3.5" style={{ borderBottom: i < members.length - 1 ? "2px solid var(--nb-border)" : "none" }}>
                <div className="flex h-10 w-10 items-center justify-center text-sm font-bold shrink-0" style={{ background: isOwnerMember ? "#f7d44a" : m.role === "member" ? "#4ecdc4" : "#e85d75", border: "2.5px solid var(--nb-border)", color: "var(--nb-text)", position: "relative" }}>
                  {m.name[0]}
                  {isOwnerMember && <span className="absolute -bottom-1 -right-1 text-[8px]">👑</span>}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold" style={{ color: "var(--nb-text)" }}>{m.name}</p>
                    {isOwnerMember && <span className="text-[9px] font-black px-1.5 py-0.5" style={{ background: "#f7d44a", border: "1.5px solid var(--nb-border)", color: "#1a1a1a" }}>{t("Owner")}</span>}
                  </div>
                  <p className="text-xs font-semibold" style={{ color: "var(--nb-text-soft)" }}>{m.email}</p>
                </div>
                {canManage ? (
                  <div className="flex items-center gap-2">
                    <select value={m.role} onChange={(e) => changeRole(m.id, e.target.value)} className="text-xs font-bold px-1.5 py-1" style={{ background: "var(--nb-surface)", border: "2px solid var(--nb-border)", color: "var(--nb-text)", outline: "none" }}>
                      <option value="owner">{t("owner")}</option>
                      <option value="member">{t("member")}</option>
                      <option value="viewer">{t("viewer")}</option>
                    </select>
                    <button onClick={() => removeMember(m.id)} className="text-xs font-black px-2 py-1" style={{ background: "#e85d75", border: "2px solid var(--nb-border)", color: "white" }}>✕</button>
                  </div>
                ) : (
                  <span className="nb-tag text-xs font-bold">{m.role}</span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
