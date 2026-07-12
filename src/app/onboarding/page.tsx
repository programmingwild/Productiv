"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useLanguage } from "@/contexts/language"

export default function OnboardingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { t } = useLanguage()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login")
    }
  }, [status, router])

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return
    fetch("/api/teams/membership")
      .then((res) => res.json())
      .then((data) => {
        if (data.hasTeam) {
          router.replace("/dashboard")
        }
      })
      .catch(() => {})
  }, [session, status, router])

  if (status === "loading") return null

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "var(--nb-bg)" }}>
      <div className="w-full max-w-lg nb-card p-8">
        <h1 className="text-2xl font-black" style={{ color: "var(--nb-text)" }}>{t("Welcome to Productiv")}</h1>
        <p className="mt-1 text-sm font-bold" style={{ color: "var(--nb-text-soft)" }}>{t("Let's set up your workspace.")}</p>
        <form action="/api/teams" method="POST" className="mt-6 space-y-5">
          <div>
            <label htmlFor="teamName" className="block text-sm font-bold mb-1" style={{ color: "var(--nb-text)" }}>
              {t("Workspace name")}
            </label>
            <input
              id="teamName"
              name="name"
              type="text"
              required
              className="nb-input w-full px-4 py-2.5 text-sm font-semibold"
            />
          </div>
          <button
            type="submit"
            className="nb-btn-primary w-full py-2.5 text-sm font-black"
          >
            {t("Create workspace")}
          </button>
        </form>
      </div>
    </div>
  )
}
