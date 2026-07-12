import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const membership = await prisma.teamMember.findFirst({
      where: { userId: session.user.id },
      select: { teamId: true },
    })

    if (!membership) return NextResponse.json({ count: 0 })

    const count = await prisma.activity.count({
      where: {
        teamId: membership.teamId,
        read: false,
        userId: { not: session.user.id },
      },
    })

    return NextResponse.json({ count })
  } catch {
    return NextResponse.json({ count: 0 })
  }
}
