"use client"

import { useState, useEffect } from "react"
import { useLanguage } from "@/contexts/language"
import { supabase } from "@/lib/supabase"

interface MemberData {
  id: string
  userId: string
  role: string
  name: string
  email: string
  image: string | null
}

export function TeamClient({
  members: initialMembers,
  teamName,
  teamId,
  currentUserId,
}: {
  members: MemberData[]
  teamName: string
  teamId: string
  currentUserId: string
}) {
  const { t } = useLanguage()
  const [members, setMembers] = useState(initialMembers)
  const [inviteEmail, setInviteEmail] = useState("")
  const [showInvite, setShowInvite] = useState(false)
  const [error, setError] = useState("")
  const [inviteError, setInviteError] = useState("")
  const [inviteSuccess, setInviteSuccess] = useState("")

  useEffect(() => {
    setMembers(initialMembers)
  }, [initialMembers])

  useEffect(() => {
    const client = supabase
    if (!client) return
    const chanName = `team-members-${teamId}-${Math.random().toString(36).slice(2, 8)}`
    let active = true
    try {
      const channel = client
        .channel(chanName)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "team_members", filter: `teamId=eq.${teamId}` },
          (payload) => {
            if (!active) return
            const raw = payload.new as Record<string, unknown>
            fetch(`/api/users/${raw.userId as string}/minimal`).then((r) => r.json()).then((user) => {
              if (!active) return
              setMembers((prev) => {
                if (prev.find((m) => m.id === raw.id)) return prev
                return [...prev, { id: raw.id as string, userId: raw.userId as string, role: (raw.role as string).toLowerCase(), name: user.name ?? t("Unknown"), email: user.email ?? "", image: user.image ?? null }]
              })
            }).catch(() => {})
          },
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "team_members", filter: `teamId=eq.${teamId}` },
          (payload) => {
            if (!active) return
            const raw = payload.new as Record<string, unknown>
            setMembers((prev) => prev.map((m) => m.id === raw.id ? { ...m, role: (raw.role as string).toLowerCase() } : m))
          },
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "team_members", filter: `teamId=eq.${teamId}` },
          (payload) => {
            if (!active) return
            const raw = payload.old as Record<string, unknown>
            setMembers((prev) => prev.filter((m) => m.id !== raw.id))
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
  }, [teamId])

  const isOwner = members.find((m) => m.userId === currentUserId)?.role === "owner"

  async function changeRole(memberId: string, role: string) {
    setError("")
    const prev = members
    setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, role } : m))
    try {
      const res = await fetch(`/api/team/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: role.toUpperCase() }),
      })
      if (!res.ok) {
        const err = await res.json()
        setError(err.error ?? t("Failed to update role"))
        setMembers(prev)
      }
    } catch {
      setError(t("Failed to update role"))
      setMembers(prev)
    }
  }

  async function removeMember(memberId: string) {
    setError("")
    const prev = members
    setMembers((prev) => prev.filter((m) => m.id !== memberId))
    try {
      const res = await fetch(`/api/team/members/${memberId}`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json()
        setError(err.error ?? t("Failed to remove member"))
        setMembers(prev)
      }
    } catch {
      setError(t("Failed to remove member"))
      setMembers(prev)
    }
  }

  async function handleInvite() {
    setInviteError("")
    setInviteSuccess("")
    if (!inviteEmail.trim()) return
    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail }),
      })
      const data = await res.json()
      if (!res.ok) {
        setInviteError(data.error ?? t("Failed to invite"))
        return
      }
      setMembers((prev) => [...prev, data])
      setInviteEmail("")
      setShowInvite(false)
      setInviteSuccess(t("Invite sent!"))
      setTimeout(() => setInviteSuccess(""), 3000)
    } catch {
      setInviteError(t("Something went wrong"))
    }
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: "var(--nb-text)" }}>{t("Team")}</h1>
          <p className="text-sm font-bold" style={{ color: "var(--nb-text-soft)" }}>
            {teamName} · {t("{n} members", { n: members.length })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isOwner && (
            <button
              onClick={() => setShowInvite(!showInvite)}
              className="text-xs font-black px-3 py-1.5 transition-all"
              style={{
                background: "#4ecdc4",
                border: "3px solid var(--nb-border)",
                color: "#1a1a1a",
                boxShadow: "4px 4px 0 var(--nb-shadow)",
              }}
            >
              {t("+ Invite")}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 text-xs font-bold text-center" style={{ background: "#e85d75", border: "2px solid var(--nb-border)", color: "white" }}>
          {error}
        </div>
      )}

      {inviteSuccess && (
        <div className="mb-4 p-3 text-xs font-bold text-center" style={{ background: "#4ecdc4", border: "2px solid var(--nb-border)", color: "#1a1a1a" }}>
          {inviteSuccess}
        </div>
      )}

      {showInvite && (
        <div
          className="mb-6 p-4 flex gap-3 items-center"
          style={{
            background: "var(--nb-surface)",
            border: "3px solid var(--nb-border)",
            boxShadow: "6px 6px 0 var(--nb-shadow)",
          }}
        >
          <input
            type="email" placeholder={t("Enter email address...")} value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleInvite() }}
            className="flex-1 px-3 py-2 text-sm font-bold"
            style={{ background: "var(--nb-surface-soft)", border: "2px solid var(--nb-border)", color: "var(--nb-text)", outline: "none" }}
          />
          <button
            onClick={handleInvite}
            className="text-xs font-black px-4 py-2 transition-all"
            style={{ background: "#f7d44a", border: "2px solid var(--nb-border)", color: "#1a1a1a" }}
          >
            {t("Send invite")}
          </button>
          {inviteError && <p className="text-xs font-bold shrink-0 max-w-[200px]" style={{ color: "#e85d75" }}>{inviteError}</p>}
        </div>
      )}

      <div
        style={{
          background: "var(--nb-surface)",
          border: "3px solid var(--nb-border)",
          boxShadow: "8px 8px 0 var(--nb-shadow)",
          overflow: "hidden",
        }}
      >
        {members.map((m, i) => {
          const isOwnerMember = m.role === "owner"
          const canManage = isOwner && m.userId !== currentUserId && !isOwnerMember
          return (
            <div
              key={m.id}
              className="flex items-center gap-3 px-5 py-4"
              style={{ borderBottom: i < members.length - 1 ? "2px solid var(--nb-border)" : "none" }}
            >
              <div
                className="flex h-11 w-11 items-center justify-center text-base font-black shrink-0"
                style={{
                  background: isOwnerMember ? "#f7d44a" : m.role === "member" ? "#4ecdc4" : "#e85d75",
                  border: "3px solid var(--nb-border)",
                  color: "#1a1a1a",
                  position: "relative",
                }}
              >
                {m.name[0]}
                {isOwnerMember && <span className="absolute -bottom-1 -right-1 text-[10px]">👑</span>}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-base font-black" style={{ color: "var(--nb-text)" }}>{m.name}</p>
                  {isOwnerMember && (
                    <span className="text-[9px] font-black px-1.5 py-0.5" style={{ background: "#f7d44a", border: "2px solid var(--nb-border)", color: "#1a1a1a" }}>
                      {t("Owner")}
                    </span>
                  )}
                  {m.userId === currentUserId && !isOwnerMember && (
                    <span className="text-[9px] font-black px-1.5 py-0.5" style={{ background: "#4ecdc4", border: "2px solid var(--nb-border)", color: "#1a1a1a" }}>
                      {t("You")}
                    </span>
                  )}
                </div>
                <p className="text-xs font-bold mt-0.5" style={{ color: "var(--nb-text-soft)" }}>{m.email}</p>
              </div>
              {canManage ? (
                <div className="flex items-center gap-2">
                  <select
                    value={m.role}
                    onChange={(e) => changeRole(m.id, e.target.value)}
                    className="text-xs font-bold px-2 py-1.5"
                    style={{ background: "var(--nb-surface-soft)", border: "2px solid var(--nb-border)", color: "var(--nb-text)", outline: "none" }}
                  >
                    <option value="member">{t("member")}</option>
                    <option value="viewer">{t("viewer")}</option>
                  </select>
                  <button
                    onClick={() => removeMember(m.id)}
                    className="text-xs font-black px-3 py-1.5 transition-all"
                    style={{ background: "#e85d75", border: "2px solid var(--nb-border)", color: "white", boxShadow: "3px 3px 0 var(--nb-shadow)" }}
                  >
                    {t("Remove")}
                  </button>
                </div>
              ) : (
                <span className="text-xs font-black px-3 py-1.5" style={{ background: "var(--nb-surface-soft)", border: "2px solid var(--nb-border)", color: "var(--nb-text)" }}>
                  {m.role}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
