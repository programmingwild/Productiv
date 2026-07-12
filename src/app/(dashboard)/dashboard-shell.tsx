"use client"

import { type ReactNode } from "react"
import { NotificationPanelProvider } from "@/contexts/notification-panel"
import { NotificationPanel } from "@/components/notifications/notification-panel"
import { NotificationToast } from "@/components/notifications/notification-toast"
import { Sidebar } from "@/components/sidebar"
import { MobileNav } from "@/components/mobile-nav"
import type { Team, Project } from "@/generated/prisma-client"
import type { Session } from "next-auth"

interface DashboardShellProps {
  children: ReactNode
  team: Team & { projects: Project[] }
  user: Session["user"]
}

import { CommandPalette } from "@/components/command-palette"

export function DashboardShell({ children, team, user }: DashboardShellProps) {
  return (
    <NotificationPanelProvider userId={user.id}>
      <div className="flex h-screen" style={{ backgroundColor: "var(--nb-bg)" }}>
        <Sidebar team={team} user={user} />
        <MobileNav />
        <CommandPalette />
        <main
          className="flex-1 overflow-auto dashboard-main min-w-0"
          style={{
            background: "var(--nb-bg)",
            backgroundImage: "radial-gradient(ellipse at 50% 0%, color-mix(in srgb, var(--nb-yellow) 3%, transparent) 0%, transparent 60%)",
            backgroundSize: "100% 100%",
          }}
        >
          <div className="mobile-spacer-top" />
          {children}
          <div className="mobile-spacer-bottom" />
        </main>
        <NotificationPanel />
        <NotificationToast userId={user.id} teamId={team.id} />
      </div>
    </NotificationPanelProvider>
  )
}
