"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useLanguage } from "@/contexts/language"

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min
}

function Confetti() {
  useEffect(() => {
    const canvas = document.getElementById("confetti") as HTMLCanvasElement
    if (!canvas) return
    const ctx = canvas.getContext("2d")!

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const particles = Array.from({ length: 150 }, () => ({
      x: Math.random() * canvas.width,
      y: -20,
      w: randomBetween(6, 14),
      h: randomBetween(4, 10),
      color: ["#f7d44a", "#e85d75", "#4ecdc4", "#1a1a1a", "#ff6b6b", "#ffd93d"][Math.floor(Math.random() * 6)],
      speed: randomBetween(2, 6),
      rotation: Math.random() * 360,
      rotSpeed: randomBetween(-3, 3),
      swing: randomBetween(-1, 1),
    }))

    let frame = 0
    function animate() {
      frame++
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const p of particles) {
        p.y += p.speed
        p.x += Math.sin(frame * 0.02 + p.swing) * 0.8
        p.rotation += p.rotSpeed
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rotation * Math.PI) / 180)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
      }
      if (frame < 300) requestAnimationFrame(animate)
    }
    animate()
  }, [])

  return <canvas id="confetti" className="fixed inset-0 pointer-events-none z-50" />
}

export default function UpgradeSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const plan = searchParams.get("plan") ?? "pro"
  const planName = plan === "business" ? "Business" : "Pro"
  const [show, setShow] = useState(false)
  const { t } = useLanguage()

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center overflow-hidden" style={{ background: "var(--nb-bg)" }}>
      <Confetti />
      <div
        className={`text-center transition-all duration-700 ease-out ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
      >
        <div
          className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full text-5xl animate-bounce"
          style={{ background: "#4ecdc4", border: "4px solid #1a1a1a", boxShadow: "6px 6px 0 #1a1a1a" }}
        >
          ✅
        </div>

        <h1 className="text-4xl font-black mb-2" style={{ color: "var(--nb-text)" }}>
          {t("You have successfully upgraded!")}
        </h1>
        <p className="text-lg font-bold mb-1" style={{ color: "var(--nb-text)" }}>
          {t("Welcome to {plan} Plan", { plan: planName })}
        </p>
        <p className="text-sm font-bold mb-8" style={{ color: "var(--nb-text-soft)" }}>
          {t("Your team now has access to all {plan} features. Time to build!", { plan: planName })}
        </p>

        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => router.push("/settings")}
            className="px-8 py-3 text-sm font-black transition-all hover:-translate-y-0.5 active:translate-y-0"
            style={{
              background: "var(--nb-yellow)",
              border: "3px solid var(--nb-border)",
              boxShadow: "5px 5px 0 var(--nb-shadow)",
              color: "var(--nb-on-accent)",
            }}
          >
            {t("Go to Settings")}
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-8 py-3 text-sm font-black transition-all hover:-translate-y-0.5 active:translate-y-0"
            style={{
              background: "var(--nb-border)",
              border: "3px solid var(--nb-border)",
              boxShadow: "5px 5px 0 var(--nb-shadow)",
              color: "white",
            }}
          >
            {t("Go to Dashboard")}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        .animate-bounce { animation: bounce 1s ease-in-out infinite; }
      `}</style>
    </div>
  )
}
