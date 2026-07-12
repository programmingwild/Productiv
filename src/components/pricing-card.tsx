"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/contexts/language"

interface PlanConfig {
  readonly name: string
  readonly description: string
  readonly price: number
  readonly priceInr: number
  readonly planId: string | null
  readonly features: readonly string[]
  readonly boardLimit: number
  readonly memberLimit: number
}

interface Props {
  planKey: string
  plan: PlanConfig
  isCurrent: boolean
  isAuthenticated: boolean
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void }
  }
}

export function PricingCard({ planKey, plan, isCurrent, isAuthenticated }: Props) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  async function handleUpgrade() {
    setError("")
    if (!isAuthenticated) {
      router.push("/login")
      return
    }

    if (planKey === "free") return

    setLoading(true)
    try {
      const res = await fetch("/api/razorpay/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey }),
      })
      const data = await res.json()

      if (data.error) {
        setError(data.error)
        setLoading(false)
        return
      }

      if (data.url) {
        window.location.href = data.url
        return
      }

      const script = document.createElement("script")
      script.src = "https://checkout.razorpay.com/v1/checkout.js"
      script.onload = () => {
        try {
          const rzp = new window.Razorpay({
            key: data.keyId,
            order_id: data.orderId,
            name: t("Productiv"),
            description: `${data.name} - ${data.description}`,
            prefill: { contact: "", email: "" },
            handler(response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) {
              fetch("/api/razorpay/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...response, plan: data.plan }),
              }).then((r) => r.json()).then((v) => {
                if (v.verified) router.push(`/upgrade-success?plan=${data.plan}`)
              })
            },
            modal: { ondismiss() { setLoading(false) } },
          })
          rzp.open()
        } catch (e) {
          console.error("Razorpay init error:", e)
          setError(t("Failed to open payment modal"))
          setLoading(false)
        }
      }
      script.onerror = () => {
        console.error("Failed to load Razorpay script")
        setError(t("Failed to load payment gateway. Check your internet connection."))
        setLoading(false)
      }
      document.body.appendChild(script)
    } catch (error) {
      console.error(error)
      setError(t("Something went wrong. Please try again."))
      setLoading(false)
    }
  }

  const isFree = planKey === "free"
  const cardBg = isCurrent ? "var(--nb-yellow)" : "var(--nb-surface)"
  const cardText = isCurrent ? "var(--nb-on-accent)" : "var(--nb-text)"
  const cardTextSoft = isCurrent ? "#444" : "var(--nb-text-soft)"

  return (
    <div
      className="p-6 transition-all"
      style={{
        background: cardBg,
        border: "3px solid var(--nb-border)",
        boxShadow: isCurrent ? "8px 8px 0 var(--nb-shadow)" : "6px 6px 0 var(--nb-shadow)",
      }}
    >
      {isCurrent && (
        <span
          className="mb-3 inline-block px-3 py-1 text-xs font-black uppercase tracking-wider"
          style={{ background: "var(--nb-border)", color: "white" }}
        >
          {t("Current Plan")}
        </span>
      )}

      <h2 className="text-xl font-black" style={{ color: cardText }}>{plan.name}</h2>
      <p className="mt-1 text-xs font-bold" style={{ color: cardTextSoft }}>{plan.description}</p>

      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-4xl font-black" style={{ color: cardText }}>
          {isFree ? t("Free") : `₹${plan.priceInr}`}
        </span>
        {!isFree && <span className="text-xs font-bold" style={{ color: cardTextSoft }}>{t("/month")}</span>}
      </div>

      {error && (
        <div className="mt-4 p-2 text-xs font-bold text-center" style={{ background: "var(--nb-coral)", border: "2px solid var(--nb-border)", color: "var(--nb-on-accent)" }}>
          {error}
        </div>
      )}

      <ul className="mt-6 space-y-3">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm font-bold" style={{ color: cardText }}>
            <div
              className="mt-0.5 flex h-5 w-5 items-center justify-center shrink-0 text-xs font-black"
              style={{ background: "var(--nb-mint)", border: "2px solid var(--nb-border)", color: "var(--nb-on-accent)" }}
            >
              ✓
            </div>
            {feature}
          </li>
        ))}
      </ul>

      <button
        onClick={handleUpgrade}
        disabled={loading || (isCurrent && !isFree)}
        className={`mt-6 w-full px-4 py-3 text-sm font-black transition-all ${
          isFree ? "" : isCurrent ? "" : ""
        }`}
        style={{
          background: isFree ? "var(--nb-mint)" : isCurrent ? "var(--nb-border)" : "var(--nb-yellow)",
          color: isFree || !isCurrent ? "var(--nb-on-accent)" : "white",
          border: "3px solid var(--nb-border)",
          boxShadow: "4px 4px 0 var(--nb-shadow)",
          cursor: isCurrent && !isFree ? "not-allowed" : "pointer",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading
          ? t("Opening...")
          : isFree
          ? t("Get Started")
          : isCurrent
          ? t("Your Plan")
          : t("Upgrade")}
      </button>
    </div>
  )
}
