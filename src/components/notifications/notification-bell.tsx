"use client"

import { useNotificationPanel } from "@/contexts/notification-panel"

export function NotificationBell() {
  const { toggle, unreadCount } = useNotificationPanel()

  return (
    <button
      onClick={toggle}
      className="flex items-center justify-center p-2"
      style={{ width: 36, height: 36, color: "var(--nb-text)", position: "relative", background: "none", border: "none", cursor: "pointer" }}
    >
      <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      {unreadCount > 0 && (
        <span
          className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center text-[10px] font-black"
          style={{ background: "#e85d75", border: "2px solid var(--nb-border)", color: "white" }}
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  )
}
