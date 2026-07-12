import Razorpay from "razorpay"

function createRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID
  if (!keyId) return null
  return new Razorpay({
    key_id: keyId,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  })
}

export const razorpay: Razorpay | null = createRazorpay()
export const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? process.env.RAZORPAY_KEY_ID ?? ""

export const PLANS = {
  free: {
    name: "Free",
    description: "For small teams getting started",
    price: 0,
    priceInr: 0,
    planId: null as string | null,
    features: [
      "Up to 3 projects",
      "Up to 5 team members",
      "Kanban board",
      "Basic collaboration",
    ],
    boardLimit: 3,
    memberLimit: 5,
  },
  pro: {
    name: "Pro",
    description: "For growing teams",
    price: 29,
    priceInr: 2499,
    planId: process.env.RAZORPAY_PRO_PLAN_ID || null,
    features: [
      "Unlimited projects",
      "Up to 20 team members",
      "Kanban board",
      "Comments & mentions",
      "File uploads",
      "Priority support",
    ],
    boardLimit: Infinity,
    memberLimit: 20,
  },
  business: {
    name: "Business",
    description: "For organizations",
    price: 99,
    priceInr: 7999,
    planId: process.env.RAZORPAY_BUSINESS_PLAN_ID || null,
    features: [
      "Everything in Pro",
      "Unlimited team members",
      "Advanced permissions",
      "Audit logs",
      "API access",
      "Dedicated support",
    ],
    boardLimit: Infinity,
    memberLimit: Infinity,
  },
} as const

export type PlanKey = keyof typeof PLANS
