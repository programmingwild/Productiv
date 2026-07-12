import { NextResponse } from "next/server"
import { razorpay, PLANS } from "@/lib/razorpay"
import { requireTeam } from "@/lib/team"

export async function POST(req: Request) {
  const { team } = await requireTeam()
  const { plan } = await req.json()

  const planConfig = PLANS[plan as keyof typeof PLANS]
  if (!planConfig || plan === "free") {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 })
  }

  const origin = req.headers.get("origin") ?? "http://localhost:3001"

  if (!razorpay) {
    return NextResponse.json({ url: `${origin}/settings?upgrade=${plan}` })
  }

  try {
    const amount = planConfig.priceInr * 100

    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `rcpt_${team.id.slice(0, 8)}_${Date.now() % 100000}`,
      notes: { teamId: team.id, plan },
    })

    return NextResponse.json({
      orderId: order.id,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount,
      name: planConfig.name,
      description: planConfig.description,
      plan,
    })
  } catch (error) {
    console.error("Razorpay error:", error)
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 })
  }
}
