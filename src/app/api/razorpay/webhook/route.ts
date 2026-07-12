import { NextResponse } from "next/server"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: "Not configured" }, { status: 500 })

  const body = await req.text()
  const signature = req.headers.get("x-razorpay-signature") ?? ""

  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex")

  if (expectedSig !== signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  const event = JSON.parse(body)
  const { event: eventType, payload } = event

  try {
    switch (eventType) {
      case "subscription.charged": {
        const sub = payload.subscription?.entity
        const teamId = sub?.notes?.teamId
        const plan = sub?.notes?.plan
        if (teamId && plan) {
          await prisma.team.update({
            where: { id: teamId },
            data: {
              planTier: plan.toUpperCase(),
              subscriptionStatus: "ACTIVE",
              razorpaySubscriptionId: sub.id,
            },
          })
        }
        break
      }
      case "subscription.cancelled": {
        const sub2 = payload.subscription?.entity
        const teamId2 = sub2?.notes?.teamId
        if (teamId2) {
          await prisma.team.update({
            where: { id: teamId2 },
            data: { subscriptionStatus: "CANCELED" },
          })
        }
        break
      }
    }
  } catch (error) {
    console.error("Webhook error:", error)
  }

  return NextResponse.json({ received: true })
}
