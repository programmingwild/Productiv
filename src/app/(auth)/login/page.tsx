"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/contexts/language"
import { AnimatedBackground } from "@/components/animated-background"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError(t("Invalid email or password"))
      setLoading(false)
    } else {
      router.push("/dashboard")
      router.refresh()
    }
  }

  return (
    <div className="auth-mesh relative flex min-h-screen items-center justify-center overflow-hidden">
      <AnimatedBackground />
      <div className="auth-orb-1 absolute top-20 -left-20 h-72 w-72 rounded-full opacity-30" style={{ background: "#e85d75", filter: "blur(80px)" }} />
      <div className="auth-orb-2 absolute bottom-10 -right-10 h-80 w-80 rounded-full opacity-20" style={{ background: "#4ecdc4", filter: "blur(100px)" }} />
      <div className="auth-orb-3 absolute top-1/3 right-1/4 h-40 w-40 rounded-full opacity-20" style={{ background: "#f7d44a", filter: "blur(60px)" }} />

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
          <h1 className="text-3xl font-black" style={{ color: "#fff" }}>{t("Welcome back")}</h1>
          <p className="mt-2 text-sm font-semibold" style={{ color: "rgba(255,255,255,0.6)" }}>{t("Sign in to your account")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="px-4 py-3 text-sm font-bold" style={{ background: "rgba(232, 93, 117, 0.2)", border: "2px solid rgba(232, 93, 117, 0.4)", color: "#f7a8b8" }}>
              {error}
            </div>
          )}

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
            {loading ? t("Signing in...") : t("Sign in")}
          </button>
        </form>

        <p className="mt-6 text-center text-sm font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>
          {t("Don't have an account?")}{" "}
          <a href="/signup" className="font-black transition-colors" style={{ color: "rgba(255,255,255,0.8)" }} onMouseEnter={(e) => e.currentTarget.style.color = "#fff"} onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.8)"}>
            {t("Sign up")}
          </a>
        </p>
        <div className="mt-4 px-4 py-3 text-xs font-bold text-center" style={{ background: "rgba(247, 212, 74, 0.15)", border: "1px solid rgba(247, 212, 74, 0.3)", color: "#f7d44a", borderRadius: 8 }}>
          {t("Demo: jane@acme.com / password123")}
        </div>
      </div>
    </div>
  )
}
