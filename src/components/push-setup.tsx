"use client"

import { useState, useEffect, useCallback } from "react"
import { useLanguage } from "@/contexts/language"

export function PushSetup() {
  const { t } = useLanguage()
  const [supported, setSupported] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setSupported("serviceWorker" in navigator && "PushManager" in window)
    checkSubscription()
  }, [])

  async function checkSubscription() {
    try {
      const reg = await navigator.serviceWorker?.ready
      if (!reg) return
      const sub = await reg.pushManager.getSubscription()
      setEnabled(!!sub)
    } catch {}
  }

  const subscribe = useCallback(async () => {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready

      const res = await fetch("/api/push/vapid-public-key")
      const { publicKey } = await res.json()
      if (!publicKey) throw new Error("No VAPID key")

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey,
      })

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      })

      setEnabled(true)
    } catch (err) {
      console.error("Push subscribe failed:", err)
    }
    setLoading(false)
  }, [])

  const unsubscribe = useCallback(async () => {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await sub.unsubscribe()
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
      }
      setEnabled(false)
    } catch (err) {
      console.error("Push unsubscribe failed:", err)
    }
    setLoading(false)
  }, [])

  if (!supported) return null

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-black" style={{ color: "var(--nb-text)" }}>{t("Desktop Push Notifications")}</p>
        <p className="text-xs font-bold mt-0.5" style={{ color: "var(--nb-text-soft)" }}>
          {enabled ? t("Notifications will appear even when the tab is closed") : t("Get native OS notifications")}
        </p>
      </div>
      <button
        onClick={enabled ? unsubscribe : subscribe}
        disabled={loading}
        className="text-xs font-black px-4 py-2 transition-all disabled:opacity-50"
        style={{
          background: enabled ? "#e85d75" : "#4ecdc4",
          border: "2px solid var(--nb-border)",
          color: "#1a1a1a",
        }}
      >
        {loading ? "..." : enabled ? t("Disable") : t("Enable")}
      </button>
    </div>
  )
}
