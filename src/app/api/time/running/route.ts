import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireTeam } from "@/lib/team"
import { auth } from "@/lib/auth"

export async function GET() {
  try {
    const session = await auth()
    const { team } = await requireTeam()
    const userId = session?.user?.id ?? ""

    const running = await prisma.timeEntry.findFirst({
      where: { userId, teamId: team.id, endTime: null },
      include: {
        user: { select: { id: true, name: true } },
        task: { select: { id: true, title: true, columnId: true } },
      },
      orderBy: { startTime: "desc" },
    })

    return NextResponse.json(running)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
