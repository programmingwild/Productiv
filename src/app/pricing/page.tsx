"use client"

import { useState, useEffect } from "react"
import { useLanguage } from "@/contexts/language"
import { PLANS } from "@/lib/razorpay"
import { PricingCard } from "@/components/pricing-card"
import { BackButton } from "@/components/back-button"

export default function PricingPage() {
  const { t } = useLanguage()
  const [currentPlan, setCurrentPlan] = useState("free")
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/teams/current")
        if (res.ok) {
          const data = await res.json()
          setCurrentPlan(data.planTier?.toLowerCase() ?? "free")
          setAuthenticated(true)
        }
      } catch {}
    }
    load()
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6">
      <div className="mb-8 text-center relative">
        <BackButton />
        <h1 className="text-3xl font-bold text-gray-900">{t("Pricing")}</h1>
        <p className="mt-2 text-gray-600">{t("Choose the plan that fits your team")}</p>
      </div>

      <div className="grid w-full max-w-4xl gap-6 md:grid-cols-3">
        {(Object.entries(PLANS) as [string, typeof PLANS[keyof typeof PLANS]][]).map(
          ([key, plan]) => (
            <PricingCard
              key={key}
              planKey={key}
              plan={plan}
              isCurrent={currentPlan === key}
              isAuthenticated={authenticated}
            />
          )
        )}
      </div>
    </div>
  )
}
