import { NextResponse } from "next/server"
import { requireTeam } from "@/lib/team"

export async function GET() {
  try {
    const { team } = await requireTeam()
    return NextResponse.json({
      id: team.id,
      name: team.name,
      slug: team.slug,
      planTier: team.planTier,
      subscriptionStatus: team.subscriptionStatus,
      razorpayCustomerId: team.razorpayCustomerId,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
