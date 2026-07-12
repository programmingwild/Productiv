"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { NotificationBell } from "./notifications/notification-bell"
import { ThemeToggle } from "./theme-toggle"
import { useLanguage } from "@/contexts/language"

const navItems = [
  { label: "Home", href: "/dashboard", icon: "▣" },
  { label: "Projects", href: "/projects", icon: "●" },
  { label: "Sprints", href: "/sprints", icon: "⚡" },
  { label: "Team", href: "/team", icon: "◆" },
  { label: "Settings", href: "/settings", icon: "⚙" },
]

export function MobileNav() {
  const pathname = usePathname()
  const { t } = useLanguage()

  return (
    <>
      {/* Bottom nav */}
      <nav
        className="mobile-bottom-nav"
        style={{
          background: "var(--nb-surface)",
          borderTop: "3px solid var(--nb-border)",
        }}
      >
        <div className="flex items-center justify-around h-full px-2">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center gap-0.5"
                style={{
                  color: isActive ? "var(--nb-text)" : "var(--nb-text-soft)",
                  textDecoration: "none",
                  padding: "4px 8px",
                }}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-[8px] font-black">{t(item.label)}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Top bar */}
      <div
        className="mobile-top-bar"
        style={{
          background: "var(--nb-surface)",
          borderBottom: "3px solid var(--nb-border)",
        }}
      >
        <div className="flex items-center justify-between h-full px-3">
          <Link href="/dashboard" style={{ textDecoration: "none" }}>
            <div className="flex items-center gap-1.5">
              <div
                className="flex h-8 w-8 items-center justify-center text-sm font-black"
                style={{ background: "#f7d44a", border: "2.5px solid var(--nb-border)", color: "#1a1a1a" }}
              >
                P
              </div>
              <span className="font-black text-sm" style={{ color: "var(--nb-text)" }}>{t("Productiv")}</span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </>
  )
}
