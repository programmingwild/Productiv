"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { useState, useEffect, useRef } from "react"
import type { Team, Project } from "../generated/prisma-client"
import { NotificationBell } from "./notifications/notification-bell"
import { ThemeToggle } from "./theme-toggle"
import { LanguageSwitcher } from "./language-switcher"
import { useLanguage } from "@/contexts/language"

interface SidebarProps {
  team: Team & { projects: Project[] }
  user: { id: string; name?: string | null; email?: string | null; image?: string | null }
}

interface ProjectData {
  id: string
  name: string
  color: string
}

const itemBorder = "2.5px solid var(--nb-border)"
const accentBg = "#f7d44a"
const accentActive = "#4ecdc4"

function NavLink({
  href,
  icon,
  label,
  isActive,
  badge,
}: {
  href: string
  icon: string
  label: string
  isActive: boolean
  badge?: number
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-3 py-2 text-sm font-bold nb-gpu"
      style={{
        background: isActive ? accentBg : "transparent",
        border: itemBorder,
        color: isActive ? "var(--nb-on-accent)" : "var(--nb-text)",
        textDecoration: "none",
        boxShadow: isActive ? "3px 3px 0 var(--nb-shadow)" : "none",
        cursor: "pointer",
        transition: "box-shadow 0.15s, background 0.15s",
      }}
      onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.boxShadow = "2px 2px 0 var(--nb-shadow)"; }}}
      onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.boxShadow = "none"; }}}
    >
      <span className="w-5 text-center shrink-0">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span
          className="flex h-5 w-5 items-center justify-center text-[10px] font-black shrink-0"
          style={{ background: accentActive, border: "2px solid var(--nb-border)", color: "#1a1a1a" }}
        >
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </Link>
  )
}

function ProjectLink({
  href,
  name,
  color,
  isActive,
}: {
  href: string
  name: string
  color: string
  isActive: boolean
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold nb-gpu"
      style={{
        background: isActive ? accentActive : "transparent",
        border: isActive ? itemBorder : "2.5px solid transparent",
        color: "var(--nb-text)",
        textDecoration: "none",
      }}
    >
      <div
        className="h-2.5 w-2.5 shrink-0 rounded-sm"
        style={{ background: color, border: "2px solid var(--nb-border)" }}
      />
      <span className="truncate">{name}</span>
    </Link>
  )
}

export function Sidebar({ team, user }: SidebarProps) {
  const pathname = usePathname()
  const { t } = useLanguage()
  const [collapsed, setCollapsed] = useState(false)
  const [activityCount, setActivityCount] = useState(0)
  const lastPath = useRef(pathname)

  useEffect(() => {
    if (pathname.startsWith("/activity") && !lastPath.current.startsWith("/activity")) {
      setActivityCount(0)
    }
    lastPath.current = pathname
  }, [pathname])

  useEffect(() => {
    let active = true
    async function fetchUnread() {
      try {
        const res = await fetch("/api/activities/count")
        if (res.ok) {
          const data = await res.json()
          if (active) setActivityCount(data.count ?? 0)
        }
      } catch {}
    }
    fetchUnread()
    const interval = setInterval(fetchUnread, 15000)
    return () => { active = false; clearInterval(interval) }
  }, [team.id])

  const [projects, setProjects] = useState<ProjectData[]>(team.projects)

  useEffect(() => { setProjects(team.projects) }, [team.projects])

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/projects")
        if (!res.ok) return
        const data = await res.json()
        setProjects(data.map((p: { id: string; name: string; color: string }) => ({ id: p.id, name: p.name, color: p.color ?? "#6366f1" })))
      } catch {}
    }, 15000)
    return () => clearInterval(interval)
  }, [team.id])

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: "▣" },
    { label: "Activity", href: "/activity", icon: "📡" },
    { label: "Projects", href: "/projects", icon: "●" },
    { label: "Sprints", href: "/sprints", icon: "⚡" },
    { label: "Timeline", href: "/timeline", icon: "📅" },
    { label: "Team", href: "/team", icon: "◆" },
    { label: "Settings", href: "/settings", icon: "⚙" },
  ]

  return (
    <>
      {collapsed && (
        <div className="sidebar-overlay" onClick={() => setCollapsed(false)} />
      )}

      <button
        className="sidebar-hamburger"
        onClick={() => setCollapsed(true)}
        style={{
          background: "var(--nb-surface)",
          border: itemBorder,
          color: "var(--nb-text)",
        }}
      >
        <span className="text-lg">☰</span>
      </button>

      <aside
        className={`sidebar-main ${collapsed ? "sidebar-open" : ""}`}
        style={{
          backgroundColor: "var(--nb-surface)",
          borderRight: "3px solid var(--nb-border)",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-1 px-3 shrink-0 nb-gpu"
          style={{ height: 56, borderBottom: "3px solid var(--nb-border)", minWidth: 0 }}
        >
          <div
            className="flex h-7 w-7 items-center justify-center text-xs font-black shrink-0 nb-gpu"
            style={{ background: accentBg, border: "2px solid var(--nb-border)", color: "#1a1a1a" }}
          >
            P
          </div>
          <span className="flex-1 font-black text-sm truncate" style={{ color: "var(--nb-text)" }}>{team.name}</span>
          <div className="flex items-center gap-0.5 shrink-0">
            <NotificationBell />
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
          <button
            className="sidebar-close"
            onClick={() => setCollapsed(false)}
            style={{ background: "none", border: "none", color: "var(--nb-text)", cursor: "pointer", padding: 0, width: 20, height: 32, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}
          >
            ✕
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto min-h-0 px-3 py-3 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={t(item.label)}
              isActive={pathname.startsWith(item.href)}
              badge={item.href === "/activity" ? activityCount : undefined}
            />
          ))}

          {/* Upgrade */}
          <div className="h-2" />
          <Link
            href="/pricing"
            className="flex items-center gap-2 px-3 py-2 text-sm font-bold nb-gpu"
            style={{
              background: pathname === "/pricing" ? accentBg : "transparent",
              border: itemBorder,
              color: "var(--nb-text)",
              textDecoration: "none",
              boxShadow: pathname === "/pricing" ? "3px 3px 0 var(--nb-shadow)" : "none",
            }}
          >
            <span className="w-5 text-center shrink-0">★</span>
            <span className="flex-1 truncate">{t("Upgrade")}</span>
            <span
              className="px-2 py-0.5 text-[10px] font-black shrink-0"
              style={{ background: "var(--nb-border)", border: "2px solid var(--nb-border)", color: "white" }}
            >
              {team.planTier}
            </span>
          </Link>

          {/* Projects – 16px (2×8) spacer above */}
          <div className="h-4" />
          <p className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--nb-text-soft)" }}>
            {t("Projects")}
          </p>
          {projects.slice(0, 5).map((project) => (
            <ProjectLink
              key={project.id}
              href={`/projects/${project.id}`}
              name={project.name}
              color={project.color}
              isActive={pathname === `/projects/${project.id}`}
            />
          ))}
        </nav>

        {/* Profile – 48px (6×8) */}
        <div className="shrink-0 px-3 py-3" style={{ borderTop: "3px solid var(--nb-border)" }}>
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center text-sm font-black shrink-0 nb-gpu"
              style={{ background: accentBg, border: "2px solid var(--nb-border)", color: "#1a1a1a" }}
            >
              {user.name?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black truncate" style={{ color: "var(--nb-text)" }}>{user.name}</p>
              <p className="text-[10px] font-bold truncate" style={{ color: "var(--nb-text-soft)" }}>{user.email}</p>
            </div>
            <button
              onClick={() => signOut()}
              className="text-[10px] font-black px-2 py-1.5 nb-gpu shrink-0"
              style={{ background: "var(--nb-surface-soft)", border: "2px solid var(--nb-border)", color: "var(--nb-text)" }}
            >
              {t("Logout")}
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
