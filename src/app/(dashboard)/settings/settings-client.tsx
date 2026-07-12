"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useLanguage } from "@/contexts/language"
import { useSession } from "next-auth/react"
import { useTimezone } from "@/contexts/timezone"
import { TIMEZONES, detectTimezone } from "@/lib/timezone"
import { PushSetup } from "@/components/push-setup"

interface TeamData {
  id: string
  name: string
  slug: string
  planTier: string
  subscriptionStatus: string | null
  razorpayCustomerId: string | null
}

export function SettingsClient({ team, isOwner }: { team: TeamData; isOwner: boolean }) {
  const { t } = useLanguage()
  const { data: session, update } = useSession()
  const { timezone, setTimezone } = useTimezone()

  const [name, setName] = useState(session?.user?.name ?? "")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [saving, setSaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [profileError, setProfileError] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState("")

  useEffect(() => {
    if (session?.user?.name) setName(session.user.name)
  }, [session?.user?.name])

  async function handleProfileUpdate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setProfileError("")
    setProfileSuccess(false)
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) {
        const err = await res.json()
        setProfileError(err.error ?? t("Failed to update"))
      } else {
        setProfileSuccess(true)
        await update()
      }
    } catch {
      setProfileError(t("Something went wrong"))
    }
    setSaving(false)
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPasswordSaving(true)
    setPasswordError("")
    setPasswordSuccess(false)
    try {
      const res = await fetch("/api/user/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      if (!res.ok) {
        const err = await res.json()
        setPasswordError(err.error ?? t("Failed to change password"))
      } else {
        setPasswordSuccess(true)
        setCurrentPassword("")
        setNewPassword("")
      }
    } catch {
      setPasswordError(t("Something went wrong"))
    }
    setPasswordSaving(false)
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    setAvatarError("")
    try {
      const formData = new FormData()
      formData.append("avatar", file)
      const res = await fetch("/api/user/avatar", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        setAvatarError(data.error ?? t("Upload failed"))
      } else {
        await update()
      }
    } catch {
      setAvatarError(t("Network error — could not upload"))
    }
    setAvatarUploading(false)
  }

  const isOAuth = !session?.user?.email

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-black mb-6" style={{ color: "var(--nb-text)" }}>⚙ {t("Settings")}</h1>

      <div className="space-y-6">
        {/* Profile Section */}
        <div
          className="p-6"
          style={{ background: "var(--nb-surface)", border: "3px solid var(--nb-border)", boxShadow: "8px 8px 0 var(--nb-shadow)" }}
        >
          <h2 className="text-lg font-black mb-4" style={{ color: "var(--nb-text)" }}>{t("Profile")}</h2>

          <div className="flex items-center gap-4 mb-6">
            <div
              className="flex h-16 w-16 items-center justify-center text-xl font-black shrink-0"
              style={{
                background: "#f7d44a",
                border: "3px solid var(--nb-border)",
                color: "#1a1a1a",
                overflow: "hidden",
              }}
            >
              {session?.user?.image ? (
                <img src={session.user.image} alt="" className="h-full w-full object-cover" />
              ) : (
                session?.user?.name?.[0]?.toUpperCase() ?? "U"
              )}
            </div>
            <label className="cursor-pointer">
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              <span
                className="text-xs font-black px-3 py-1.5 transition-all inline-block"
                style={{
                  background: avatarUploading ? "var(--nb-surface-soft)" : "var(--nb-border)",
                  border: "2px solid var(--nb-border)",
                  color: avatarUploading ? "var(--nb-text)" : "white",
                }}
              >
                {avatarUploading ? t("Uploading...") : t("Change photo")}
              </span>
            </label>
          </div>
          {avatarError && <p className="text-xs font-bold mb-3" style={{ color: "#e85d75" }}>{avatarError}</p>}

          <form onSubmit={handleProfileUpdate} className="space-y-3">
            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: "var(--nb-text-soft)" }}>{t("Name")}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="nb-input block w-full px-3 py-2 text-sm"
                style={{ background: "var(--nb-surface)", border: "2.5px solid var(--nb-border)", color: "var(--nb-text)" }}
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: "var(--nb-text-soft)" }}>{t("Email")}</label>
              <p className="text-sm font-bold px-3 py-2" style={{ color: "var(--nb-text-soft)", background: "var(--nb-surface)", border: "2.5px solid var(--nb-border)" }}>
                {session?.user?.email}
              </p>
            </div>
            {profileError && (
              <p className="text-xs font-bold" style={{ color: "#e85d75" }}>{profileError}</p>
            )}
            {profileSuccess && (
              <p className="text-xs font-bold" style={{ color: "#4ecdc4" }}>{t("Profile updated!")}</p>
            )}
            <button
              type="submit"
              disabled={saving}
              className="text-xs font-black px-4 py-2 transition-all disabled:opacity-50"
              style={{ background: "#f7d44a", border: "2px solid var(--nb-border)", color: "#1a1a1a" }}
            >
              {saving ? t("Saving...") : t("Save")}
            </button>
          </form>

          {/* Password Change */}
          <div className="mt-8 pt-6" style={{ borderTop: "2px solid var(--nb-border)" }}>
            <h3 className="text-base font-black mb-4" style={{ color: "var(--nb-text)" }}>{t("Change Password")}</h3>
            {isOAuth ? (
              <p className="text-xs font-bold" style={{ color: "var(--nb-text-soft)" }}>
                {t("Password management is handled by your OAuth provider.")}
              </p>
            ) : (
              <form onSubmit={handlePasswordChange} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: "var(--nb-text-soft)" }}>{t("Current Password")}</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="nb-input block w-full px-3 py-2 text-sm"
                    style={{ background: "var(--nb-surface)", border: "2.5px solid var(--nb-border)", color: "var(--nb-text)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: "var(--nb-text-soft)" }}>{t("New Password")}</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="nb-input block w-full px-3 py-2 text-sm"
                    style={{ background: "var(--nb-surface)", border: "2.5px solid var(--nb-border)", color: "var(--nb-text)" }}
                  />
                </div>
                {passwordError && (
                  <p className="text-xs font-bold" style={{ color: "#e85d75" }}>{passwordError}</p>
                )}
                {passwordSuccess && (
                  <p className="text-xs font-bold" style={{ color: "#4ecdc4" }}>{t("Password changed!")}</p>
                )}
                <button
                  type="submit"
                  disabled={passwordSaving || !currentPassword || !newPassword}
                  className="text-xs font-black px-4 py-2 transition-all disabled:opacity-50"
                  style={{ background: "#4ecdc4", border: "2px solid var(--nb-border)", color: "#1a1a1a" }}
                >
                  {passwordSaving ? t("Changing...") : t("Change password")}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Timezone Section */}
        <div
          className="p-6"
          style={{ background: "var(--nb-surface)", border: "3px solid var(--nb-border)", boxShadow: "8px 8px 0 var(--nb-shadow)" }}
        >
          <h2 className="text-lg font-black mb-4" style={{ color: "var(--nb-text)" }}>{t("Time Zone")}</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: "var(--nb-text-soft)" }}>{t("Preferred Timezone")}</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="nb-input block w-full px-3 py-2 text-sm"
                style={{ background: "var(--nb-surface)", border: "2.5px solid var(--nb-border)", color: "var(--nb-text)" }}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
              <p className="text-[10px] font-bold mt-1" style={{ color: "var(--nb-text-soft)" }}>
                {t("Detected: {tz} · All dates will be shown in this timezone", { tz: detectTimezone() })}
              </p>
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <div
          className="p-6"
          style={{ background: "var(--nb-surface)", border: "3px solid var(--nb-border)", boxShadow: "8px 8px 0 var(--nb-shadow)" }}
        >
          <h2 className="text-lg font-black mb-4" style={{ color: "var(--nb-text)" }}>{t("Notifications")}</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-black mb-3" style={{ color: "var(--nb-text)" }}>{t("Desktop Push")}</h3>
              <PushSetup />
            </div>
          </div>
        </div>

        {/* Workspace Section */}
        <div
          className="p-6"
          style={{ background: "var(--nb-surface)", border: "3px solid var(--nb-border)", boxShadow: "8px 8px 0 var(--nb-shadow)" }}
        >
          <h2 className="text-lg font-black mb-4" style={{ color: "var(--nb-text)" }}>{t("Workspace")}</h2>
          <WorkspaceSettings team={team} isOwner={isOwner} />
        </div>

        {/* Subscription Section */}
        <div
          className="p-6"
          style={{ background: "var(--nb-surface)", border: "3px solid var(--nb-border)", boxShadow: "8px 8px 0 var(--nb-shadow)" }}
        >
          <h2 className="text-lg font-black mb-4" style={{ color: "var(--nb-text)" }}>{t("Subscription")}</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-black" style={{ color: "var(--nb-text)" }}>
                  {team.planTier === "FREE" ? t("Free Plan") : t("{planTier} Plan", { planTier: team.planTier })}
                </p>
                <p className="text-xs font-bold" style={{ color: "var(--nb-text-soft)" }}>
                  {team.subscriptionStatus
                    ? t("Status: {status}", { status: team.subscriptionStatus.toLowerCase() })
                    : t("No active subscription")}
                </p>
              </div>
              {team.subscriptionStatus === "ACTIVE" ? (
                <Link
                  href="/pricing"
                  className="text-xs font-black px-4 py-2 transition-all"
                  style={{ background: "#4ecdc4", border: "2px solid var(--nb-border)", color: "#1a1a1a" }}
                >
                  {t("Change Plan")}
                </Link>
              ) : (
                <Link
                  href="/pricing"
                  className="text-xs font-black px-4 py-2 transition-all"
                  style={{ background: "#f7d44a", border: "2px solid var(--nb-border)", color: "#1a1a1a", boxShadow: "3px 3px 0 var(--nb-shadow)" }}
                >
                  {t("Upgrade")}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function WorkspaceSettings({ team, isOwner }: { team: TeamData; isOwner: boolean }) {
  const { t } = useLanguage()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(team.name)
  const [slug, setSlug] = useState(team.slug)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  async function handleSave() {
    setSaving(true)
    setError("")
    setSuccess("")
    try {
      const res = await fetch("/api/team/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? t("Failed to update"))
        return
      }
      setName(data.name)
      setSlug(data.slug)
      setSuccess(t("Workspace updated!"))
      setEditing(false)
      setTimeout(() => setSuccess(""), 3000)
    } catch {
      setError(t("Something went wrong"))
    }
    setSaving(false)
  }

  if (!isOwner) {
    return (
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-bold mb-1" style={{ color: "var(--nb-text-soft)" }}>{t("Name")}</label>
          <p className="text-sm font-black" style={{ color: "var(--nb-text)" }}>{team.name}</p>
        </div>
        <div>
          <label className="block text-xs font-bold mb-1" style={{ color: "var(--nb-text-soft)" }}>{t("Slug")}</label>
          <p className="text-sm font-black" style={{ color: "var(--nb-text)" }}>{team.slug}</p>
        </div>
        <p className="text-[10px] font-bold" style={{ color: "var(--nb-text-soft)" }}>{t("Only the workspace owner can edit these settings.")}</p>
      </div>
    )
  }

  if (!editing) {
    return (
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-bold mb-1" style={{ color: "var(--nb-text-soft)" }}>{t("Name")}</label>
          <p className="text-sm font-black" style={{ color: "var(--nb-text)" }}>{team.name}</p>
        </div>
        <div>
          <label className="block text-xs font-bold mb-1" style={{ color: "var(--nb-text-soft)" }}>{t("Slug")}</label>
          <p className="text-sm font-black" style={{ color: "var(--nb-text)" }}>{team.slug}</p>
        </div>
        <button
          onClick={() => setEditing(true)}
          className="text-xs font-black px-4 py-2 transition-all"
          style={{ background: "#f7d44a", border: "2px solid var(--nb-border)", color: "#1a1a1a" }}
        >
          {t("Edit workspace")}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-bold mb-1" style={{ color: "var(--nb-text-soft)" }}>{t("Name")}</label>
        <input
          type="text" value={name}
          onChange={(e) => setName(e.target.value)}
          className="nb-input block w-full px-3 py-2 text-sm"
          style={{ background: "var(--nb-surface)", border: "2.5px solid var(--nb-border)", color: "var(--nb-text)" }}
        />
      </div>
      <div>
        <label className="block text-xs font-bold mb-1" style={{ color: "var(--nb-text-soft)" }}>{t("Slug")}</label>
        <input
          type="text" value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="nb-input block w-full px-3 py-2 text-sm"
          style={{ background: "var(--nb-surface)", border: "2.5px solid var(--nb-border)", color: "var(--nb-text)" }}
        />
      </div>
      {error && <p className="text-xs font-bold" style={{ color: "#e85d75" }}>{error}</p>}
      {success && <p className="text-xs font-bold" style={{ color: "#4ecdc4" }}>{success}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-xs font-black px-4 py-2 transition-all disabled:opacity-50"
          style={{ background: "#4ecdc4", border: "2px solid var(--nb-border)", color: "#1a1a1a" }}
        >
          {saving ? t("Saving...") : t("Save")}
        </button>
        <button
          onClick={() => { setEditing(false); setName(team.name); setSlug(team.slug) }}
          className="text-xs font-black px-4 py-2 transition-all"
          style={{ background: "var(--nb-surface-soft)", border: "2px solid var(--nb-border)", color: "var(--nb-text)" }}
        >
          {t("Cancel")}
        </button>
      </div>
    </div>
  )
}
