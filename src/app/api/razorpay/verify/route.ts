import { NextResponse } from "next/server"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, plan } = await req.json()

    const secret = process.env.RAZORPAY_KEY_SECRET
    if (!secret) {
      return NextResponse.json({ error: "Razorpay not configured" }, { status: 500 })
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`
    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex")

    if (expectedSig !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    if (plan && ["pro", "business"].includes(plan)) {
      const session = await import("@/lib/auth").then((m) => m.auth())
      if (session?.user?.id) {
        const membership = await prisma.teamMember.findFirst({
          where: { userId: session.user.id },
        })
        if (membership) {
          await prisma.team.update({
            where: { id: membership.teamId },
            data: {
              planTier: plan.toUpperCase(),
              subscriptionStatus: "ACTIVE",
              razorpaySubscriptionId: razorpay_order_id,
            },
          })
        }
      }
    }

    return NextResponse.json({ verified: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
