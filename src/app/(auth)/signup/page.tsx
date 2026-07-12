"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/contexts/language"
import { AnimatedBackground } from "@/components/animated-background"

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [teamName, setTeamName] = useState("")
  const [error, setError] = useState("")
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, teamName }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? t("Something went wrong"))
      setLoading(false)
      return
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (result?.ok) {
      router.push("/onboarding")
      router.refresh()
    }
  }

  return (
    <div className="auth-mesh relative flex min-h-screen items-center justify-center overflow-hidden">
      <AnimatedBackground />
      <div className="auth-orb-2 absolute -top-10 right-10 h-80 w-80 rounded-full opacity-25" style={{ background: "#4ecdc4", filter: "blur(90px)" }} />
      <div className="auth-orb-1 absolute bottom-20 -left-20 h-72 w-72 rounded-full opacity-20" style={{ background: "#e85d75", filter: "blur(80px)" }} />
      <div className="absolute top-1/2 left-1/3 h-48 w-48 rounded-full opacity-15" style={{ background: "#f7d44a", filter: "blur(70px)" }} />

      <div
        className="relative w-full max-w-md p-8"
        style={{
          background: "rgba(255, 255, 255, 0.08)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "2px solid rgba(255, 255, 255, 0.15)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
        }}
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black" style={{ color: "#fff" }}>{t("Create your account")}</h1>
          <p className="mt-2 text-sm font-semibold" style={{ color: "rgba(255,255,255,0.6)" }}>{t("Start your free trial")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="px-4 py-3 text-sm font-bold" style={{ background: "rgba(232, 93, 117, 0.2)", border: "2px solid rgba(232, 93, 117, 0.4)", color: "#f7a8b8" }}>
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-bold mb-1" style={{ color: "rgba(255,255,255,0.7)" }}>{t("Full name")}</label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 text-sm font-semibold outline-none transition-all"
              style={{
                background: "rgba(255, 255, 255, 0.06)",
                border: "2px solid rgba(255, 255, 255, 0.12)",
                color: "#fff",
              }}
              onFocus={(e) => e.target.style.borderColor = "rgba(255,255,255,0.4)"}
              onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-bold mb-1" style={{ color: "rgba(255,255,255,0.7)" }}>{t("Email")}</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 text-sm font-semibold outline-none transition-all"
              style={{
                background: "rgba(255, 255, 255, 0.06)",
                border: "2px solid rgba(255, 255, 255, 0.12)",
                color: "#fff",
              }}
              onFocus={(e) => e.target.style.borderColor = "rgba(255,255,255,0.4)"}
              onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-bold mb-1" style={{ color: "rgba(255,255,255,0.7)" }}>{t("Password")}</label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 text-sm font-semibold outline-none transition-all"
              style={{
                background: "rgba(255, 255, 255, 0.06)",
                border: "2px solid rgba(255, 255, 255, 0.12)",
                color: "#fff",
              }}
              onFocus={(e) => e.target.style.borderColor = "rgba(255,255,255,0.4)"}
              onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
            />
          </div>

          <div>
            <label htmlFor="teamName" className="block text-sm font-bold mb-1" style={{ color: "rgba(255,255,255,0.7)" }}>{t("Team name")}</label>
            <input
              id="teamName"
              type="text"
              required
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="w-full px-4 py-2.5 text-sm font-semibold outline-none transition-all"
              style={{
                background: "rgba(255, 255, 255, 0.06)",
                border: "2px solid rgba(255, 255, 255, 0.12)",
                color: "#fff",
              }}
              onFocus={(e) => e.target.style.borderColor = "rgba(255,255,255,0.4)"}
              onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 text-sm font-black transition-all"
            style={{
              background: "rgba(255, 255, 255, 0.12)",
              border: "2px solid rgba(255, 255, 255, 0.2)",
              color: "#fff",
              backdropFilter: "blur(8px)",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)"}
          >
            {loading ? t("Creating account...") : t("Create account")}
          </button>
        </form>

        <p className="mt-6 text-center text-sm font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>
          {t("Already have an account?")}{" "}
          <a href="/login" className="font-black transition-colors" style={{ color: "rgba(255,255,255,0.8)" }} onMouseEnter={(e) => e.currentTarget.style.color = "#fff"} onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.8)"}>
            {t("Sign in")}
          </a>
        </p>
      </div>
    </div>
  )
}
